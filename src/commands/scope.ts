import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import {
  LocateError,
  type Candidate,
  type ScopeDocument,
  type TestEntry,
} from '../models/evidence.js'
import { findProjectRoot, readChangeDocuments, resolveChange } from '../openspec/parser.js'
import {
  confidenceFor,
  isTestPath,
  limitCandidates,
  relatedSource,
  searchConcepts,
  sortCandidates,
} from '../search/repository.js'
import { harvestConcepts, publicConcepts, toSearchConcepts } from '../search/terms.js'

export type ScopeOptions = {
  cwd: string
  change: string
  includeLow: boolean
  search?: boolean
}

export function runScope(opts: ScopeOptions): ScopeDocument {
  const projectRoot = findProjectRoot(opts.cwd)
  if (!projectRoot) {
    throw new LocateError('No OpenSpec project found (walked up from cwd looking for openspec/)')
  }
  const located = resolveChange(projectRoot, opts.change)
  const documents = readChangeDocuments(located.changeDir)
  const harvested = harvestConcepts(documents)
  const search = opts.search !== false
  const searchSet = toSearchConcepts(harvested)
  const hits = search ? searchConcepts(projectRoot, searchSet) : []

  const sources: Candidate[] = []
  const tests: TestEntry[] = []
  const testPaths = new Set<string>()

  for (const hit of hits) {
    if (isTestPath(hit.path)) {
      const entry: TestEntry = { path: hit.path }
      const related = relatedSource(projectRoot, hit.path)
      if (related) {
        entry.related_to = related
      }
      tests.push(entry)
      testPaths.add(hit.path)
      continue
    }
    sources.push({
      path: hit.path,
      confidence: confidenceFor(hit.reasons, hit.roles),
      reasons: hit.reasons,
    })
  }

  const ranked = limitCandidates(sortCandidates(sources), opts.includeLow)

  for (const c of ranked) {
    const base = c.path.split('/').at(-1)
    if (!base || !base.includes('.')) {
      continue
    }
    const dot = base.lastIndexOf('.')
    const stem = base.slice(0, dot)
    const ext = base.slice(dot)
    const dir = c.path.slice(0, Math.max(0, c.path.lastIndexOf('/')))
    for (const name of [`${stem}.test${ext}`, `${stem}.spec${ext}`, `${stem}_test${ext}`]) {
      const rel = dir ? `${dir}/${name}` : name
      if (testPaths.has(rel)) {
        continue
      }
      const abs = join(projectRoot, rel.split('/').join(sep))
      if (!existsSync(abs)) {
        continue
      }
      const entry: TestEntry = { path: rel, related_to: c.path }
      tests.push(entry)
      testPaths.add(rel)
    }
  }

  tests.sort((a, b) => a.path.localeCompare(b.path))

  return {
    version: 1,
    change: { name: located.name, path: located.path },
    concepts: publicConcepts(harvested),
    candidates: ranked,
    tests,
  }
}
