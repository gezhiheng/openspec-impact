import { join, sep } from 'node:path'
import type { Candidate, HistoryDocument, HistoryEntry, ScopeDocument } from '../models/evidence.js'
import { findProjectRoot } from '../openspec/parser.js'
import { namedMatchLength, isNamedCandidate } from '../search/repository.js'
import { isFileCitation, isTypeCitation, typeCitationHead } from '../search/terms.js'
import { coChangeNeighbors, enclosingGit } from '../search/git.js'
import { runScope } from './scope.js'

const SEEDS_PER_ROOT = 5
const HISTORY_CAP = 50

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

export function historyFromScope(doc: ScopeDocument, projectRoot: string): HistoryDocument {
  const seeds = selectSeeds(doc.candidates, projectRoot)
  const history: HistoryEntry[] = []
  for (const via of seeds) {
    const abs = join(projectRoot, via.split('/').join(sep))
    const loc = enclosingGit(abs)
    if (!loc) {
      continue
    }
    history.push(...coChangeNeighbors(loc, projectRoot, via))
  }
  history.sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
  return {
    version: 1,
    change: doc.change,
    seeds,
    history: history.slice(0, HISTORY_CAP),
  }
}

export function runHistory(opts: { cwd: string; change: string }): HistoryDocument {
  const doc = runScope({ cwd: opts.cwd, change: opts.change, includeLow: false, search: true })
  const projectRoot = findProjectRoot(opts.cwd)
  if (!projectRoot) {
    return { version: 1, change: doc.change, seeds: [], history: [] }
  }
  return historyFromScope(doc, projectRoot)
}
