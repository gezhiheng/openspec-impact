import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runEvidence, refsFromHits } from '../src/commands/evidence.js'
import { LocateError } from '../src/models/evidence.js'
import { toEvidenceYaml } from '../src/output/yaml.js'
import { harvestConcepts, toSearchConcepts } from '../src/search/terms.js'
import { readChangeDocuments } from '../src/openspec/parser.js'
import type { FileHit } from '../src/search/repository.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const mini = join(repoRoot, 'tests/fixtures/mini-repo')
const cli = join(repoRoot, 'dist/src/cli.js')
const DATE = '2026-03-01T12:00:00'

function git(cwd: string, args: string[]) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t.t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t.t',
      GIT_AUTHOR_DATE: DATE,
      GIT_COMMITTER_DATE: DATE,
    },
  })
}

function gitInit(dir: string): void {
  mkdirSync(dir, { recursive: true })
  const r = git(dir, ['init'])
  assert.equal(r.status, 0, String(r.stderr))
  git(dir, ['config', 'user.email', 't@t.t'])
  git(dir, ['config', 'user.name', 't'])
}

function commitAll(dir: string, msg: string): void {
  const add = git(dir, ['add', '-A'])
  assert.equal(add.status, 0, String(add.stderr))
  const c = git(dir, ['commit', '-m', msg])
  assert.equal(c.status, 0, String(c.stderr))
}

function copyMini(): string {
  const dir = mkdtempSync(join(tmpdir(), 'osi-ev-'))
  cpSync(mini, dir, { recursive: true })
  return dir
}

describe('osi evidence pipeline', () => {
  it('prints history YAML for a change id and fails locate without YAML', () => {
    const yaml = toEvidenceYaml(
      runEvidence({ cwd: mini, change: 'add-renewal-status', includeLow: false }),
    )
    assert.match(yaml, /^version: 1$/m)
    assert.match(yaml, /^change:$/m)
    assert.match(yaml, /^seeds:/m)
    assert.match(yaml, /^refs:/m)
    assert.match(yaml, /^history:/m)
    assert.match(yaml, /name: "add-renewal-status"/)
    assert.equal(/^scope:$/m.test(yaml), false)
    assert.equal(/^candidates:$/m.test(yaml), false)
    assert.equal(/^concepts:$/m.test(yaml), false)
    assert.equal(/^tests:$/m.test(yaml), false)

    const r = spawnSync(process.execPath, [cli, 'impact', 'add-renewal-status'], {
      cwd: mini,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^seeds:/m)
    assert.match(r.stdout, /^refs:/m)
    assert.match(r.stdout, /^history:/m)
    assert.equal(/^scope:$/m.test(r.stdout), false)
    assert.equal(/^candidates:$/m.test(r.stdout), false)

    const bare = spawnSync(process.execPath, [cli, 'add-renewal-status'], {
      cwd: mini,
      encoding: 'utf8',
    })
    assert.notEqual(bare.status, 0)
    assert.equal(bare.stdout.includes('version:'), false)
    assert.equal(bare.stdout.includes('seeds:'), false)

    assert.throws(
      () => runEvidence({ cwd: mini, change: 'does-not-exist', includeLow: false }),
      LocateError,
    )
    const miss = spawnSync(process.execPath, [cli, 'impact', 'does-not-exist'], {
      cwd: mini,
      encoding: 'utf8',
    })
    assert.notEqual(miss.status, 0)
    assert.match(miss.stderr, /not found/)
    assert.equal(miss.stdout.includes('version:'), false)
  })

  it('osi --no-search empties seeds and history', () => {
    const r = spawnSync(process.execPath, [cli, '--no-search', 'impact', 'add-renewal-status'], {
      cwd: mini,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^seeds: \[\]$/m)
    assert.match(r.stdout, /^refs: \[\]$/m)
    assert.match(r.stdout, /^history: \[\]$/m)
    assert.equal(/^candidates:/m.test(r.stdout), false)
  })

  it('puts named co-change under history while osi scope stays unwrapped', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'one')
    writeFileSync(
      join(dir, 'src/pages/tenant/TenantList.tsx'),
      'export function TenantList() { return "a"; }\n',
    )
    writeFileSync(
      join(dir, 'src/services/tenant.ts'),
      'export type Tenant = { id: string; n: 1 };\n',
    )
    commitAll(dir, 'two')

    const doc = runEvidence({ cwd: dir, change: 'add-renewal-status', includeLow: false })
    assert.ok(doc.seeds.includes('src/pages/tenant/TenantList.tsx'))
    const row = doc.history.find((h) => h.path === 'src/services/tenant.ts')
    assert.ok(row)
    assert.equal(row.via, 'src/pages/tenant/TenantList.tsx')
    assert.equal(row.reason, 'co_change')
    assert.ok(row.commits >= 2)
    assert.equal(
      doc.seeds.some((s) => s.endsWith('LegacyExport.js') || s.endsWith('NoiseUtil.ts')),
      false,
    )

    const pipe = spawnSync(process.execPath, [cli, 'impact', 'add-renewal-status'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.equal(pipe.status, 0, pipe.stderr)
    assert.match(pipe.stdout, /^history:$/m)
    assert.match(pipe.stdout, /src\/services\/tenant\.ts/)
    assert.equal(/^candidates:$/m.test(pipe.stdout), false)

    const layer = spawnSync(process.execPath, [cli, 'scope', 'add-renewal-status'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.equal(layer.status, 0, layer.stderr)
    assert.match(layer.stdout, /^candidates:$/m)
    assert.equal(/^scope:$/m.test(layer.stdout), false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('fixture out-of-scope citations are not search terms or seeds', () => {
    const harvested = harvestConcepts(
      readChangeDocuments(join(mini, 'openspec/changes/add-renewal-status')),
    )
    const search = toSearchConcepts(harvested)
    assert.equal(
      search.some((c) => c.text === 'LegacyExport.js' || c.text === 'NoiseUtil.ts'),
      false,
    )
    assert.ok(search.some((c) => c.text === 'TenantCheckOutPact'))
    const doc = runEvidence({ cwd: mini, change: 'add-renewal-status', includeLow: false })
    assert.equal(
      doc.seeds.some((s) => s.endsWith('LegacyExport.js') || s.endsWith('NoiseUtil.ts')),
      false,
    )
    const list = doc.refs.find((r) => r.path === 'src/pages/tenant/TenantList.tsx')
    assert.ok(list)
    assert.equal(list.term, 'TenantList')
    assert.equal(list.wide, false)
    assert.equal(list.sample.includes('src/pages/tenant/TenantList.test.tsx'), false)
    assert.equal(list.others, list.sample.length)
    assert.ok(list.sample.includes('src/config.json'))
  })
})

describe('refsFromHits', () => {
  it('counts shared others, sorts sample, and skips tests', () => {
    const seed = 'src/components/PermButton.vue'
    const callers = Array.from(
      { length: 12 },
      (_, i) => `src/pages/a${String(i).padStart(2, '0')}.vue`,
    )
    const hits: FileHit[] = [
      {
        path: seed,
        reasons: [{ type: 'path_match', term: 'PermButton' }],
        roles: ['strong'],
      },
      ...callers.map((path) => ({
        path,
        reasons: [{ type: 'symbol_match' as const, term: 'PermButton' }],
        roles: ['strong' as const],
      })),
      {
        path: 'src/components/PermButton.test.ts',
        reasons: [{ type: 'symbol_match', term: 'PermButton' }],
        roles: ['strong'],
      },
    ]
    const refs = refsFromHits([seed], hits, new Map())
    assert.equal(refs.length, 1)
    assert.equal(refs[0].term, 'PermButton')
    assert.equal(refs[0].others, 12)
    assert.equal(refs[0].wide, false)
    assert.deepEqual(refs[0].sample, callers.slice(0, 8))
    assert.equal(refs[0].sample.includes('src/components/PermButton.test.ts'), false)
  })

  it('marks wide terms and leaves sample empty', () => {
    const seed = 'src/components/table/VTable.vue'
    const refs = refsFromHits(
      [seed],
      [
        {
          path: seed,
          reasons: [{ type: 'path_match', term: 'VTable' }],
          roles: ['strong'],
        },
      ],
      new Map([['VTable', 81]]),
    )
    assert.equal(refs[0].wide, true)
    assert.equal(refs[0].others, 81)
    assert.deepEqual(refs[0].sample, [])
  })

  it('local named seed has zero others', () => {
    const seed = 'src/pages/tenant/TenantList.tsx'
    const refs = refsFromHits(
      [seed],
      [
        {
          path: seed,
          reasons: [{ type: 'symbol_match', term: 'TenantList' }],
          roles: ['strong'],
        },
        {
          path: 'src/pages/tenant/TenantList.test.tsx',
          reasons: [{ type: 'symbol_match', term: 'TenantList' }],
          roles: ['strong'],
        },
      ],
      new Map(),
    )
    assert.equal(refs[0].others, 0)
    assert.equal(refs[0].wide, false)
    assert.deepEqual(refs[0].sample, [])
  })
})
