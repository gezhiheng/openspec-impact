import { findProjectRoot } from '../openspec/parser.js'
import type { EvidenceDocument, Reason, RefItem } from '../models/evidence.js'
import { historyFromScope } from './history.js'
import { runScopePass, type ScopeOptions } from './scope.js'
import { isNamedTerm, isTestPath, type FileHit } from '../search/repository.js'

/** ponytail: 8 samples is enough for the Skill to cite one path; raise if a report needs more. */
const SAMPLE_CAP = 8

function namedTerm(path: string, reasons: Reason[]): string {
  const base = path.split('/').at(-1) ?? ''
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const terms = reasons
    .filter(
      (r) => (r.type === 'path_match' || r.type === 'symbol_match') && isNamedTerm(r.term, path),
    )
    .map((r) => r.term)
  for (const want of [stem, base]) {
    if (terms.includes(want)) {
      return want
    }
  }
  const local = terms.filter((t) => !t.includes('/'))
  const pool = local.length > 0 ? local : terms
  return pool.reduce((a, b) => (a.length >= b.length ? a : b), '')
}

export function refsFromHits(
  seeds: string[],
  hits: FileHit[],
  wide: Map<string, number>,
): RefItem[] {
  const byPath = new Map(hits.map((h) => [h.path, h]))
  return seeds.map((path) => {
    const term = namedTerm(path, byPath.get(path)?.reasons ?? [])
    const wideCount = term ? wide.get(term) : undefined
    if (wideCount !== undefined) {
      return { path, term, others: wideCount, wide: true, sample: [] }
    }
    const others: string[] = []
    if (term) {
      for (const h of hits) {
        if (h.path === path || isTestPath(h.path)) {
          continue
        }
        if (
          h.reasons.some(
            (r) => (r.type === 'content_match' || r.type === 'symbol_match') && r.term === term,
          )
        ) {
          others.push(h.path)
        }
      }
      others.sort()
    }
    return { path, term, others: others.length, wide: false, sample: others.slice(0, SAMPLE_CAP) }
  })
}

export function runEvidence(opts: ScopeOptions): EvidenceDocument {
  const { doc, hits, wide } = runScopePass(opts)
  const projectRoot = findProjectRoot(opts.cwd)
  const hist = projectRoot
    ? historyFromScope(doc, projectRoot)
    : { version: 1 as const, change: doc.change, seeds: [], history: [] }
  return { ...hist, refs: refsFromHits(hist.seeds, hits, wide) }
}
