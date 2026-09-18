## 1. Named-seed predicate

- [x] 1.1 Export `isNamedCandidate` from `src/search/repository.ts` (basename/stem vs path_match/symbol_match terms) and use it from existing `seedRank` so scope ranking does not change
- [x] 1.2 Add a unit check that a basename hit is named and a snake_case table-only hit is not

## 2. Git co-change

- [x] 2.1 Add a helper that walks up from a file to the nearest `.git` and returns `{ gitRoot, repoRel }` (or none)
- [x] 2.2 Implement same-root co-change: last 18 months, `--no-merges`, skip commits with more than 30 files, count ≥2, cap 10 neighbors per seed, omit OpenSpec paths and `osi scope` test-path files
- [x] 2.3 Map git names to workspace-relative posix paths; if git is missing or a seed has no enclosing repo, emit no rows for that seed

## 3. History command and YAML

- [x] 3.1 Add `toHistoryYaml` in `src/output/yaml.ts` with only `version`, `change`, `seeds`, `history`
- [x] 3.2 Add `runHistory` that reuses `runScope`, keeps high named seeds (max 5 per git root), expands co-change, caps 50 history rows, sorts by `commits` then `path`
- [x] 3.3 Wire `osi history <change>` in `src/cli.ts` (usage + dispatch); locate failures stay non-zero with no YAML on stdout

## 4. Fixture and tests

- [x] 4.1 Build a disposable git fixture (not this package’s `.git`) with two pairing commits of a named seed and a neighbor, plus one >30-file commit that must not create a history row
- [x] 4.2 Test YAML shape, named vs unnamed seeds, ≥2 co-change row, wide-commit omission, nested-root isolation, empty `history` still exit 0
- [x] 4.3 Confirm `osi scope` tests still pass
