import type {
  Candidate,
  EvidenceDocument,
  HistoryDocument,
  RefItem,
  ScopeDocument,
  TestEntry,
} from '../models/evidence.js'

function y(value: string): string {
  return JSON.stringify(value)
}

function dumpReasons(candidate: Candidate, pad: string): string[] {
  const lines = [`${pad}reasons:`]
  for (const r of candidate.reasons) {
    lines.push(`${pad}  - type: ${r.type}`)
    lines.push(`${pad}    term: ${y(r.term)}`)
  }
  return lines
}

function dumpScopeFields(
  doc: { concepts: ScopeDocument['concepts']; candidates: Candidate[]; tests: TestEntry[] },
  pad: string,
): string[] {
  const lines: string[] = []
  if (doc.concepts.length === 0) {
    lines.push(`${pad}concepts: []`)
  } else {
    lines.push(`${pad}concepts:`)
    for (const c of doc.concepts) {
      lines.push(`${pad}  - text: ${y(c.text)}`)
    }
  }

  if (doc.candidates.length === 0) {
    lines.push(`${pad}candidates: []`)
  } else {
    lines.push(`${pad}candidates:`)
    for (const c of doc.candidates) {
      lines.push(`${pad}  - path: ${y(c.path)}`)
      lines.push(`${pad}    confidence: ${c.confidence}`)
      lines.push(...dumpReasons(c, `${pad}    `))
    }
  }

  if (doc.tests.length === 0) {
    lines.push(`${pad}tests: []`)
  } else {
    lines.push(`${pad}tests:`)
    for (const t of doc.tests) {
      lines.push(`${pad}  - path: ${y(t.path)}`)
      if (t.related_to) {
        lines.push(`${pad}    related_to: ${y(t.related_to)}`)
      }
    }
  }
  return lines
}

function dumpSeeds(seeds: string[], pad: string): string[] {
  if (seeds.length === 0) {
    return [`${pad}seeds: []`]
  }
  const lines = [`${pad}seeds:`]
  for (const s of seeds) {
    lines.push(`${pad}  - ${y(s)}`)
  }
  return lines
}

function dumpHistoryRows(history: HistoryDocument['history'], pad: string): string[] {
  if (history.length === 0) {
    return [`${pad}history: []`]
  }
  const lines = [`${pad}history:`]
  for (const h of history) {
    lines.push(`${pad}  - path: ${y(h.path)}`)
    lines.push(`${pad}    via: ${y(h.via)}`)
    lines.push(`${pad}    commits: ${h.commits}`)
    lines.push(`${pad}    reason: ${h.reason}`)
  }
  return lines
}

function dumpRefs(refs: RefItem[], pad: string): string[] {
  if (refs.length === 0) {
    return [`${pad}refs: []`]
  }
  const lines = [`${pad}refs:`]
  for (const r of refs) {
    lines.push(`${pad}  - path: ${y(r.path)}`)
    lines.push(`${pad}    term: ${y(r.term)}`)
    lines.push(`${pad}    others: ${r.others}`)
    lines.push(`${pad}    wide: ${r.wide}`)
    if (r.sample.length === 0) {
      lines.push(`${pad}    sample: []`)
    } else {
      lines.push(`${pad}    sample:`)
      for (const s of r.sample) {
        lines.push(`${pad}      - ${y(s)}`)
      }
    }
  }
  return lines
}

function dumpHistoryFields(
  doc: { seeds: string[]; history: HistoryDocument['history'] },
  pad: string,
): string[] {
  return [...dumpSeeds(doc.seeds, pad), ...dumpHistoryRows(doc.history, pad)]
}

function changeHeader(change: { name: string; path: string }): string[] {
  return ['version: 1', 'change:', `  name: ${y(change.name)}`, `  path: ${y(change.path)}`]
}

export function toYaml(doc: ScopeDocument): string {
  return [...changeHeader(doc.change), ...dumpScopeFields(doc, ''), ''].join('\n')
}

export function toHistoryYaml(doc: HistoryDocument): string {
  return [...changeHeader(doc.change), ...dumpHistoryFields(doc, ''), ''].join('\n')
}

export function toEvidenceYaml(doc: EvidenceDocument): string {
  return [
    ...changeHeader(doc.change),
    ...dumpSeeds(doc.seeds, ''),
    ...dumpRefs(doc.refs, ''),
    ...dumpHistoryRows(doc.history, ''),
    '',
  ].join('\n')
}
