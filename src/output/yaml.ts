import type { Candidate, ScopeDocument } from '../models/evidence.js'

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

export function toYaml(doc: ScopeDocument): string {
  const lines: string[] = [
    'version: 1',
    'change:',
    `  name: ${y(doc.change.name)}`,
    `  path: ${y(doc.change.path)}`,
  ]

  if (doc.concepts.length === 0) {
    lines.push('concepts: []')
  } else {
    lines.push('concepts:')
    for (const c of doc.concepts) {
      lines.push(`  - text: ${y(c.text)}`)
    }
  }

  if (doc.candidates.length === 0) {
    lines.push('candidates: []')
  } else {
    lines.push('candidates:')
    for (const c of doc.candidates) {
      lines.push(`  - path: ${y(c.path)}`)
      lines.push(`    confidence: ${c.confidence}`)
      lines.push(...dumpReasons(c, '    '))
    }
  }

  if (doc.tests.length === 0) {
    lines.push('tests: []')
  } else {
    lines.push('tests:')
    for (const t of doc.tests) {
      lines.push(`  - path: ${y(t.path)}`)
      if (t.related_to) {
        lines.push(`    related_to: ${y(t.related_to)}`)
      }
    }
  }

  return lines.join('\n') + '\n'
}
