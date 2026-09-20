## 1. Search skip and wide set

- [x] 1.1 Skip `.md` `.mdx` `.txt` `.rst` `.adoc` in `skipExt` and `rgGlobs` (case-insensitive)
- [x] 1.2 Return the wide term→count map from `dropWideContent` / `searchConcepts` instead of discarding it

## 2. Impact refs

- [x] 2.1 Add `RefItem` / `EvidenceDocument`; keep `HistoryDocument` without `refs`
- [x] 2.2 Build `refs` from seeds + post-wide hits + wide map (no second search); `toEvidenceYaml` dumps `refs` between `seeds` and `history`; `osi impact` uses it; `osi history` still uses `toHistoryYaml`
- [x] 2.3 `--no-search` yields `refs: []`

## 3. Skill

- [x] 3.1 In `templates/osi-impact/SKILL.md`, treat a seed as 公共 only when `wide` or `others ≥ 2` **and** the filename/path looks like a shared component or method (not a page); cite one `sample` path

## 4. Tests

- [x] 4.1 Fixture: markdown containing a harvested name is absent from `osi scope` candidates; a `.json` hit may still appear
- [x] 4.2 `osi impact` YAML has `refs` with the spec shape; `osi history` stdout has no `refs:`
- [x] 4.3 Shared / local / wide / test-excluded cases for `others`, `wide`, and `sample`
