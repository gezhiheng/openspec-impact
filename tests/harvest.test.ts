import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { harvestConcepts, toSearchConcepts, SEARCH_TERM_CAP } from '../src/search/terms.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const changeDir = join(repoRoot, 'tests/fixtures/mini-repo/openspec/changes/add-renewal-status')

function docsFrom(content: string, relativePath = 'proposal.md') {
  return [{ relativePath, content }]
}

describe('harvest + expansion', () => {
  const documents = [
    { relativePath: 'proposal.md', content: readFileSync(join(changeDir, 'proposal.md'), 'utf8') },
    { relativePath: 'design.md', content: readFileSync(join(changeDir, 'design.md'), 'utf8') },
  ]
  const concepts = harvestConcepts(documents)

  it('does not bag-search a What Changes phrase', () => {
    const search = toSearchConcepts(concepts)
    assert.equal(
      search.some((c) => /renewalStatus|RenewalStatus|renewal_status|renewal-status/i.test(c.text)),
      false,
    )
    assert.equal(
      search.some((c) =>
        c.search_terms.some((t) => t === 'renewalStatus' || t === 'RenewalStatus'),
      ),
      false,
    )
  })

  it('does not re-case harvested TenantList identifier', () => {
    const hit = concepts.find((c) => c.text === 'TenantList')
    assert.ok(hit)
    assert.deepEqual(hit.search_terms, ['TenantList'])
  })

  it('does not emit should as a search term', () => {
    assert.equal(
      concepts.some((c) => c.search_terms.some((t) => t.toLowerCase() === 'should')),
      false,
    )
    assert.equal(
      concepts.some((c) => c.text.toLowerCase() === 'should'),
      false,
    )
  })
})

describe('harvest filters', () => {
  it('does not use change-id kebab as search unigrams', () => {
    const search = toSearchConcepts(
      harvestConcepts([
        { relativePath: 'proposal.md', content: '# sync-variable-sublease-checkout-report\n' },
      ]),
    )
    const terms = search.flatMap((c) => [c.text, ...c.search_terms]).map((t) => t.toLowerCase())
    assert.equal(terms.includes('sync'), false)
    assert.equal(terms.includes('sublease'), false)
  })

  it('drops SQL backticks, openspec paths, and standalone id', () => {
    const concepts = harvestConcepts(
      docsFrom(
        [
          '## What Changes',
          '',
          'Use `IFNULL` and `relet_type = 2` plus `openspec/specs/` and `id`.',
        ].join('\n'),
      ),
    )
    const texts = new Set(concepts.map((c) => c.text))
    assert.equal(texts.has('IFNULL'), false)
    assert.equal(
      [...texts].some((t) => t.toLowerCase() === 'ifnull'),
      false,
    )
    assert.equal(texts.has('relet_type = 2'), false)
    assert.equal(texts.has('openspec/specs/'), false)
    assert.equal(texts.has('id'), false)
  })

  it('does not n-gram Chinese headings into search concepts', () => {
    const concepts = harvestConcepts(
      docsFrom(
        ['## What Changes', '', 'APP 仅筛选转租 与 PC 列表共用。', '', '`TenantList`'].join('\n'),
      ),
    )
    const texts = concepts.map((c) => c.text)
    assert.equal(texts.includes('APP 仅筛选转租'), false)
    assert.equal(texts.includes('仅筛选转租'), false)
    assert.ok(concepts.some((c) => c.text === 'TenantList'))
  })

  it('toSearchConcepts keeps typed citations only', () => {
    const harvested = harvestConcepts([
      {
        relativePath: 'proposal.md',
        content: readFileSync(join(changeDir, 'proposal.md'), 'utf8'),
      },
      { relativePath: 'design.md', content: readFileSync(join(changeDir, 'design.md'), 'utf8') },
    ])
    const search = toSearchConcepts(harvested)
    assert.ok(search.some((c) => c.text === 'TenantList'))
    assert.equal(
      search.some((c) => c.text.toLowerCase() === 'renewal status'),
      false,
    )
    assert.equal(
      search.some((c) => c.text === 'tenant' && c.role === 'path-only'),
      false,
    )
    assert.equal(
      search.some((c) => c.text === 'list'),
      false,
    )
  })

  it('harvests HTTP API and permission codes', () => {
    const concepts = harvestConcepts(
      docsFrom('Call `GET /api/finance/bill/getBillCode` with `CHECK_OUT_REPORT_DETAIL`.\n'),
    )
    assert.ok(concepts.some((c) => c.text === 'GET /api/finance/bill/getBillCode'))
    assert.ok(concepts.some((c) => c.text === 'CHECK_OUT_REPORT_DETAIL'))
  })

  it('does not search a repo bracket as content', () => {
    const harvested = harvestConcepts([
      {
        relativePath: 'tasks.md',
        content: '- [qft-app] Edit `src/pages/Foo.vue`\n',
      },
    ])
    const search = toSearchConcepts(harvested)
    assert.ok(search.some((c) => c.text === 'qft-app/src/pages/Foo.vue'))
    assert.equal(
      search.some((c) => c.text === 'qft-app' || c.search_terms.includes('qft-app')),
      false,
    )
  })

  it('prefers file citations and Type.method heads over longer remainder strings', () => {
    const strong = (text: string) => ({
      text,
      search_terms: [text],
      role: 'strong' as const,
    })
    const long = Array.from({ length: SEARCH_TERM_CAP }, (_, i) =>
      strong(`GET /api/v3/very/long/path/segment${String(i).padStart(3, '0')}`),
    )
    const search = toSearchConcepts([
      ...long,
      strong('CheckoutStatistics.vue'),
      strong('TenantCheckOutPact.vue'),
      strong('BillApi.getBillCode'),
      strong('tenant-check-out-config.js'),
    ])
    assert.ok(search.some((c) => c.text === 'CheckoutStatistics.vue'))
    assert.ok(search.some((c) => c.text === 'TenantCheckOutPact.vue'))
    assert.ok(search.some((c) => c.search_terms.includes('BillApi')))
    assert.ok(search.some((c) => c.text === 'tenant-check-out-config.js'))
    const fromDoc = toSearchConcepts(harvestConcepts(docsFrom('Use `BillApi.getBillCode` here.\n')))
    assert.ok(fromDoc.some((c) => c.search_terms.includes('BillApi')))
  })
})

describe('out-of-scope deny', () => {
  it('drops out-of-scope files and keeps a shorter in-scope name', () => {
    const harvested = harvestConcepts([
      {
        relativePath: 'proposal.md',
        content: [
          '## What Changes',
          '',
          '- Update `TenantCheckOutPact`',
          '- Out of scope: skip `LegacyExport.js` and `NoiseUtil.ts`',
          '',
          '## Out of scope',
          '',
          '- Do not fix `TenantCheckOutPact.loadDynamicHeaders`',
        ].join('\n'),
      },
    ])
    const search = toSearchConcepts(harvested)
    assert.ok(search.some((c) => c.text === 'TenantCheckOutPact'))
    assert.equal(
      search.some((c) => c.text === 'LegacyExport.js' || c.text === 'NoiseUtil.ts'),
      false,
    )
    assert.equal(
      search.some((c) => c.text === 'TenantCheckOutPact.loadDynamicHeaders'),
      false,
    )
  })
})
