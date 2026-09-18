import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import type {
  Confidence,
  HarvestedConcept,
  Reason,
  ReasonType,
  TermRole,
} from '../models/evidence.js'
import { conceptRoleForTerm } from './terms.js'

export const SEARCH_EXCLUDES = [
  'openspec',
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'vendor',
  '.ai',
  '.agents',
  'agent-skills',
  'agent-instructions',
  'knowledge',
  'requirements',
  'docs',
  'target',
  '.idea',
  '.vscode',
]

/** ponytail: skip HTML/minified blobs that dominate workspace search time; raise if templates must be candidates. */
export const MAX_FILE_BYTES = 512 * 1024
export const CANDIDATE_CAP = 120
/** ponytail: drop content/symbol for terms that hit more than this many files; raise via a delta if a real identifier must stay a content candidate. */
export const WIDE_CONTENT_HITS = 80
/** ponytail: keeps one nested repo from filling the global cap; raise if a change is truly single-repo. */
export const PER_REPO_CAP = 15

function posixRel(from: string, to: string): string {
  return relative(from, to).split(sep).join('/')
}

function excluded(rel: string): boolean {
  return rel.split('/').some((p) => SEARCH_EXCLUDES.includes(p))
}

function walkFiles(root: string, dir: string, out: string[]): void {
  if (!existsSync(dir)) {
    return
  }
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SEARCH_EXCLUDES.includes(ent.name)) {
      continue
    }
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) {
      walkFiles(root, abs, out)
    } else if (ent.isFile()) {
      out.push(posixRel(root, abs))
    }
  }
}

function posixFromRg(line: string): string {
  const p = line.split(sep).join('/')
  return p.startsWith('./') ? p.slice(2) : p
}

function skipExt(rel: string): boolean {
  const lower = rel.toLowerCase()
  return (
    lower.endsWith('.html')
    || lower.endsWith('.htm')
    || lower.endsWith('.min.js')
    || lower.endsWith('.min.css')
    || lower.endsWith('.class')
    || lower.endsWith('.jar')
  )
}

export function rgGlobs(): string[] {
  const args = ['--hidden', '--no-ignore-vcs']
  for (const dir of SEARCH_EXCLUDES) {
    args.push('--glob', `!**/${dir}/**`)
  }
  args.push(
    '--glob',
    '!*.html',
    '--glob',
    '!*.htm',
    '--glob',
    '!*.min.js',
    '--glob',
    '!*.min.css',
    '--glob',
    '!*.class',
    '--glob',
    '!*.jar',
    '--max-filesize',
    '512K',
  )
  return args
}

function rgAvailable(): boolean {
  const r = spawnSync('rg', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return r.status === 0
}

function listWithRg(root: string): string[] | undefined {
  if (!rgAvailable()) {
    return undefined
  }
  const r = spawnSync('rg', ['--files', ...rgGlobs(), '.'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0 && r.status !== 1) {
    return undefined
  }
  return r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(posixFromRg)
    .filter((p) => !excluded(p) && !skipExt(p))
}

export function listSourceFiles(root: string): string[] {
  return listWithRg(root) ?? collectWalk(root)
}

function collectWalk(root: string): string[] {
  const out: string[] = []
  walkFiles(root, root, out)
  return out.filter((p) => {
    if (excluded(p) || skipExt(p)) {
      return false
    }
    try {
      return statSync(join(root, p.split('/').join(sep))).size <= MAX_FILE_BYTES
    } catch {
      return false
    }
  })
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compileTerm(term: string): { decl: RegExp; word: RegExp } {
  const id = escapeRegExp(term)
  return {
    decl: new RegExp(String.raw`\b(?:function|class|type|const|interface|let|var|enum)\s+${id}\b`),
    word: new RegExp(String.raw`\b${id}\b`),
  }
}

export function pathMatches(relPath: string, term: string): boolean {
  return relPath.toLowerCase().includes(term.toLowerCase())
}

export function symbolMatches(content: string, term: string): boolean {
  const rx = compileTerm(term)
  return rx.decl.test(content) || rx.word.test(content)
}

export function contentMatches(content: string, term: string): boolean {
  return content.includes(term)
}

export type FileHit = {
  path: string
  reasons: Reason[]
  roles: TermRole[]
}

export function searchConcepts(root: string, concepts: HarvestedConcept[]): FileHit[] {
  const files = listSourceFiles(root)
  const hits = new Map<string, FileHit>()

  const add = (posix: string, type: ReasonType, term: string, role: TermRole): void => {
    let hit = hits.get(posix)
    if (!hit) {
      hit = { path: posix, reasons: [], roles: [] }
      hits.set(posix, hit)
    }
    if (!hit.reasons.some((r) => r.type === type && r.term === term)) {
      hit.reasons.push({ type, term })
      hit.roles.push(role)
    }
  }

  const contentTerms: string[] = []
  const termRole = new Map<string, TermRole>()
  for (const concept of concepts) {
    for (const term of concept.search_terms) {
      if (!term) {
        continue
      }
      const role = conceptRoleForTerm(concept, term)
      if (!termRole.has(term) || role === 'strong') {
        termRole.set(term, role)
      }
      const pathOnly = role === 'path-only'
      if (!pathOnly && !contentTerms.includes(term)) {
        contentTerms.push(term)
      }
    }
  }

  for (const rel of files) {
    const posix = rel.split(sep).join('/')
    for (const [term, role] of termRole) {
      if (pathMatches(posix, term)) {
        add(posix, 'path_match', term, role)
      }
    }
  }

  const compiled = new Map(contentTerms.map((t) => [t, compileTerm(t)]))
  const lines = rgContentLines(root, contentTerms)
  if (lines) {
    for (const hit of lines) {
      attributeLine(hit.path, hit.line, contentTerms, termRole, compiled, add)
    }
  } else if (contentTerms.length > 0) {
    for (const rel of files) {
      const posix = rel.split(sep).join('/')
      const abs = join(root, posix.split('/').join(sep))
      let text = ''
      try {
        if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size <= MAX_FILE_BYTES) {
          text = readFileSync(abs, 'utf8')
        }
      } catch {
        text = ''
      }
      if (!text) {
        continue
      }
      attributeLine(posix, text, contentTerms, termRole, compiled, add)
    }
  }

  dropWideContent(hits)
  return [...hits.values()]
}

function attributeLine(
  posix: string,
  line: string,
  contentTerms: string[],
  termRole: Map<string, TermRole>,
  compiled: Map<string, { decl: RegExp; word: RegExp }>,
  add: (posix: string, type: ReasonType, term: string, role: TermRole) => void,
): void {
  for (const term of contentTerms) {
    if (!line.includes(term)) {
      continue
    }
    const role = termRole.get(term) ?? 'domain'
    const rx = compiled.get(term)
    if (rx && (rx.decl.test(line) || rx.word.test(line))) {
      add(posix, 'symbol_match', term, role)
    } else {
      add(posix, 'content_match', term, role)
    }
  }
}

type RgLine = { path: string; line: string }

function rgContentLines(root: string, terms: string[]): RgLine[] | undefined {
  if (terms.length === 0) {
    return []
  }
  if (!rgAvailable()) {
    return undefined
  }
  const dir = mkdtempSync(join(tmpdir(), 'osi-rg-'))
  const file = join(dir, 'terms.txt')
  writeFileSync(file, `${terms.join('\n')}\n`)
  try {
    const r = spawnSync('rg', ['-F', '-f', file, '--json', ...rgGlobs(), '.'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (r.status !== 0 && r.status !== 1) {
      return undefined
    }
    return parseRgJson(r.stdout)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function parseRgJson(stdout: string): RgLine[] {
  const out: RgLine[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw) {
      continue
    }
    let ev: {
      type?: string
      data?: { path?: { text?: string }; lines?: { text?: string } }
    }
    try {
      ev = JSON.parse(raw) as typeof ev
    } catch {
      continue
    }
    if (ev.type !== 'match') {
      continue
    }
    const path = ev.data?.path?.text
    const line = ev.data?.lines?.text
    if (typeof path !== 'string' || typeof line !== 'string') {
      continue
    }
    const posix = posixFromRg(path)
    if (excluded(posix) || skipExt(posix)) {
      continue
    }
    out.push({ path: posix, line })
  }
  return out
}

function dropWideContent(hits: Map<string, FileHit>): void {
  const filesByTerm = new Map<string, Set<string>>()
  for (const hit of hits.values()) {
    for (const r of hit.reasons) {
      if (r.type !== 'content_match' && r.type !== 'symbol_match') {
        continue
      }
      let files = filesByTerm.get(r.term)
      if (!files) {
        files = new Set()
        filesByTerm.set(r.term, files)
      }
      files.add(hit.path)
    }
  }
  const wide = new Set<string>()
  for (const [term, files] of filesByTerm) {
    if (files.size > WIDE_CONTENT_HITS) {
      wide.add(term)
    }
  }
  if (wide.size === 0) {
    return
  }
  for (const [path, hit] of hits) {
    const reasons: Reason[] = []
    const roles: TermRole[] = []
    for (let i = 0; i < hit.reasons.length; i++) {
      const r = hit.reasons[i]
      if ((r.type === 'content_match' || r.type === 'symbol_match') && wide.has(r.term)) {
        continue
      }
      reasons.push(r)
      roles.push(hit.roles[i] ?? 'domain')
    }
    if (reasons.length === 0) {
      hits.delete(path)
      continue
    }
    hit.reasons = reasons
    hit.roles = roles
  }
}

const CONF_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 }

export function confidenceFor(reasons: Reason[], roles: TermRole[]): Confidence {
  let best: Confidence = 'low'
  for (let i = 0; i < reasons.length; i++) {
    const r = reasons[i]
    const role = roles[i] ?? 'domain'
    let got: Confidence = 'low'
    if (role === 'strong' && (r.type === 'path_match' || r.type === 'symbol_match')) {
      got = 'high'
    } else if (role === 'domain' && (r.type === 'path_match' || r.type === 'symbol_match')) {
      got = 'medium'
    } else if (role === 'path-only' && r.type === 'path_match') {
      got = 'medium'
    } else {
      got = 'low'
    }
    if (CONF_RANK[got] < CONF_RANK[best]) {
      best = got
    }
  }
  return best
}

export function sortCandidates<
  T extends { path: string; confidence: Confidence; reasons?: Reason[] },
>(xs: T[]): T[] {
  return [...xs].sort((a, b) => {
    const seed = seedRank(a) - seedRank(b)
    if (seed !== 0) {
      return seed
    }
    const src = srcRank(a.path) - srcRank(b.path)
    if (src !== 0) {
      return src
    }
    return a.path.localeCompare(b.path)
  })
}

function stemOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

function isNamedTerm(term: string, path: string): boolean {
  const base = path.split('/').at(-1) ?? ''
  const stem = stemOf(base)
  const tbase = term.split('/').at(-1) ?? term
  const tstem = stemOf(tbase)
  if (base === tbase || stem === tstem || stem === term) {
    return true
  }
  return term.includes('/') && path.endsWith(term)
}

export function namedMatchLength(path: string, reasons: Reason[]): number {
  let max = 0
  for (const r of reasons) {
    if ((r.type === 'path_match' || r.type === 'symbol_match') && isNamedTerm(r.term, path)) {
      max = Math.max(max, r.term.length)
    }
  }
  return max
}

export function isNamedCandidate(path: string, reasons: Reason[]): boolean {
  return namedMatchLength(path, reasons) > 0
}

function isCodeIdentifier(term: string): boolean {
  if (term.includes('/') || /\.(vue|tsx|ts|jsx|js|java)$/i.test(term)) {
    return true
  }
  if (term.includes('_') && term === term.toLowerCase()) {
    return false
  }
  return /[A-Z]/.test(term)
}

function seedRank(c: { path: string; confidence: Confidence; reasons?: Reason[] }): number {
  const reasons = c.reasons ?? []
  if (isNamedCandidate(c.path, reasons)) {
    return 0
  }
  if (reasons.some((r) => r.type === 'symbol_match' && isCodeIdentifier(r.term))) {
    return 1
  }
  if (c.confidence === 'high') {
    return 2
  }
  if (c.confidence === 'medium') {
    return 3
  }
  return 4
}

function repoKey(path: string): string {
  return path.split('/')[0] ?? path
}

export function limitCandidates<T extends { path: string; confidence: Confidence }>(
  xs: T[],
  includeLow: boolean,
  restCap = CANDIDATE_CAP,
  lowCap = 20,
  perRepo = PER_REPO_CAP,
): T[] {
  const core: T[] = []
  const counts = new Map<string, number>()
  for (const x of xs) {
    if (x.confidence === 'low') {
      continue
    }
    const repo = repoKey(x.path)
    const n = counts.get(repo) ?? 0
    if (n >= perRepo || core.length >= restCap) {
      continue
    }
    counts.set(repo, n + 1)
    core.push(x)
  }
  return [...core, ...limitLow(xs, includeLow, lowCap).filter((x) => x.confidence === 'low')]
}

function srcRank(path: string): number {
  return path.includes('/src/') || path.startsWith('src/') ? 0 : 1
}

export function limitLow<T extends { confidence: Confidence }>(
  xs: T[],
  includeLow: boolean,
  cap = 20,
): T[] {
  const kept: T[] = []
  let lows = 0
  for (const x of xs) {
    if (x.confidence !== 'low') {
      kept.push(x)
      continue
    }
    if (!includeLow) {
      continue
    }
    if (lows >= cap) {
      continue
    }
    kept.push(x)
    lows += 1
  }
  return kept
}

export function isTestPath(relPath: string): boolean {
  return (
    /\.test\.[^/]+$/.test(relPath)
    || /\.spec\.[^/]+$/.test(relPath)
    || /(^|\/)__tests__\//.test(relPath)
    || /_test\.[^/]+$/.test(relPath)
  )
}

export function relatedSource(projectRoot: string, testPath: string): string | undefined {
  const parts = testPath.split('/')
  const base = parts.at(-1)
  if (!base) {
    return undefined
  }
  let stripped = base.replace(/\.test(\.[^./]+)$/, '$1')
  stripped = stripped.replace(/\.spec(\.[^./]+)$/, '$1')
  stripped = stripped.replace(/_test(\.[^./]+)$/, '$1')
  if (stripped === base) {
    return undefined
  }
  const src = [...parts.slice(0, -1), stripped].join('/')
  const abs = join(projectRoot, src.split('/').join(sep))
  return existsSync(abs) ? src : undefined
}
