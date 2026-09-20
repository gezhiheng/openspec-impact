import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgv } from '../src/cli.js'
import { runScope } from '../src/commands/scope.js'
import { LocateError, type HarvestedConcept } from '../src/models/evidence.js'
import { toYaml } from '../src/output/yaml.js'
import {
  SEARCH_EXCLUDES,
  WIDE_CONTENT_HITS,
  limitCandidates,
  limitLow,
  rgGlobs,
  searchConcepts,
  sortCandidates,
} from '../src/search/repository.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const fixture = join(repoRoot, 'tests/fixtures/mini-repo')
const cli = join(repoRoot, 'dist/src/cli.js')

function byPath(doc: ReturnType<typeof runScope>, path: string) {
  return doc.candidates.find((c) => c.path === path)
}

describe('argv', () => {
  it('requires impact for the pipeline and keeps layer commands', () => {
    assert.equal(parseArgv([]).ok, false)
    assert.equal(parseArgv(['nope']).ok, false)
    assert.equal(parseArgv(['add-renewal-status']).ok, false)
    const pipeline = parseArgv(['impact', 'nope'])
    assert.equal(pipeline.ok, true)
    if (pipeline.ok) {
      assert.equal(pipeline.command, 'impact')
      assert.equal(pipeline.change, 'nope')
    }
    assert.equal(parseArgv(['impact']).ok, false)
    assert.equal(parseArgv(['scope']).ok, false)
    const ok = parseArgv(['scope', '--include-low', 'add-renewal-status'])
    assert.equal(ok.ok, true)
    if (ok.ok) {
      assert.equal(ok.command, 'scope')
      assert.equal(ok.includeLow, true)
      assert.equal(ok.search, true)
      assert.equal(ok.change, 'add-renewal-status')
    }
    const noSearch = parseArgv(['scope', '--no-search', 'add-renewal-status'])
    assert.equal(noSearch.ok, true)
    if (noSearch.ok) {
      assert.equal(noSearch.search, false)
    }
    assert.equal(parseArgv(['--no-search', 'add-renewal-status']).ok, false)
    const flagThenChange = parseArgv(['--no-search', 'impact', 'add-renewal-status'])
    assert.equal(flagThenChange.ok, true)
    if (flagThenChange.ok) {
      assert.equal(flagThenChange.command, 'impact')
      assert.equal(flagThenChange.search, false)
      assert.equal(flagThenChange.change, 'add-renewal-status')
    }
    const withSearch = parseArgv(['scope', '--search', 'add-renewal-status'])
    assert.equal(withSearch.ok, false)
  })
})

describe('osi scope against fixture', () => {
  it('locates by id and by path', () => {
    const a = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const b = runScope({
      cwd: fixture,
      change: 'openspec/changes/add-renewal-status',
      includeLow: false,
    })
    assert.equal(a.change.name, 'add-renewal-status')
    assert.equal(a.change.path, 'openspec/changes/add-renewal-status')
    assert.equal(b.change.path, a.change.path)
  })

  it('walks up from a subdirectory', () => {
    const doc = runScope({
      cwd: join(fixture, 'src/pages/tenant'),
      change: 'add-renewal-status',
      includeLow: false,
    })
    assert.ok(byPath(doc, 'src/pages/tenant/TenantList.tsx'))
  })

  it('fails for missing and archived ids', () => {
    assert.throws(
      () => runScope({ cwd: fixture, change: 'does-not-exist', includeLow: false }),
      LocateError,
    )
    assert.throws(
      () => runScope({ cwd: fixture, change: 'old-thing', includeLow: false }),
      LocateError,
    )
  })

  it('ranks TenantList high and does not bag-match TenantFilter', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const list = byPath(doc, 'src/pages/tenant/TenantList.tsx')
    const filter = byPath(doc, 'src/pages/tenant/TenantFilter.tsx')
    assert.equal(list?.confidence, 'high')
    assert.ok(list?.reasons.some((r) => r.type === 'symbol_match' && r.term === 'TenantList'))
    assert.equal(filter, undefined)
  })

  it('omits low by default and includes it with --include-low', () => {
    const def = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const all = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: true })
    assert.equal(
      def.candidates.some((c) => c.confidence === 'low'),
      false,
    )
    assert.ok(!all.candidates.some((c) => c.path === 'src/extra/notes.txt'))
  })

  it('caps low at 20', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      path: `f${String(i).padStart(2, '0')}.ts`,
      confidence: 'low' as const,
      reasons: [{ type: 'content_match' as const, term: 'tenant' }],
    }))
    assert.equal(limitLow(many, true, 20).length, 20)
    assert.equal(limitLow(many, false, 20).length, 0)
  })

  it('splits tests and sets related_to', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    assert.equal(
      doc.candidates.some((c) => c.path.includes('.test.')),
      false,
    )
    const test = doc.tests.find((t) => t.path === 'src/pages/tenant/TenantList.test.tsx')
    assert.ok(test)
    assert.equal(test.related_to, 'src/pages/tenant/TenantList.tsx')
  })

  it('does not emit openspec markdown as candidates', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: true })
    assert.equal(
      doc.candidates.some((c) => c.path.startsWith('openspec/')),
      false,
    )
    assert.equal(
      doc.tests.some((t) => t.path.startsWith('openspec/')),
      false,
    )
  })

  it('default YAML concepts are citations only', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    assert.ok(doc.concepts.some((c) => c.text === 'TenantList'))
    assert.equal(
      doc.concepts.some((c) => c.text.toLowerCase() === 'renewal status'),
      false,
    )
  })

  it('sorts named files ahead of table-name hits and caps per repo', () => {
    const sorted = sortCandidates([
      {
        path: 'qft-all/FooMapper.xml',
        confidence: 'high' as const,
        reasons: [{ type: 'symbol_match' as const, term: 'qft_tenants_check_out' }],
      },
      {
        path: 'qft-app/src/CheckoutStatistics.vue',
        confidence: 'high' as const,
        reasons: [{ type: 'path_match' as const, term: 'CheckoutStatistics.vue' }],
      },
    ])
    assert.equal(sorted[0].path, 'qft-app/src/CheckoutStatistics.vue')
    const many = [
      ...Array.from({ length: 20 }, (_, i) => ({
        path: `qft-all/src/f${String(i).padStart(2, '0')}.java`,
        confidence: 'high' as const,
        reasons: [{ type: 'symbol_match' as const, term: 'FooBar' }],
      })),
      {
        path: 'qft-app/src/Bar.vue',
        confidence: 'high' as const,
        reasons: [{ type: 'path_match' as const, term: 'Bar.vue' }],
      },
    ]
    const limited = limitCandidates(sortCandidates(many), false)
    assert.equal(limited.filter((c) => c.path.startsWith('qft-all/')).length, 15)
    assert.ok(limited.some((c) => c.path.startsWith('qft-app/')))
  })

  it('prints version 1 YAML with the required keys', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const yaml = toYaml(doc)
    assert.match(yaml, /^version: 1$/m)
    assert.match(yaml, /^change:$/m)
    assert.match(yaml, /^concepts:$/m)
    assert.match(yaml, /^candidates:$/m)
    assert.match(yaml, /^tests:$/m)
    assert.equal(yaml.includes('search_terms'), false)
    assert.ok(!yaml.trimStart().startsWith('{'))
  })

  it('exits 0 with empty candidates when nothing ranks', () => {
    const doc = runScope({ cwd: fixture, change: 'empty-change', includeLow: false })
    assert.deepEqual(doc.candidates, [])
    assert.match(toYaml(doc), /^candidates: \[\]$/m)
  })

  it('runs when the bin is named osi (npm symlink)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-'))
    const bin = join(dir, 'osi')
    symlinkSync(cli, bin)
    const r = spawnSync(process.execPath, [bin, 'scope', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^concepts:$/m)
  })

  it('osi scope --no-search prints typed concepts only', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', '--no-search', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^concepts:$/m)
    assert.match(r.stdout, /TenantList/)
    assert.equal(r.stdout.includes('renewal status'), false)
    assert.match(r.stdout, /^candidates: \[\]$/m)
    assert.match(r.stdout, /^tests: \[\]$/m)
  })

  it('osi scope CLI from the fixture directory', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /path: "src\/pages\/tenant\/TenantList.tsx"/)
    assert.match(r.stdout, /confidence: high/)
    assert.equal(/path: "src\/pages\/tenant\/TenantFilter.tsx"/.test(r.stdout), false)
    assert.match(r.stdout, /path: "src\/pages\/tenant\/TenantList.test.tsx"/)
    assert.match(r.stdout, /related_to: "src\/pages\/tenant\/TenantList.tsx"/)
    assert.equal(r.stdout.includes('openspec/changes'), true) // change.path
    assert.equal(/path: "openspec\/changes\/add-renewal-status\/proposal.md"/.test(r.stdout), false)
  })

  it('osi scope --search is an unknown flag', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', '--search', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /Unknown flag/)
    assert.equal(r.stdout.includes('version:'), false)
  })

  it('missing change prints stderr and no YAML', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', 'does-not-exist'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /not found/)
    assert.equal(r.stdout.includes('version:'), false)
  })
})

function cited(text: string): HarvestedConcept {
  return { text, search_terms: [text], role: 'strong', kind: 'symbol' }
}

describe('repository search', () => {
  it('rg globs exclude listed dirs at any depth', () => {
    const g = rgGlobs()
    for (const dir of SEARCH_EXCLUDES) {
      assert.ok(g.includes(`!**/${dir}/**`), dir)
    }
  })

  it('does not emit nested node_modules as candidates', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-nm-'))
    cpSync(fixture, dir, { recursive: true })
    mkdirSync(join(dir, 'pkg/node_modules/left-pad'), { recursive: true })
    writeFileSync(join(dir, 'pkg/node_modules/left-pad/index.js'), 'export const TenantList = 1\n')
    const doc = runScope({ cwd: dir, change: 'add-renewal-status', includeLow: true })
    assert.equal(
      doc.candidates.some((c) => c.path.includes('node_modules')),
      false,
    )
    assert.equal(
      doc.tests.some((t) => t.path.includes('node_modules')),
      false,
    )
  })

  it('does not attribute a rare term to a file that only matched another', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-attr-'))
    mkdirSync(join(dir, 'src/unrelated'), { recursive: true })
    mkdirSync(join(dir, 'src/pages'), { recursive: true })
    writeFileSync(join(dir, 'src/unrelated/Grid.ts'), 'export const VTable = 1\n')
    writeFileSync(
      join(dir, 'src/pages/TenantList.tsx'),
      'export function TenantList() { return 1 }\n',
    )
    const hits = searchConcepts(dir, [cited('TenantList'), cited('VTable')])
    const grid = hits.find((h) => h.path === 'src/unrelated/Grid.ts')
    assert.ok(grid)
    assert.equal(
      grid.reasons.some((r) => r.term === 'TenantList'),
      false,
    )
  })

  it('wide content terms keep path_match only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-wide-'))
    mkdirSync(join(dir, 'src/components/table'), { recursive: true })
    writeFileSync(join(dir, 'src/components/table/VTable.vue'), '<template>VTable</template>\n')
    for (let i = 0; i < WIDE_CONTENT_HITS + 1; i++) {
      writeFileSync(
        join(dir, `src/f${String(i).padStart(2, '0')}.ts`),
        'import { VTable } from "ui"\n',
      )
    }
    const hits = searchConcepts(dir, [cited('VTable')])
    const vue = hits.find((h) => h.path === 'src/components/table/VTable.vue')
    assert.ok(vue?.reasons.some((r) => r.type === 'path_match' && r.term === 'VTable'))
    assert.equal(
      hits.some((h) => /^src\/f\d+\.ts$/.test(h.path)),
      false,
    )
  })
})
