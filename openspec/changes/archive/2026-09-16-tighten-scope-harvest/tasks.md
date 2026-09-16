## 1. Harvest filters

- [x] 1.1 Extend `NEVER_SEARCH` and `PATH_ONLY` in `src/search/terms.ts` to match the delta spec lists
- [x] 1.2 Add the SQL-noise set; in `harvestMarked`, drop backtick/bold spans that contain `=`, match SQL-noise, are numeric/punctuation-only, start with `openspec/` as a path, or are never-search after stripping a leading `.`
- [x] 1.3 Change `kebabPieces` to emit filtered unigrams only (no 2–3 word phrases from change or spec directory names)

## 2. Default search argv

- [x] 2.1 Default `parseArgv` search to true; add `--no-search`; leave `--search` as an unknown flag; update `USAGE`
- [x] 2.2 Pass the parsed boolean into `runScope` so `--no-search` yields empty `candidates` and `tests`

## 3. Tests

- [x] 3.1 Unit-test harvest: no change-id n-grams for `sync-variable-sublease-checkout-report`; drop `` `IFNULL` ``, `` `relet_type = 2` ``, `openspec/specs/`, standalone `id`; keep `` `TenantList` `` and `renewal status` from the fixture
- [x] 3.2 CLI tests: `osi scope add-renewal-status` in the fixture still ranks `TenantList.tsx` high without `--search`; `--no-search` is concepts-only; `--search` exits non-zero with no YAML
