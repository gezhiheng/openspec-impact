export type ReasonType = 'path_match' | 'content_match' | 'symbol_match'
export type Confidence = 'high' | 'medium' | 'low'
export type TermRole = 'strong' | 'domain' | 'path-only'

export type Reason = {
  type: ReasonType
  term: string
}

export type Concept = {
  text: string
}

export type HarvestedConcept = Concept & {
  search_terms: string[]
  role: TermRole
  kind?: 'path' | 'symbol' | 'api' | 'perm'
}

export type Candidate = {
  path: string
  confidence: Confidence
  reasons: Reason[]
}

export type TestEntry = {
  path: string
  related_to?: string
}

export type ScopeDocument = {
  version: 1
  change: { name: string; path: string }
  concepts: Concept[]
  candidates: Candidate[]
  tests: TestEntry[]
}

export type HistoryEntry = {
  path: string
  via: string
  commits: number
  reason: 'co_change'
}

export type HistoryDocument = {
  version: 1
  change: { name: string; path: string }
  seeds: string[]
  history: HistoryEntry[]
}

export class LocateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocateError'
  }
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}
