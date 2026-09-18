import type { Concept, HarvestedConcept, TermRole } from '../models/evidence.js'
import type { ChangeDocument } from '../openspec/parser.js'

export const NEVER_SEARCH = new Set([
  'should',
  'must',
  'shall',
  'may',
  'system',
  'user',
  'when',
  'then',
  'given',
  'and',
  'the',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'by',
  'from',
  'this',
  'that',
  'support',
  'display',
  'add',
  'added',
  'change',
  'changes',
  'requirement',
  'scenario',
  'purpose',
  'why',
  'what',
  'id',
  'env',
  'alter',
  'explain',
  'ifnull',
  'count',
])

export const SQL_NOISE = new Set(['ifnull', 'date_format', 'alter', 'explain', 'count(*)', 'count'])

/** ponytail: cap stops large-spec harvest from becoming an O(files×terms) search. Raise if citation-only still misses seeds. */
export const SEARCH_TERM_CAP = 80

export type CitationKind = 'path' | 'symbol' | 'api' | 'perm'

const HTTP_API_RE = /^(GET|POST|PUT|PATCH|DELETE)\s+\//i
const FILE_EXT_RE = /\.(vue|tsx|ts|jsx|js|java|xml|rs|go)$/i
const FOO_API_RE = /^[A-Z][A-Za-z0-9]*Api\.[A-Za-z][A-Za-z0-9]*$/
const PERM_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/
const REPO_BRACKET_RE = /\[([a-z][a-z0-9-]*)\]/g
const PATH_IN_PROSE_RE = /(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/g
const OOS_HEADING = /^(out of scope|不在范围|明确不修|本期不修)$/i
const OOS_PHRASE = /out of scope|不在范围|明确不修|本期不修/i

type Bucket = { text: string; terms: string[]; role: TermRole; kind: CitationKind }

function unique(xs: string[]): string[] {
  return [...new Set(xs.filter(Boolean))]
}

function isNever(word: string): boolean {
  return NEVER_SEARCH.has(word.toLowerCase())
}

function isOpenspecPath(token: string): boolean {
  const t = token.replaceAll('\\', '/')
  return t === 'openspec' || t.startsWith('openspec/')
}

function isNumericOrPunct(token: string): boolean {
  return !/[A-Za-z\u4e00-\u9fff]/.test(token)
}

function citationRejected(token: string): boolean {
  if (token.includes('=')) {
    return true
  }
  if (SQL_NOISE.has(token.toLowerCase())) {
    return true
  }
  if (isNumericOrPunct(token)) {
    return true
  }
  if (isOpenspecPath(token)) {
    return true
  }
  if (!/[A-Za-z]/.test(token)) {
    return true
  }
  const stripped = token.replace(/^\.+/, '')
  return isNever(token) || isNever(stripped)
}

export function isFileCitation(text: string): boolean {
  return Boolean(text) && !/[\s/]/.test(text) && FILE_EXT_RE.test(text)
}

export function isTypeCitation(text: string): boolean {
  if (!text || /[\s/]/.test(text) || isFileCitation(text)) {
    return false
  }
  if (SQL_NOISE.has(text.toLowerCase()) || NEVER_SEARCH.has(text.toLowerCase())) {
    return false
  }
  const m = /^([A-Z][A-Za-z0-9]*)(?:\.([A-Za-z][A-Za-z0-9]*))?$/.exec(text)
  return Boolean(m?.[1] && /[a-z]/.test(m[1]))
}

export function typeCitationHead(text: string): string | undefined {
  if (!isTypeCitation(text)) {
    return undefined
  }
  const i = text.indexOf('.')
  return i > 0 ? text.slice(0, i) : text
}

function isPathCitation(text: string): boolean {
  if (!text || /\s/.test(text)) {
    return false
  }
  const t = text.replaceAll('\\', '/')
  if (isOpenspecPath(t)) {
    return false
  }
  if (FILE_EXT_RE.test(t)) {
    return true
  }
  return t.includes('/') && /[A-Za-z]/.test(t)
}

export function classifyCitation(text: string): CitationKind | undefined {
  const t = text.trim()
  if (!t || citationRejected(t)) {
    return undefined
  }
  if (HTTP_API_RE.test(t) || FOO_API_RE.test(t)) {
    return 'api'
  }
  if (isPathCitation(t)) {
    return 'path'
  }
  if (PERM_RE.test(t)) {
    return 'perm'
  }
  if (isTypeCitation(t)) {
    return 'symbol'
  }
  return undefined
}

function add(map: Map<string, Bucket>, text: string, kind: CitationKind): void {
  const key = text.toLowerCase()
  const existing = map.get(key)
  if (!existing) {
    map.set(key, { text, terms: [text], role: 'strong', kind })
    return
  }
  existing.terms = unique([...existing.terms, text])
}

function prefixPath(text: string, repo: string | undefined): string {
  if (!repo || !text.includes('/')) {
    return text
  }
  const t = text.replaceAll('\\', '/')
  return t.split('/')[0] === repo ? t : `${repo}/${t.replace(/^\.?\//, '')}`
}

const LIST_LABEL_RE = /^\s*[-*]\s+(?:`([^`]+)`|\*\*([^*]+)\*\*)\s*:/

function harvestMarked(md: string, map: Map<string, Bucket>, repo?: string): void {
  for (const line of md.split(/\r?\n/)) {
    harvestLine(line, map, repo)
  }
}

function harvestLine(line: string, map: Map<string, Bucket>, repo?: string): void {
  const label = LIST_LABEL_RE.exec(line)
  const skipUntil = label ? (label.index ?? 0) + label[0].length : 0
  const take = (raw: string, index: number): void => {
    if (label && index < skipUntil) {
      return
    }
    const kind = classifyCitation(raw)
    if (!kind) {
      return
    }
    const text = kind === 'path' ? prefixPath(raw.trim(), repo) : raw.trim()
    add(map, text, kind)
  }
  for (const m of line.matchAll(/`([^`]+)`/g)) {
    take(m[1], m.index ?? 0)
  }
  for (const m of line.matchAll(/\*\*([^*]+)\*\*/g)) {
    take(m[1], m.index ?? 0)
  }
  for (const m of line.matchAll(PATH_IN_PROSE_RE)) {
    take(m[0], m.index ?? 0)
  }
}

function harvestTasks(md: string, map: Map<string, Bucket>): void {
  for (const line of md.split(/\r?\n/)) {
    const repos = [...line.matchAll(REPO_BRACKET_RE)].map((m) => m[1])
    harvestMarked(line, map, repos.at(-1))
  }
}

function isProposal(relativePath: string): boolean {
  return relativePath === 'proposal.md' || relativePath.endsWith('/proposal.md')
}

function isTasks(relativePath: string): boolean {
  return relativePath === 'tasks.md' || relativePath.endsWith('/tasks.md')
}

function dropOosBullets(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !(/^\s*[-*]\s+/.test(line) && OOS_PHRASE.test(line)))
    .join('\n')
}

function inScopeProposal(md: string): string {
  const parts: string[] = []
  let heading = ''
  let body: string[] = []
  const flush = (): void => {
    if (heading && OOS_HEADING.test(heading)) {
      return
    }
    const text = body.join('\n')
    const kept = /^(What Changes|Impact)$/i.test(heading) ? dropOosBullets(text) : text
    if (heading) {
      parts.push(`## ${heading}\n${kept}`)
    } else {
      parts.push(kept)
    }
  }
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) {
      flush()
      heading = m[2].trim()
      body = []
    } else {
      body.push(line)
    }
  }
  flush()
  return parts.join('\n')
}

export function harvestConcepts(documents: ChangeDocument[]): HarvestedConcept[] {
  const map = new Map<string, Bucket>()
  for (const doc of documents) {
    const content = isProposal(doc.relativePath) ? inScopeProposal(doc.content) : doc.content
    if (isTasks(doc.relativePath)) {
      harvestTasks(content, map)
    } else {
      harvestMarked(content, map)
    }
  }
  return [...map.values()].map((b) => ({
    text: b.text,
    search_terms: b.terms,
    role: b.role,
    kind: b.kind,
  }))
}

export function publicConcepts(harvested: HarvestedConcept[]): Concept[] {
  return harvested.map(({ text }) => ({ text }))
}

export function isSearchableCitation(text: string): boolean {
  if (HTTP_API_RE.test(text)) {
    return true
  }
  if (/\s/.test(text)) {
    return false
  }
  return /[A-Za-z]/.test(text)
}

function byText(a: HarvestedConcept, b: HarvestedConcept): number {
  return a.text.localeCompare(b.text)
}

function withTypeHeads(concepts: HarvestedConcept[]): HarvestedConcept[] {
  return concepts.map((c) => {
    const head = typeCitationHead(c.text)
    if (!head || c.search_terms.includes(head)) {
      return c
    }
    return { ...c, search_terms: unique([...c.search_terms, head]) }
  })
}

function kindOf(c: HarvestedConcept): CitationKind | undefined {
  return c.kind ?? classifyCitation(c.text)
}

export function toSearchConcepts(harvested: HarvestedConcept[]): HarvestedConcept[] {
  const all = harvested.filter((c) => c.search_terms.length > 0 && isSearchableCitation(c.text))
  const files = all.filter((c) => kindOf(c) === 'path').sort(byText)
  const types = all
    .filter((c) => {
      const k = kindOf(c)
      return k === 'symbol' || (k === 'api' && !/\s/.test(c.text))
    })
    .sort(byText)
  const seen = new Set([...files, ...types])
  const rest = all
    .filter((c) => !seen.has(c))
    .sort((a, b) => b.text.length - a.text.length || byText(a, b))
  return withTypeHeads([...files, ...types, ...rest].slice(0, SEARCH_TERM_CAP))
}

export function conceptRoleForTerm(concept: HarvestedConcept, _term: string): TermRole {
  return concept.role
}
