import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgv } from '../src/cli.js'
import { runScope } from '../src/commands/scope.js'
import { LocateError } from '../src/models/evidence.js'
import { toYaml } from '../src/output/yaml.js'
import { limitLow } from '../src/search/repository.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const fixture = join(repoRoot, 'tests/fixtures/mini-repo')
const cli = join(repoRoot, 'dist/src/cli.js')

function byPath(doc: ReturnType<typeof runScope>, path: string) {
  return doc.candidates.find((c) => c.path === path)
}

describe('argv', () => {
  it('requires scope and a change', () => {
    assert.equal(parseArgv([]).ok, false)
    assert.equal(parseArgv(['nope']).ok, false)
    assert.equal(parseArgv(['scope']).ok, false)
    const ok = parseArgv(['scope', '--include-low', 'add-renewal-status'])
    assert.equal(ok.ok, true)
    if (ok.ok) {
      assert.equal(ok.includeLow, true)
      assert.equal(ok.search, false)
      assert.equal(ok.change, 'add-renewal-status')
    }
    const withSearch = parseArgv(['scope', '--search', 'add-renewal-status'])
    assert.equal(withSearch.ok, true)
    if (withSearch.ok) {
      assert.equal(withSearch.search, true)
    }
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

  it('ranks TenantList high and TenantFilter medium', () => {
    const doc = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const list = byPath(doc, 'src/pages/tenant/TenantList.tsx')
    const filter = byPath(doc, 'src/pages/tenant/TenantFilter.tsx')
    assert.equal(list?.confidence, 'high')
    assert.ok(list?.reasons.some((r) => r.type === 'symbol_match' && r.term === 'TenantList'))
    assert.equal(filter?.confidence, 'medium')
  })

  it('omits low by default and includes it with --include-low', () => {
    const def = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: false })
    const all = runScope({ cwd: fixture, change: 'add-renewal-status', includeLow: true })
    assert.equal(
      def.candidates.some((c) => c.confidence === 'low'),
      false,
    )
    assert.ok(
      all.candidates.some((c) => c.path === 'src/extra/notes.txt' && c.confidence === 'low'),
    )
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

  it('osi scope without --search prints concepts only', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^concepts:$/m)
    assert.match(r.stdout, /TenantList/)
    assert.match(r.stdout, /^candidates: \[\]$/m)
  })

  it('osi scope CLI from the fixture directory', () => {
    const r = spawnSync(process.execPath, [cli, 'scope', '--search', 'add-renewal-status'], {
      cwd: fixture,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /path: "src\/pages\/tenant\/TenantList.tsx"/)
    assert.match(r.stdout, /confidence: high/)
    assert.match(r.stdout, /path: "src\/pages\/tenant\/TenantFilter.tsx"/)
    assert.match(r.stdout, /confidence: medium/)
    assert.match(r.stdout, /path: "src\/pages\/tenant\/TenantList.test.tsx"/)
    assert.match(r.stdout, /related_to: "src\/pages\/tenant\/TenantList.tsx"/)
    assert.equal(r.stdout.includes('openspec/changes'), true) // change.path
    assert.equal(/path: "openspec\/changes\/add-renewal-status\/proposal.md"/.test(r.stdout), false)
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
