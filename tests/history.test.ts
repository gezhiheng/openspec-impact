import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgv } from '../src/cli.js'
import { runEvidence } from '../src/commands/evidence.js'
import { historyFromScope, runHistory } from '../src/commands/history.js'
import { LocateError } from '../src/models/evidence.js'
import { toHistoryYaml } from '../src/output/yaml.js'
import { coChangeNeighbors, enclosingGit } from '../src/search/git.js'
import { isNamedCandidate } from '../src/search/repository.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const mini = join(repoRoot, 'tests/fixtures/mini-repo')
const cli = join(repoRoot, 'dist/src/cli.js')
const DATE = '2026-03-01T12:00:00'

function git(cwd: string, args: string[], date = DATE) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t.t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t.t',
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
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
  const dir = mkdtempSync(join(tmpdir(), 'osi-hist-'))
  cpSync(mini, dir, { recursive: true })
  return dir
}

function pairSeedAndNeighbor(dir: string): void {
  writeFileSync(
    join(dir, 'src/pages/tenant/TenantList.tsx'),
    'export function TenantList() { return "a"; }\n',
  )
  writeFileSync(join(dir, 'src/services/tenant.ts'), 'export type Tenant = { id: string; n: 1 };\n')
}

describe('isNamedCandidate', () => {
  it('treats a basename hit as named and a snake_case table-only hit as not', () => {
    assert.equal(
      isNamedCandidate('src/pages/tenant/TenantList.tsx', [
        { type: 'symbol_match', term: 'TenantList' },
      ]),
      true,
    )
    assert.equal(
      isNamedCandidate('qft-all/FooMapper.xml', [
        { type: 'symbol_match', term: 'qft_tenants_check_out' },
      ]),
      false,
    )
  })
})

describe('enclosingGit', () => {
  it('walks up to the nearest .git and returns repo-relative path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-git-'))
    const file = join(dir, 'pkg-a/src/A.ts')
    mkdirSync(join(dir, 'pkg-a/src'), { recursive: true })
    writeFileSync(file, 'export const A = 1\n')
    gitInit(join(dir, 'pkg-a'))
    const loc = enclosingGit(file)
    assert.equal(loc?.gitRoot, join(dir, 'pkg-a'))
    assert.equal(loc?.repoRel, 'src/A.ts')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('osi history against a disposable git fixture', () => {
  it('prints version 1 YAML with named seed and ≥2 co-change neighbor', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'one')
    pairSeedAndNeighbor(dir)
    commitAll(dir, 'two')
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    assert.equal(doc.version, 1)
    assert.equal(doc.change.name, 'add-renewal-status')
    assert.ok(doc.seeds.includes('src/pages/tenant/TenantList.tsx'))
    assert.equal(
      doc.seeds.some((s) => s.includes('FooMapper') || s.endsWith('notes.txt')),
      false,
    )
    const row = doc.history.find((h) => h.path === 'src/services/tenant.ts')
    assert.ok(row)
    assert.equal(row.via, 'src/pages/tenant/TenantList.tsx')
    assert.equal(row.reason, 'co_change')
    assert.ok(row.commits >= 2)
    const yaml = toHistoryYaml(doc)
    assert.match(yaml, /^version: 1$/m)
    assert.match(yaml, /^change:$/m)
    assert.match(yaml, /^seeds:$/m)
    assert.match(yaml, /^history:$/m)
    assert.equal(/^refs:/m.test(yaml), false)
    assert.equal(yaml.includes('concepts:'), false)
    assert.equal(yaml.includes('confidence:'), false)
    const r = spawnSync(process.execPath, [cli, 'history', 'add-renewal-status'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^version: 1$/m)
    assert.match(r.stdout, /change\.name|name: "add-renewal-status"/)
    assert.equal(r.stdout.includes('candidates:'), false)
    assert.equal(/^refs:/m.test(r.stdout), false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('ignores a wide commit as the only pairing', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'base')
    mkdirSync(join(dir, 'wide'), { recursive: true })
    for (let i = 0; i < 31; i++) {
      writeFileSync(join(dir, 'wide', `${String(i).padStart(2, '0')}.txt`), 'x\n')
    }
    writeFileSync(join(dir, 'src/lonely.ts'), 'export const lonely = 1\n')
    writeFileSync(
      join(dir, 'src/pages/tenant/TenantList.tsx'),
      'export function TenantList() { return "wide"; }\n',
    )
    commitAll(dir, 'wide')
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    assert.ok(doc.seeds.includes('src/pages/tenant/TenantList.tsx'))
    assert.deepEqual(doc.history, [])
    rmSync(dir, { recursive: true, force: true })
  })

  it('empty history still exits 0', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'only')
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    assert.ok(doc.seeds.includes('src/pages/tenant/TenantList.tsx'))
    assert.deepEqual(doc.history, [])
    const r = spawnSync(process.execPath, [cli, 'history', 'add-renewal-status'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^history: \[\]$/m)
    rmSync(dir, { recursive: true, force: true })
  })

  it('does not mix a nested repo with a sibling git root', () => {
    const dir = copyMini()
    const pkgA = join(dir, 'pkg-a')
    mkdirSync(join(pkgA, 'src'), { recursive: true })
    cpSync(join(dir, 'src'), join(pkgA, 'src'), { recursive: true })
    rmSync(join(dir, 'src'), { recursive: true, force: true })
    gitInit(pkgA)
    commitAll(pkgA, 'one')
    writeFileSync(
      join(pkgA, 'src/pages/tenant/TenantList.tsx'),
      'export function TenantList() { return "a"; }\n',
    )
    writeFileSync(
      join(pkgA, 'src/services/tenant.ts'),
      'export type Tenant = { id: string; n: 1 };\n',
    )
    commitAll(pkgA, 'two')

    const pkgB = join(dir, 'pkg-b')
    mkdirSync(join(pkgB, 'src'), { recursive: true })
    writeFileSync(join(pkgB, 'src/Other.ts'), 'export const Other = 1\n')
    gitInit(pkgB)
    commitAll(pkgB, 'b1')
    writeFileSync(join(pkgB, 'src/Other.ts'), 'export const Other = 2\n')
    writeFileSync(join(pkgB, 'src/Sibling.ts'), 'export const Sibling = 1\n')
    commitAll(pkgB, 'b2')

    const loc = enclosingGit(join(pkgA, 'src/pages/tenant/TenantList.tsx'))
    assert.equal(loc?.gitRoot, pkgA)
    const rows = coChangeNeighbors(loc!, dir, 'pkg-a/src/pages/tenant/TenantList.tsx')
    assert.ok(rows.some((h) => h.path === 'pkg-a/src/services/tenant.ts'))
    assert.equal(
      rows.some((h) => h.path.startsWith('pkg-b/')),
      false,
    )

    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    assert.ok(doc.seeds.includes('pkg-a/src/pages/tenant/TenantList.tsx'))
    assert.equal(
      doc.history.some((h) => h.path.startsWith('pkg-b/')),
      false,
    )
    rmSync(dir, { recursive: true, force: true })
  })

  it('missing change prints stderr and no YAML', () => {
    const dir = copyMini()
    assert.throws(() => runHistory({ cwd: dir, change: 'does-not-exist' }), LocateError)
    const r = spawnSync(process.execPath, [cli, 'history', 'does-not-exist'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /not found/)
    assert.equal(r.stdout.includes('version:'), false)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('argv history', () => {
  it('accepts history and a change', () => {
    const ok = parseArgv(['history', 'add-renewal-status'])
    assert.equal(ok.ok, true)
    if (ok.ok) {
      assert.equal(ok.command, 'history')
      assert.equal(ok.change, 'add-renewal-status')
    }
  })
})

describe('cited history seeds', () => {
  it('keeps a cited Vue when five other named highs share the git root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osi-seed-'))
    gitInit(dir)
    const doc = {
      version: 1 as const,
      change: { name: 'x', path: 'openspec/changes/x' },
      concepts: [],
      tests: [],
      candidates: [
        {
          path: 'src/TenantCheckOutPact.vue',
          confidence: 'high' as const,
          reasons: [{ type: 'path_match' as const, term: 'TenantCheckOutPact.vue' }],
        },
        {
          path: 'src/CheckoutReportSourceBranch.java',
          confidence: 'high' as const,
          reasons: [{ type: 'symbol_match' as const, term: 'CheckoutReportSourceBranch' }],
        },
        {
          path: 'src/ReletCheckOutReportIncludeMapper.xml',
          confidence: 'high' as const,
          reasons: [{ type: 'path_match' as const, term: 'ReletCheckOutReportIncludeMapper.xml' }],
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          path: `src/tool-${i}.js`,
          confidence: 'high' as const,
          reasons: [{ type: 'path_match' as const, term: `tool-${i}.js` }],
        })),
        {
          path: 'src/FooMapper.xml',
          confidence: 'high' as const,
          reasons: [{ type: 'symbol_match' as const, term: 'qft_tenants_check_out' }],
        },
      ],
    }
    const hist = historyFromScope(doc, dir)
    assert.ok(hist.seeds.includes('src/TenantCheckOutPact.vue'))
    assert.ok(hist.seeds.includes('src/CheckoutReportSourceBranch.java'))
    assert.ok(hist.seeds.includes('src/ReletCheckOutReportIncludeMapper.xml'))
    assert.equal(hist.seeds.includes('src/FooMapper.xml'), false)
    rmSync(dir, { recursive: true, force: true })
  })
})

function cite(dir: string, name: string): void {
  const p = join(dir, 'openspec/changes/add-renewal-status/proposal.md')
  const text = readFileSync(p, 'utf8')
  const needle = '## Impact\n'
  const i = text.indexOf(needle)
  assert.ok(i >= 0)
  writeFileSync(
    p,
    `${text.slice(0, i + needle.length)}\n- Touch \`${name}\`.\n${text.slice(i + needle.length)}`,
  )
}

function writePair(dir: string, page: string, service: string, n: number): void {
  mkdirSync(join(dir, 'src/pages', page.split('/')[0] ?? ''), { recursive: true })
  mkdirSync(join(dir, 'src/services'), { recursive: true })
  writeFileSync(join(dir, 'src/pages', page), `export function Page() { return ${n} }\n`)
  writeFileSync(join(dir, 'src/services', service), `export const svc = ${n}\n`)
}

describe('sibling neighbors', () => {
  it('keeps qualifying co-change and adds no sibling', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'base')
    const via = 'src/pages/house/ReturnVisitDetails.vue'
    writePair(dir, 'house/ReturnVisitDetails.vue', 'visit.ts', 1)
    commitAll(dir, 'one')
    writePair(dir, 'house/ReturnVisitDetails.vue', 'visit.ts', 2)
    commitAll(dir, 'two')
    writeFileSync(
      join(dir, 'src/pages/house/ReturnVisit.vue'),
      'export function ReturnVisit() { return 1 }\n',
    )
    cite(dir, 'ReturnVisitDetails')
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    const row = doc.history.find((h) => h.path === 'src/services/visit.ts')
    assert.ok(row)
    assert.equal(row.via, via)
    assert.equal(row.reason, 'co_change')
    assert.ok(row.commits >= 2)
    assert.equal(
      doc.history.some((h) => h.via === via && h.reason === 'sibling'),
      false,
    )
    assert.equal(
      doc.history.some((h) => h.path === 'src/pages/house/ReturnVisit.vue'),
      false,
    )
    rmSync(dir, { recursive: true, force: true })
  })

  it('adds the stem sibling when co-change is empty, and sample only when listed', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'base')
    const via = 'src/pages/house/ReturnVisitDetails.vue'
    mkdirSync(join(dir, 'src/pages/house'), { recursive: true })
    writeFileSync(join(dir, via), 'export function ReturnVisitDetails() { return 1 }\n')
    writeFileSync(
      join(dir, 'src/pages/house/ReturnVisit.vue'),
      'export function ReturnVisit() { return 1 }\n',
    )
    writeFileSync(
      join(dir, 'src/pages/house/MaintenanceRecord.vue'),
      'export function MaintenanceRecord() { return 1 }\n',
    )
    writeFileSync(
      join(dir, 'src/pages/house/FooDetail.vue'),
      'export function FooDetail() { return 1 }\n',
    )
    writeFileSync(
      join(dir, 'src/pages/house/ReturnVisit.test.vue'),
      'export function ReturnVisit() { return 1 }\n',
    )
    cite(dir, 'ReturnVisitDetails')
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    const row = doc.history.find((h) => h.path === 'src/pages/house/ReturnVisit.vue')
    assert.ok(row)
    assert.equal(row.via, via)
    assert.equal(row.reason, 'sibling')
    assert.equal(row.commits, 0)
    assert.equal(
      doc.history.some((h) => h.path === 'src/pages/house/MaintenanceRecord.vue'),
      false,
    )
    assert.equal(
      doc.history.some((h) => h.path === 'src/pages/house/FooDetail.vue'),
      false,
    )
    assert.equal(
      doc.history.some((h) => h.path.endsWith('ReturnVisit.test.vue')),
      false,
    )
    writeFileSync(
      join(dir, 'src/pages/house/MaintenanceRecord.vue'),
      'export function MaintenanceRecord() { return "ReturnVisitDetails" }\n',
    )
    const sampled = runEvidence({ cwd: dir, change: 'add-renewal-status', includeLow: false })
    const hit = sampled.history.find((h) => h.path === 'src/pages/house/MaintenanceRecord.vue')
    assert.ok(hit)
    assert.equal(hit.reason, 'sibling')
    assert.equal(hit.commits, 0)
    assert.ok(
      sampled.refs
        .find((r) => r.path === via)
        ?.sample.includes('src/pages/house/MaintenanceRecord.vue'),
    )
    rmSync(dir, { recursive: true, force: true })
  })

  it('skips co-change and siblings when others is at least 30, including a wide term', () => {
    const dir = copyMini()
    gitInit(dir)
    commitAll(dir, 'base')
    const album = 'src/pages/album/AlbumShotDetails.vue'
    const wide = 'src/pages/wide/WideShotDetails.vue'
    writePair(dir, 'album/AlbumShotDetails.vue', 'album.ts', 1)
    writePair(dir, 'wide/WideShotDetails.vue', 'wide.ts', 1)
    commitAll(dir, 'one')
    writePair(dir, 'album/AlbumShotDetails.vue', 'album.ts', 2)
    writePair(dir, 'wide/WideShotDetails.vue', 'wide.ts', 2)
    commitAll(dir, 'two')
    writeFileSync(
      join(dir, 'src/pages/album/AlbumShot.vue'),
      'export function AlbumShot() { return 1 }\n',
    )
    writeFileSync(
      join(dir, 'src/pages/wide/WideShot.vue'),
      'export function WideShot() { return 1 }\n',
    )
    mkdirSync(join(dir, 'src/album-noise'), { recursive: true })
    for (let i = 0; i < 30; i++) {
      writeFileSync(
        join(dir, 'src/album-noise', `a${String(i).padStart(2, '0')}.ts`),
        'export const a = "AlbumShotDetails"\n',
      )
    }
    mkdirSync(join(dir, 'src/wide-noise'), { recursive: true })
    for (let i = 0; i < 81; i++) {
      writeFileSync(
        join(dir, 'src/wide-noise', `w${String(i).padStart(2, '0')}.ts`),
        'export const w = "WideShotDetails"\n',
      )
    }
    cite(dir, 'AlbumShotDetails')
    cite(dir, 'WideShotDetails')
    const albumLoc = enclosingGit(join(dir, album))
    assert.ok(
      coChangeNeighbors(albumLoc!, dir, album).some((h) => h.path === 'src/services/album.ts'),
    )
    const wideLoc = enclosingGit(join(dir, wide))
    assert.ok(coChangeNeighbors(wideLoc!, dir, wide).some((h) => h.path === 'src/services/wide.ts'))
    const ev = runEvidence({ cwd: dir, change: 'add-renewal-status', includeLow: false })
    const albumRef = ev.refs.find((r) => r.path === album)
    const wideRef = ev.refs.find((r) => r.path === wide)
    assert.ok(albumRef)
    assert.equal(albumRef.wide, false)
    assert.ok(albumRef.others >= 30)
    assert.ok(wideRef)
    assert.equal(wideRef.wide, true)
    assert.ok(wideRef.others > 80)
    assert.equal(
      ev.history.some((h) => h.via === album || h.via === wide),
      false,
    )
    const doc = runHistory({ cwd: dir, change: 'add-renewal-status' })
    assert.equal(
      doc.history.some((h) => h.via === album || h.via === wide),
      false,
    )
    rmSync(dir, { recursive: true, force: true })
  })
})
