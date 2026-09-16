## 1. Package scaffolding

- [x] 1.1 Add `package.json` (`name: openspec-impact`, `bin.osi`), TypeScript config, and `src/` module folders from design.md (`commands`, `openspec`, `search`, `models`, `output`)
- [x] 1.2 Add a Node entry that hand-parses argv (`scope`, `--include-low`, change id/path); unknown commands or missing change argument exit non-zero with stderr help

## 2. OpenSpec location and read

- [x] 2.1 Walk up from cwd to the nearest directory containing `openspec/`; resolve live changes only under `openspec/changes/<id>/` (id or path); missing change → non-zero, stderr, no YAML
- [x] 2.2 Read `proposal.md`, `specs/**/*.md`, `tasks.md`, and `design.md` when present; missing optional files are not errors

## 3. Concepts and search terms

- [x] 3.1 Harvest backticks, bold, inline code, path-like tokens, kebab pieces of change/spec directory names, and 2–3 word phrases from headings, Requirement lines, What Changes, and Impact (no Why/scenario n-grams, no CJK translation)
- [x] 3.2 Apply the spec never-search and path-only closed lists; expand search terms (phrase → camel/Pascal/snake/kebab; unigram → original+Pascal; identifiers/paths unchanged)
- [x] 3.3 Unit-test harvest + expansion against fixture markdown (including `` `TenantList` `` not re-cased and `should` not becoming a search term)

## 4. Repository search and ranking

- [x] 4.1 Search from the OpenSpec project root with `rg` (gitignore + excludes for `openspec/`, `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `vendor/`); fall back to `git grep`; skip binaries
- [x] 4.2 Classify hits as `path_match` / `content_match` / `symbol_match` (filename stem is path, not symbol); path-only terms never query content or symbols
- [x] 4.3 Assign `high` / `medium` / `low` per spec; default omit low; `--include-low` emit at most 20; sort high→medium→low then path; posix paths relative to project root
- [x] 4.4 Split `*.test.*` / `*.spec.*` / `__tests__/` / `*_test.*` into `tests[]` with optional same-directory `related_to`; never put tests in `candidates`

## 5. YAML output

- [x] 5.1 Emit only `version`, `change`, `concepts`, `candidates`, `tests` on stdout as YAML (`version: 1`); no JSON; no write into the change directory
- [x] 5.2 Located change with zero high/medium candidates still exits 0 with empty `candidates` sequence

## 6. Fixture and verification

- [x] 6.1 Add `tests/fixtures/mini-repo/` with `add-renewal-status` OpenSpec plus tenant sources (`TenantList.tsx`, `TenantFilter.tsx`, `tenant.ts`, sibling test, a low-only extra file)
- [x] 6.2 Cover spec scenarios with `node:test` against the fixture only (locate, harvest, rank, test split, YAML keys, `--include-low` cap, archive-id miss, missing change)
- [x] 6.3 From the fixture directory, `osi scope add-renewal-status` prints YAML where `TenantList.tsx` is high, `TenantFilter.tsx` is medium, the sibling test is under `tests` with `related_to`, and OpenSpec markdown is not a candidate
