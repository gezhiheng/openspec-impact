## 1. Search-term buckets

- [x] 1.1 Export `isFileCitation` / `isTypeCitation` (file suffix whitelist, no `.js`; Pascal or `Pascal.member`) from `src/search/terms.ts`
- [x] 1.2 Fill `toSearchConcepts` as file citations, then type citations (add left-segment term for `Type.method`), then remaining citations by length, then kebab path-only; keep `SEARCH_TERM_CAP` at 80
- [x] 1.3 Test: short `.vue` survives 80 longer strings; `BillApi.getBillCode` yields `BillApi`; `.js` config is not preferred over `.vue`

## 2. Cited history seeds

- [x] 2.1 Change `selectSeeds` so cited named highs (basename/stem matches a file or type citation) are always kept; other named highs still cap at 5 per git root, sorted by path not match length
- [x] 2.2 Test: a cited Vue remains in `historyFromScope` seeds when five longer named highs share the git root; unnamed table high still excluded
- [x] 2.3 Confirm existing `osi scope` / `osi history` / evidence tests still pass
