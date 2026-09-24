import { readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import type {
  Candidate,
  EvidenceDocument,
  HistoryDocument,
  HistoryEntry,
  RefItem,
  ScopeDocument,
} from '../models/evidence.js'
import { findProjectRoot } from '../openspec/parser.js'
import {
  namedMatchLength,
  isNamedCandidate,
  isTestPath,
  type FileHit,
} from '../search/repository.js'
import { isFileCitation, isTypeCitation, typeCitationHead } from '../search/terms.js'
import { coChangeNeighbors, enclosingGit } from '../search/git.js'
import { refsFromHits } from './evidence.js'
import { runScopePass } from './scope.js'

const SEEDS_PER_ROOT = 5
const HISTORY_CAP = 50
const SIBLING_CAP = 4
/** ponytail: others>=30 skips git and siblings (album noise was 33). Not WIDE_FILES. Raise via an osi-history delta. */
const NOISY_OTHERS = 30

function isCitedNamed(path: string, reasons: Candidate['reasons']): boolean {
  return reasons.some((r) => {
    if (r.type !== 'path_match' && r.type !== 'symbol_match') {
      return false
    }
    if (namedMatchLength(path, [r]) === 0) {
      return false
    }
    if (isFileCitation(r.term) || isTypeCitation(r.term)) {
      return true
    }
    const head = typeCitationHead(r.term)
    return head !== undefined && namedMatchLength(path, [{ ...r, term: head }]) > 0
  })
}

function gitKey(projectRoot: string, rel: string): string {
  return enclosingGit(join(projectRoot, rel.split('/').join(sep)))?.gitRoot ?? ''
}

export function selectSeeds(candidates: Candidate[], projectRoot: string): string[] {
  const named = candidates.filter(
    (c) => c.confidence === 'high' && isNamedCandidate(c.path, c.reasons),
  )
  const cited = named
    .filter((c) => isCitedNamed(c.path, c.reasons))
    .sort((a, b) => a.path.localeCompare(b.path))
  const rest = named
    .filter((c) => !isCitedNamed(c.path, c.reasons))
    .sort((a, b) => a.path.localeCompare(b.path))
  const seeds: string[] = cited.map((c) => c.path)
  const extra = new Map<string, number>()
  for (const c of rest) {
    const key = gitKey(projectRoot, c.path)
    const n = extra.get(key) ?? 0
    if (n >= SEEDS_PER_ROOT) {
      continue
    }
    extra.set(key, n + 1)
    seeds.push(c.path)
  }
  return seeds
}

function parentOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

function baseOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? path : path.slice(i + 1)
}

function stemOf(base: string): string {
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

function detailRemainder(stem: string): string | undefined {
  const suffix = stem.endsWith('Details') ? 'Details' : stem.endsWith('Detail') ? 'Detail' : ''
  const rest = suffix ? stem.slice(0, -suffix.length) : ''
  return rest.length > 0 ? rest : undefined
}

function siblingNeighbors(projectRoot: string, via: string, sample: string[]): HistoryEntry[] {
  const parent = parentOf(via)
  const absParent = parent ? join(projectRoot, parent.split('/').join(sep)) : projectRoot
  let entries: { name: string; isFile: () => boolean }[]
  try {
    entries = readdirSync(absParent, { withFileTypes: true })
  } catch {
    return []
  }
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => (parent ? `${parent}/${e.name}` : e.name))
    .filter((p) => p !== via && !isTestPath(p) && !p.split('/').includes('openspec'))
    .sort((a, b) => a.localeCompare(b))
  const have = new Set(files)
  const rest = detailRemainder(stemOf(baseOf(via)))
  const stemHits = rest
    ? files.filter((p) => {
        const stem = stemOf(baseOf(p))
        return stem === rest || stem.startsWith(rest)
      })
    : []
  const seen = new Set(stemHits)
  const sampleHits = sample
    .filter((p) => parentOf(p) === parent && have.has(p) && !seen.has(p))
    .sort((a, b) => a.localeCompare(b))
  return [...stemHits, ...sampleHits].slice(0, SIBLING_CAP).map((path) => ({
    path,
    via,
    commits: 0,
    reason: 'sibling' as const,
  }))
}

export function historyFromScope(
  doc: ScopeDocument,
  projectRoot: string,
  refs: RefItem[] = [],
): HistoryDocument {
  const seeds = selectSeeds(doc.candidates, projectRoot)
  const byPath = new Map(refs.map((r) => [r.path, r]))
  const history: HistoryEntry[] = []
  for (const via of seeds) {
    const ref = byPath.get(via)
    if ((ref?.others ?? 0) >= NOISY_OTHERS) {
      continue
    }
    const abs = join(projectRoot, via.split('/').join(sep))
    const loc = enclosingGit(abs)
    if (!loc) {
      continue
    }
    const co = coChangeNeighbors(loc, projectRoot, via)
    history.push(...(co.length > 0 ? co : siblingNeighbors(projectRoot, via, ref?.sample ?? [])))
  }
  history.sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
  return {
    version: 1,
    change: doc.change,
    seeds,
    history: history.slice(0, HISTORY_CAP),
  }
}

export function scopeEvidence(
  doc: ScopeDocument,
  projectRoot: string | undefined,
  hits: FileHit[],
  wide: Map<string, number>,
): EvidenceDocument {
  if (!projectRoot) {
    return { version: 1, change: doc.change, seeds: [], history: [], refs: [] }
  }
  const refs = refsFromHits(selectSeeds(doc.candidates, projectRoot), hits, wide)
  return { ...historyFromScope(doc, projectRoot, refs), refs }
}

export function runHistory(opts: { cwd: string; change: string }): HistoryDocument {
  const { doc, hits, wide } = runScopePass({
    cwd: opts.cwd,
    change: opts.change,
    includeLow: false,
    search: true,
  })
  const full = scopeEvidence(doc, findProjectRoot(opts.cwd), hits, wide)
  return { version: full.version, change: full.change, seeds: full.seeds, history: full.history }
}
