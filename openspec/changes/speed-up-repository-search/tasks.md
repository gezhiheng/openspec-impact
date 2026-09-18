## 1. Harvest list labels

- [x] 1.1 In `harvestMarked`, skip a backtick/bold span when the line is an unordered list item and that span is the first marked token immediately followed by `:`
- [x] 1.2 Test: Impact `- **Tenant**:` is not a concept or search term; `` `TenantList` `` on a list line still is

## 2. Nested excludes

- [x] 2.1 Emit `rg` globs as `!**/<name>/**` for every `SEARCH_EXCLUDES` entry; keep the JS path-segment filter
- [x] 2.2 Test: a cited identifier inside `pkg/node_modules/...` is absent from `candidates` / `tests`

## 3. Line-oriented content search

- [x] 3.1 Replace the union `rg -l` + `readFileSync` × all-terms loop with one `rg -F -f --json` (nested globs); attribute `content_match` / `symbol_match` from match lines; compile identifier regexes once
- [x] 3.2 After attribution, if a term has more than 80 content/symbol files, drop those reason types for that term and keep `path_match`; `ponytail:` cap 80
- [x] 3.3 Test: a file that only contains `VTable` does not get a `TenantList` reason; a path-matching `VTable.vue` survives when >80 files contain `VTable` as content

## 4. Verify

- [x] 4.1 Existing scope / history / evidence tests still pass
- [x] 4.2 `npm test` and `openspec validate speed-up-repository-search --type change --strict`
