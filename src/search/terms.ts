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

export const PATH_ONLY = new Set([
  'filter',
  'export',
  'search',
  'create',
  'update',
  'renew',
  'list',
  'detail',
  'page',
  'status',
  'form',
  'view',
  'modal',
  'dialog',
  'table',
  'button',
  'sync',
  'report',
  'checkout',
  'variable',
])

export const SQL_NOISE = new Set(['ifnull', 'date_format', 'alter', 'explain', 'count(*)', 'count'])

/** ponytail: cap stops large-spec harvest from becoming an O(files×terms) search. Raise if citation-only still misses seeds. */
export const SEARCH_TERM_CAP = 80

const TOKEN_RE = /[A-Za-z][A-Za-z0-9]*|[\u4e00-\u9fff]+/g

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? []
}

function cap(word: string): string {
  return word.slice(0, 1).toUpperCase() + word.slice(1)
}

export function camelCase(words: string[]): string {
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w.toLowerCase()))).join('')
}

export function pascalCase(words: string[]): string {
  return words.map((w) => cap(w.toLowerCase())).join('')
}

export function expandPhrase(words: string[]): string[] {
  const lower = words.map((w) => w.toLowerCase())
  return unique([camelCase(lower), pascalCase(lower), lower.join('_'), lower.join('-')])
}

export function expandUnigram(word: string): string[] {
  return unique([word, cap(word)])
}

function unique(xs: string[]): string[] {
  return [...new Set(xs.filter(Boolean))]
}

function isNever(word: string): boolean {
  return NEVER_SEARCH.has(word.toLowerCase())
}

function isPathOnly(word: string): boolean {
  return PATH_ONLY.has(word.toLowerCase())
}

type Bucket = { text: string; terms: string[]; role: TermRole }

function add(map: Map<string, Bucket>, text: string, terms: string[], role: TermRole): void {
  const key = text.toLowerCase()
  const existing = map.get(key)
  if (!existing) {
    map.set(key, { text, terms: unique(terms), role })
    return
  }
  existing.terms = unique([...existing.terms, ...terms])
  if (role === 'strong') {
    existing.role = 'strong'
  } else if (role === 'domain' && existing.role === 'path-only') {
    existing.role = 'domain'
  }
}

function phrasesFromTokens(tokens: string[], map: Map<string, Bucket>): void {
  const kept: string[] = []
  const flush = (): void => {
    if (kept.length >= 2) {
      for (let n = Math.min(3, kept.length); n >= 2; n--) {
        for (let i = 0; i + n <= kept.length; i++) {
          const slice = kept.slice(i, i + n)
          add(map, slice.join(' '), expandPhrase(slice), 'strong')
        }
      }
    }
    for (const w of kept) {
      if (isNever(w) || SQL_NOISE.has(w.toLowerCase())) {
        continue
      }
      if (isPathOnly(w)) {
        add(map, w.toLowerCase(), expandUnigram(w.toLowerCase()), 'path-only')
      } else {
        add(map, w.toLowerCase(), expandUnigram(w), 'domain')
      }
    }
    kept.length = 0
  }
  for (const raw of tokens) {
    if (isNever(raw) || SQL_NOISE.has(raw.toLowerCase()) || isCjkToken(raw)) {
      flush()
    } else {
      kept.push(raw)
    }
  }
  flush()
}

function markdownSection(md: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'im')
  const match = re.exec(md)
  if (!match || match.index === undefined) {
    return ''
  }
  const start = match.index + match[0].length
  const rest = md.slice(start)
  const next = rest.search(/^##\s+/m)
  return next < 0 ? rest : rest.slice(0, next)
}

function isCjkToken(word: string): boolean {
  return /^[\u4e00-\u9fff]+$/.test(word)
}

function stripMarks(md: string): string {
  return md.replace(/`[^`]*`/g, ' ').replace(/\*\*[^*]*\*\*/g, ' ')
}

function isNumericOrPunct(token: string): boolean {
  return !/[A-Za-z\u4e00-\u9fff]/.test(token)
}

function isOpenspecPath(token: string): boolean {
  const t = token.replaceAll('\\', '/')
  return t === 'openspec' || t.startsWith('openspec/')
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

function addCitation(map: Map<string, Bucket>, token: string): void {
  const t = token.trim()
  if (!t || citationRejected(t)) {
    return
  }
  add(map, t, [t], 'strong')
}

function headingLines(md: string): string[] {
  const lines: string[] = []
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (!m) {
      continue
    }
    lines.push(m[2].replace(/^Requirement:\s*/i, ''))
  }
  return lines
}

function harvestMarked(md: string, map: Map<string, Bucket>): void {
  for (const m of md.matchAll(/`([^`]+)`/g)) {
    addCitation(map, m[1])
  }
  for (const m of md.matchAll(/\*\*([^*]+)\*\*/g)) {
    addCitation(map, m[1])
  }
  for (const m of md.matchAll(/(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/g)) {
    addCitation(map, m[0])
  }
}

function addUnigram(map: Map<string, Bucket>, word: string): void {
  if (isNever(word)) {
    return
  }
  if (isPathOnly(word)) {
    add(map, word.toLowerCase(), expandUnigram(word.toLowerCase()), 'path-only')
    return
  }
  add(map, word.toLowerCase(), expandUnigram(word), 'domain')
}

function kebabPieces(name: string, map: Map<string, Bucket>): void {
  for (const piece of name.split('-').filter(Boolean)) {
    addUnigram(map, piece)
  }
}

export function harvestConcepts(
  changeName: string,
  specDirs: string[],
  documents: ChangeDocument[],
): HarvestedConcept[] {
  const map = new Map<string, Bucket>()
  kebabPieces(changeName, map)
  for (const dir of specDirs) {
    kebabPieces(dir, map)
  }

  for (const doc of documents) {
    harvestMarked(doc.content, map)
    for (const heading of headingLines(doc.content)) {
      phrasesFromTokens(tokenize(stripMarks(heading)), map)
    }
    if (doc.relativePath === 'proposal.md' || doc.relativePath.endsWith('/proposal.md')) {
      phrasesFromTokens(tokenize(stripMarks(markdownSection(doc.content, 'What Changes'))), map)
      phrasesFromTokens(tokenize(stripMarks(markdownSection(doc.content, 'Impact'))), map)
    }
  }

  return [...map.values()]
    .filter((b) => b.terms.length > 0)
    .map((b) => ({ text: b.text, search_terms: b.terms, role: b.role }))
}

export function publicConcepts(harvested: HarvestedConcept[]): Concept[] {
  return harvested.filter((c) => !isCjkToken(c.text)).map(({ text }) => ({ text }))
}

export function citationConcepts(harvested: HarvestedConcept[]): Concept[] {
  return harvested
    .filter((c) => c.role === 'strong' && isSearchableCitation(c.text))
    .map(({ text }) => ({ text }))
}

export function isSearchableCitation(text: string): boolean {
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(text)) {
    return true
  }
  if (/\s/.test(text)) {
    return false
  }
  return /[A-Za-z]/.test(text)
}

export function kebabWordsFrom(changeName: string, specDirs: string[]): string[] {
  return [changeName, ...specDirs].flatMap((s) => s.split('-').filter(Boolean))
}

export function toSearchConcepts(
  harvested: HarvestedConcept[],
  kebabWords: string[],
): HarvestedConcept[] {
  const citations = harvested
    .filter((c) => c.role === 'strong' && isSearchableCitation(c.text))
    .sort((a, b) => b.text.length - a.text.length || a.text.localeCompare(b.text))
    .slice(0, SEARCH_TERM_CAP)

  const seen = new Set(citations.map((c) => c.text.toLowerCase()))
  const pathish: HarvestedConcept[] = []
  const kebab = new Set(kebabWords.map((w) => w.toLowerCase()).filter((w) => !isNever(w)))

  for (const c of harvested) {
    const key = c.text.toLowerCase()
    if (seen.has(key) || c.text.includes(' ')) {
      continue
    }
    if (kebab.has(key) && !isPathOnly(key)) {
      pathish.push({ text: c.text, search_terms: c.search_terms, role: 'path-only' })
      seen.add(key)
    }
  }
  return [...citations, ...pathish]
}

export function isPathOnlyTerm(term: string): boolean {
  return isPathOnly(term)
}

export function conceptRoleForTerm(concept: HarvestedConcept, term: string): TermRole {
  if (concept.role === 'strong') {
    return 'strong'
  }
  if (PATH_ONLY.has(term.toLowerCase())) {
    return 'path-only'
  }
  return concept.role
}
