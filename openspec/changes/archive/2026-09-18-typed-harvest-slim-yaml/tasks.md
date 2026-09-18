## 1. Typed harvest and deny list

- [x] 1.1 Stop harvesting kebab unigrams, heading/What Changes n-grams, and `PATH_ONLY` content terms; harvest only typed citations (repo/path/symbol/api/perm)
- [x] 1.2 Classify citations: repo is prefix-only (not a content query); emit search terms for path/symbol/api/perm plus `Type` from `Type.member`
- [x] 1.3 Parse proposal out-of-scope headings/bullets and subtract exact typed texts from search terms without dropping a shorter in-scope name

## 2. Slim default YAML

- [x] 2.1 Make `osi <change>` print `toHistoryYaml` (`version`/`change`/`seeds`/`history`); remove nested `scope`/`candidates`/`tests` from that path
- [x] 2.2 Keep `osi scope` and `osi history` YAML shapes unchanged; one internal `runScope` still feeds history

## 3. Tests

- [x] 3.1 Update harvest tests: no bag expansions of `renewal status` or change-id `sync`; keep stop-word / openspec-path / standalone-id drops; cover API, perm, and `[qft-app]` not searched as content
- [x] 3.2 Add out-of-scope fixture citation (`NoiseUtil.ts` / `LegacyExport.js`) and assert it is not a search term or history seed; in-scope `TenantCheckOutPact` survives a more specific denied member
- [x] 3.3 Update evidence/CLI tests so default `osi <change>` has no `candidates:` / `scope:` and still lists named seeds + co-change
- [x] 3.4 Run `npm test` and `openspec validate typed-harvest-slim-yaml --type change --strict`
