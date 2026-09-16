import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { harvestConcepts, kebabWordsFrom, toSearchConcepts } from '../src/search/terms.js'
import { expandPhrase } from '../src/search/terms.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const changeDir = join(repoRoot, 'tests/fixtures/mini-repo/openspec/changes/add-renewal-status')

describe('harvest + expansion', () => {
  const documents = [
    { relativePath: 'proposal.md', content: readFileSync(join(changeDir, 'proposal.md'), 'utf8') },
    { relativePath: 'design.md', content: readFileSync(join(changeDir, 'design.md'), 'utf8') },
  ]
  const concepts = harvestConcepts('add-renewal-status', ['tenant'], documents)

  it('expands renewal status phrase', () => {
    const hit = concepts.find((c) => c.text.toLowerCase() === 'renewal status')
    assert.ok(hit, 'expected renewal status concept')
    for (const term of ['renewalStatus', 'RenewalStatus', 'renewal_status', 'renewal-status']) {
      assert.ok(hit.search_terms.includes(term), `missing ${term}`)
    }
    assert.equal(hit.search_terms.includes('RENEWALSTATUS'), false)
    assert.equal(hit.search_terms.includes('Renewal_Status'), false)
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
  })

  it('expands tenant list into TenantList', () => {
    const hit = concepts.find((c) => c.text.toLowerCase() === 'tenant list')
    assert.ok(hit)
    assert.ok(hit.search_terms.includes('TenantList'))
    assert.deepEqual(expandPhrase(['renewal', 'status']), [
      'renewalStatus',
      'RenewalStatus',
      'renewal_status',
      'renewal-status',
    ])
  })
})

describe('harvest filters', () => {
  it('does not n-gram the change directory name', () => {
    const concepts = harvestConcepts('sync-variable-sublease-checkout-report', [], [])
    const texts = concepts.map((c) => c.text.toLowerCase())
    assert.equal(texts.includes('sync variable sublease'), false)
    assert.equal(texts.includes('variable sublease checkout'), false)
  })

  it('drops SQL backticks, openspec paths, and standalone id', () => {
    const concepts = harvestConcepts(
      'empty-change',
      [],
      [
        {
          relativePath: 'proposal.md',
          content: [
            '## What Changes',
            '',
            'Use `IFNULL` and `relet_type = 2` plus `openspec/specs/` and `id`.',
          ].join('\n'),
        },
      ],
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
      'empty-change',
      [],
      [
        {
          relativePath: 'proposal.md',
          content: [
            '## What Changes',
            '',
            'APP 仅筛选转租 与 PC 列表共用。',
            '',
            '`TenantList`',
          ].join('\n'),
        },
      ],
    )
    const texts = concepts.map((c) => c.text)
    assert.equal(texts.includes('APP 仅筛选转租'), false)
    assert.equal(texts.includes('仅筛选转租'), false)
    assert.ok(concepts.some((c) => c.text === 'TenantList'))
  })

  it('toSearchConcepts keeps citations and kebab path words only', () => {
    const harvested = harvestConcepts(
      'add-renewal-status',
      ['tenant'],
      [
        {
          relativePath: 'proposal.md',
          content: readFileSync(join(changeDir, 'proposal.md'), 'utf8'),
        },
        { relativePath: 'design.md', content: readFileSync(join(changeDir, 'design.md'), 'utf8') },
      ],
    )
    const search = toSearchConcepts(harvested, kebabWordsFrom('add-renewal-status', ['tenant']))
    assert.ok(search.some((c) => c.text === 'TenantList'))
    assert.equal(
      search.some((c) => c.text.toLowerCase() === 'renewal status'),
      false,
    )
    assert.ok(search.some((c) => c.text === 'tenant' && c.role === 'path-only'))
    assert.equal(
      search.some((c) => c.text === 'list'),
      false,
    )
  })
})
