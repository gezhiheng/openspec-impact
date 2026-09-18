import type { Candidate, HistoryDocument, ScopeDocument, TestEntry } from '../models/evidence.js'

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

function dumpHistoryFields(
  doc: { seeds: string[]; history: HistoryDocument['history'] },
  pad: string,
): string[] {
  const lines: string[] = []
  if (doc.seeds.length === 0) {
    lines.push(`${pad}seeds: []`)
  } else {
    lines.push(`${pad}seeds:`)
    for (const s of doc.seeds) {
      lines.push(`${pad}  - ${y(s)}`)
    }
  }

  if (doc.history.length === 0) {
    lines.push(`${pad}history: []`)
  } else {
    lines.push(`${pad}history:`)
    for (const h of doc.history) {
      lines.push(`${pad}  - path: ${y(h.path)}`)
      lines.push(`${pad}    via: ${y(h.via)}`)
      lines.push(`${pad}    commits: ${h.commits}`)
      lines.push(`${pad}    reason: ${h.reason}`)
    }
  }
  return lines
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
