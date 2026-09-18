import { findProjectRoot } from '../openspec/parser.js'
import type { HistoryDocument } from '../models/evidence.js'
import { historyFromScope } from './history.js'
import { runScope, type ScopeOptions } from './scope.js'

export function runEvidence(opts: ScopeOptions): HistoryDocument {
  const scope = runScope(opts)
  const projectRoot = findProjectRoot(opts.cwd)
  return projectRoot
    ? historyFromScope(scope, projectRoot)
    : { version: 1, change: scope.change, seeds: [], history: [] }
}
