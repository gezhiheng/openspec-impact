# osi-scope Specification

## Purpose

Lets an operator or Skill run `osi scope` on one OpenSpec change and receive a compact YAML candidate-code-scope, with evidence for every file, without the CLI judging which files must change.

## Requirements

### Requirement: Scope command locates a live OpenSpec change

The CLI SHALL provide `osi scope <change>` where `<change>` is either a change identifier or a path. The CLI MUST locate the OpenSpec root by walking upward from the current working directory (the same nearest-root rule as the OpenSpec CLI). It MUST resolve identifiers only under `openspec/changes/<id>/`. It MUST NOT search `openspec/changes/archive/` unless the operator passes a path that already points there. If the change cannot be located, the CLI MUST exit with a non-zero status and write an explanation to stderr, and MUST NOT print a YAML document to stdout.

#### Scenario: Identifier in a live change directory

- **WHEN** the operator runs `osi scope add-renewal-status` from a directory inside a project whose OpenSpec root contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change and continues

#### Scenario: Path to a live change

- **WHEN** the operator runs `osi scope openspec/changes/add-renewal-status` from the project
- **THEN** the CLI locates that change and continues

#### Scenario: Unknown identifier

- **WHEN** the operator runs `osi scope does-not-exist` and no live change directory matches
- **THEN** the CLI exits non-zero
- **AND** stderr explains that the change was not found
- **AND** stdout is not a YAML document

#### Scenario: Archived change is not found by id

- **WHEN** a change exists only under `openspec/changes/archive/` and the operator passes only its un-prefixed id
- **THEN** the CLI exits non-zero as if the change were missing

### Requirement: Scope reads the change documents

After locating the change, the CLI MUST read `proposal.md`, every markdown file under `specs/`, and `tasks.md` when those files exist. If `design.md` exists, the CLI MUST read it. Missing optional files MUST NOT be an error. The CLI MUST NOT require every artifact to be present as long as the change directory exists.

#### Scenario: Minimal change without design

- **WHEN** the change contains `proposal.md` and `specs/` but no `design.md`
- **THEN** the CLI continues without failing

#### Scenario: Design is harvested when present

- **WHEN** the change contains `design.md` with a backticked path `src/pages/tenant/TenantList.tsx`
- **THEN** that path is available as a harvested concept search term

### Requirement: Scope harvests concepts and search terms

The CLI MUST extract concepts from the change documents without calling a language model. Default repository search MUST query only **typed** citations. It MUST NOT use bag-of-words: change-directory or capability kebab unigrams, 2–3 token phrases from headings or What Changes / Impact, `PATH_ONLY` unigrams as content queries, or Chinese n-grams.

Typed citations MUST be classified as:

- **repo**: a bracket token such as `[qft-app]` or the first path segment of a posix path that names a nested package. Repo tokens are path prefixes only and MUST NOT be queried as file content.
- **path**: a posix file path (including a basename with an implementation suffix such as `.vue` `.java` `.xml`).
- **symbol**: a `PascalCase` identifier or `Type.member`.
- **api**: an HTTP `METHOD /path` string or `FooApi.member`.
- **perm**: a `SCREAMING_SNAKE` permission or config code (two or more uppercase segments).

Sources for typed citations: backtick / inline-code / bold spans, path-like tokens in prose (not under `openspec/`), and `[repo]` markers in `tasks.md`. SQL predicates/assignments, never-search standalone tokens, numeric-only tokens, and `openspec/` paths MUST NOT be harvested.

`osi scope` YAML `concepts` MUST list the in-scope typed citation `text` values (no `search_terms`, no `type` field). Default search MUST query those texts (plus `Type.member` left segment `Type`) after out-of-scope subtraction.

#### Scenario: Identifier is not re-cased

- **WHEN** a document contains `` `TenantList` ``
- **THEN** `concepts` includes an entry whose `text` is `TenantList`
- **AND** that entry has no `search_terms` field

#### Scenario: Phrase from What Changes is not bag-searched

- **WHEN** What Changes contains the phrase `renewal status` and no typed citation for that phrase
- **THEN** default search does not query `renewalStatus` / `RenewalStatus` as bag-of-words expansions of that heading phrase

#### Scenario: Change id is not used as search unigrams

- **WHEN** the change directory name is `sync-variable-sublease-checkout-report`
- **AND** those kebab pieces are not typed citations
- **THEN** default search does not query `sync` or `sublease` as path-only or content terms from the directory name

#### Scenario: Stop word is not a search term

- **WHEN** the documents use the word `should` only as a standalone English word
- **THEN** `should` does not appear as any concept `text`

#### Scenario: OpenSpec path citation is dropped

- **WHEN** a document contains the path-like token `openspec/specs/`
- **THEN** `concepts` does not include `text` `openspec/specs/`

#### Scenario: Standalone id is dropped

- **WHEN** documents use `id` only as a standalone English token (not as part of `checkOutId` or `qft_tenants_relet.id`)
- **THEN** `id` does not appear as any concept `text`

#### Scenario: HTTP API is a typed citation

- **WHEN** a document contains `` `GET /api/finance/bill/getBillCode` ``
- **THEN** `concepts` includes that API string as `text`

#### Scenario: Permission code is a typed citation

- **WHEN** a document contains `` `CHECK_OUT_REPORT_DETAIL` ``
- **THEN** `concepts` includes `text` `CHECK_OUT_REPORT_DETAIL`

#### Scenario: Repo bracket is not a content query

- **WHEN** `tasks.md` contains `[qft-app]` on a task line
- **THEN** default search does not use `qft-app` as a content/symbol query
- **AND** path citations under `qft-app/` remain searchable as paths

### Requirement: List-item field labels are not citations

The CLI MUST NOT harvest a bold or inline-code span as a concept or search term when it is the field label of a markdown list item: the span is the first marked token on the line after an unordered-list marker and is immediately followed by a colon (for example `- **Tenant**: isolation` or `- **Permission**: existing auth`). A distinct backtick or bold citation on that line or elsewhere that is not such a label MUST still be harvested.

#### Scenario: Impact Tenant label is not a type query

- **WHEN** `proposal.md` Impact contains the list item `- **Tenant**: companyId isolation` and no other marked span whose text is `Tenant`
- **THEN** `concepts` does not include `text` `Tenant`
- **AND** default search does not query `Tenant`

#### Scenario: Backticked identifier on a list line is kept

- **WHEN** a list item contains `` `TenantList` `` as inline code that is not a trailing-colon field label
- **THEN** `concepts` includes `text` `TenantList`

### Requirement: Proposal out-of-scope citations are excluded from search

The CLI MUST parse `proposal.md` for out-of-scope material: a heading `Out of scope` / `Out of Scope` / `不在范围` / `明确不修` / `本期不修`, or Impact / What Changes bullets that contain `Out of scope`, `明确不修`, `不在范围`, or `本期不修`. Typed citations found only in that material MUST NOT be queried and MUST NOT become history seeds. A more specific out-of-scope citation (for example `TenantCheckOutPact.loadDynamicHeaders`) MUST NOT remove a distinct in-scope citation for a shorter name (`TenantCheckOutPact`) that still appears outside out-of-scope text.

#### Scenario: Out-of-scope file is not a seed

- **WHEN** proposal Impact says the change will not modify `` `LegacyExport.js` `` under out-of-scope
- **AND** no in-scope document cites `LegacyExport.js`
- **THEN** default search does not query `LegacyExport.js`
- **AND** that path is absent from `osi history` `seeds`

#### Scenario: In-scope short name survives a specific out-of-scope member

- **WHEN** in-scope text cites `` `TenantCheckOutPact` ``
- **AND** out-of-scope text cites `` `TenantCheckOutPact.loadDynamicHeaders` ``
- **THEN** default search still queries `TenantCheckOutPact`

### Requirement: Search-term cap prefers filename and type citations

When default repository search cannot query every harvested citation, the CLI MUST fill the search-term budget in this order, then stop at the existing cap:

1. **File citations**: a strong citation whose `text` is a single path segment (no `/` or whitespace) ending in an implementation suffix `.vue` `.tsx` `.ts` `.jsx` `.java` `.xml` `.rs` or `.go`. Citations ending in `.js` `.md` `.sql` or similar MUST NOT enter this bucket.
2. **Type citations**: a strong citation that is a `PascalCase` identifier, or a `PascalCase.member` token from which the CLI also searches the `PascalCase` left segment. `ss.remark`, `row.sign`, and other lowercase-left dotted fields MUST NOT enter this bucket.
3. **Remainder**: other searchable citations, longest `text` first (HTTP `METHOD /path` strings live here).

The CLI MUST still query kebab path-only unigrams from the change id after these citations. It MUST NOT scan the repository with glob patterns such as `*.vue` in place of harvested citations.

#### Scenario: Short Vue filename is searched before a longer dotted member

- **WHEN** harvested citations include both `TenantCheckOutPact.vue` and a longer string `TenantCheckOutPact.loadDynamicHeaders`
- **AND** the search-term cap cannot keep every citation
- **THEN** `TenantCheckOutPact.vue` is among the queried search terms

#### Scenario: CheckoutStatistics.vue is not dropped for length

- **WHEN** harvested citations include `CheckoutStatistics.vue` (22 characters) and many longer API or dotted strings
- **AND** the search-term cap is 80
- **THEN** `CheckoutStatistics.vue` is among the queried search terms

#### Scenario: Type.method keeps the type name

- **WHEN** a document contains `` `BillApi.getBillCode` ``
- **THEN** default search includes a term `BillApi`

#### Scenario: Script suffix is not a file citation

- **WHEN** harvested citations include `tenant-check-out-config.js` and `CheckoutStatistics.vue`
- **AND** the search-term cap cannot keep every citation
- **THEN** `CheckoutStatistics.vue` is preferred over `tenant-check-out-config.js` for the file-citation budget

### Requirement: Scope searches the project from the OpenSpec project root

Unless the operator passes `--no-search`, the CLI MUST search files from the project root that contains the OpenSpec directory, even if the current working directory is a subdirectory. It MUST respect `.gitignore` when practical. It MUST NOT search a file whose posix path contains any of these names as a path segment: `openspec`, `node_modules`, `.git`, `dist`, `build`, `coverage`, `vendor`. Exclusion MUST apply at any depth (including `qft-app/node_modules/...` and `qft-all/.git/...`), not only as immediate children of the project root. The CLI MUST NOT search a file whose path ends (case-insensitive) in `.md`, `.mdx`, `.txt`, `.rst`, or `.adoc`. It MUST NOT skip `.json`, `.xml`, or `.yml` / `.yaml` solely because of those suffixes. Remaining text files MAY be searched; binary files MUST be skipped. The CLI SHOULD use `rg` when available and MUST fall back to `git grep` otherwise.

The CLI MUST NOT require `--search`. If the operator passes `--search`, the CLI MUST treat it as an unknown flag: non-zero exit, stderr help, no YAML on stdout.

#### Scenario: Subdirectory invocation still searches the project

- **WHEN** the operator runs `osi scope add-renewal-status` from `src/pages/tenant/`
- **THEN** candidates may include files outside that subdirectory, from the project root search

#### Scenario: OpenSpec files are not candidates

- **WHEN** a concept matches text inside `openspec/changes/add-renewal-status/proposal.md`
- **THEN** that markdown file is not listed in `candidates` or `tests`

#### Scenario: Nested node_modules is not a candidate

- **WHEN** a harvested identifier also occurs in `pkg/node_modules/left-pad/index.js` under the project root
- **THEN** that path is not listed in `candidates` or `tests`

#### Scenario: Default invocation searches without a flag

- **WHEN** the operator runs `osi scope add-renewal-status` from the fixture project with no extra flags
- **THEN** stdout YAML may include non-empty `candidates` when source files match harvested terms

#### Scenario: Legacy search flag is rejected

- **WHEN** the operator runs `osi scope --search add-renewal-status`
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

#### Scenario: Markdown file is not a candidate

- **WHEN** a harvested identifier `TenantList` also occurs in `README.md` under the project root
- **THEN** `README.md` is not listed in `candidates` or `tests`

#### Scenario: JSON file may still be searched

- **WHEN** a harvested identifier occurs in `src/config.json` under the project root
- **THEN** that path MAY appear in `candidates` or `tests`

### Requirement: Content matches are attributed per term without a union rescan

When repository search is on, the CLI MUST attribute `content_match` and `symbol_match` from per-term search hits (match lines or an equivalent file list per term). It MUST NOT read every file that matched any term in order to test every other term against that file's full contents. `path_match` MAY still use the file path list. `symbol_match` MAY be decided from the matching line (an identifier occurrence on that line counts). Reason `term` values MUST still name the term that hit.

#### Scenario: A rare term does not scan files that only matched a different term

- **WHEN** harvested terms include both `TenantList` and `VTable`
- **AND** file `src/unrelated/Grid.ts` matches `VTable` in its contents and does not match `TenantList`
- **THEN** that file's `reasons` do not include `{ type: content_match, term: TenantList }`
- **AND** that file's `reasons` do not include `{ type: symbol_match, term: TenantList }`

### Requirement: Wide content terms keep path matches only

If a single search term yields more than 80 distinct files as content or symbol hits, the CLI MUST omit `content_match` and `symbol_match` reasons for that term. `path_match` for that term MUST still apply. Files that have no remaining reasons after this omission MUST NOT appear in `candidates` or `tests` solely because of the dropped content hits. The cap is frozen at 80; it is not a CLI flag.

#### Scenario: Shared component name is path-only when it is everywhere

- **WHEN** the term `VTable` occurs in the contents of more than 80 files
- **AND** `src/components/table/VTable.vue` path-matches `VTable`
- **THEN** `src/components/table/VTable.vue` may appear in `candidates` with a `path_match` reason for `VTable`
- **AND** a file whose path does not contain `VTable` is not a candidate solely from a `VTable` content hit

### Requirement: Scope can skip repository search

The CLI SHALL accept `--no-search`. When that flag is present, the CLI MUST still locate the change and harvest concepts, MUST NOT scan the repository, and MUST emit `candidates: []` and `tests: []` (or equivalent empty sequences) while keeping other YAML keys.

#### Scenario: No-search prints concepts only

- **WHEN** the operator runs `osi scope --no-search add-renewal-status` from a fixture that would otherwise yield source candidates
- **THEN** stdout YAML includes harvested `concepts`
- **AND** `candidates` is empty
- **AND** `tests` is empty
- **AND** the process exits 0

### Requirement: Scope ranks candidates with evidence

Each source candidate MUST include `path`, `confidence` (`high` | `medium` | `low`), and `reasons` (a non-empty list of `{ type, term }`). Reason `type` MUST be one of `path_match`, `content_match`, `symbol_match`. `path_match` means the term occurs in the file path or filename. `symbol_match` means the term occurs as a code identifier; a filename stem match is `path_match`, not `symbol_match`. Paths MUST be posix paths relative to the project root.

Confidence MUST be assigned as:

- **high**: `path_match` or `symbol_match` on a strong term (a harvested path/identifier, or a search term expanded from a ≥2-word phrase)
- **medium**: a full-search domain unigram on path or content, or a path-only term on the path
- **low**: a weak content-only match on a generic unigram

The CLI MUST NOT claim that a candidate must be modified. `candidates` MUST contain only source files (not tests). Within the emitted list, candidates MUST be ordered high, then medium, then low when present, and alphabetically by `path` within the same confidence.

#### Scenario: Strong symbol match is high

- **WHEN** the change describes the tenant list and a file `src/pages/tenant/TenantList.tsx` contains an identifier `TenantList`
- **THEN** that file appears in `candidates` with `confidence: high`
- **AND** `reasons` include `{ type: symbol_match, term: TenantList }`

#### Scenario: Domain-only path match is medium

- **WHEN** a file `src/pages/tenant/TenantFilter.tsx` matches the domain term `tenant` on its path but does not match a strong phrase/identifier term
- **THEN** that file appears with `confidence: medium` when it is emitted

#### Scenario: Paths are project-relative

- **WHEN** a candidate is emitted
- **THEN** its `path` does not start with `/`
- **AND** it is relative to the project root

### Requirement: Scope omits low-confidence matches by default

By default the YAML `candidates` list MUST omit `confidence: low` entries. When the operator passes `--include-low`, the CLI MAY emit low entries, and MUST emit at most 20 of them.

#### Scenario: Default output has no low

- **WHEN** the operator runs `osi scope add-renewal-status` without `--include-low`
- **AND** some files would only qualify as low
- **THEN** those files are absent from `candidates`

#### Scenario: Include-low is capped

- **WHEN** the operator passes `--include-low` and more than 20 files are low
- **THEN** at most 20 low candidates are emitted

### Requirement: Scope lists test files separately

The CLI MUST treat paths matching `*.test.*`, `*.spec.*`, `__tests__/`, or `*_test.*` as tests, not source candidates. Each tests entry MUST have `path`. It MUST include `related_to` only when a source file exists in the same directory after stripping the test suffix (for example `TenantList.test.tsx` → `TenantList.tsx`). Tests MUST NOT include `confidence` or `reasons`. The CLI MUST NOT infer that a test means the feature is covered.

#### Scenario: Sibling test is related

- **WHEN** `src/pages/tenant/TenantList.tsx` is a candidate and `src/pages/tenant/TenantList.test.tsx` exists
- **THEN** `tests` contains `path: src/pages/tenant/TenantList.test.tsx`
- **AND** `related_to` is `src/pages/tenant/TenantList.tsx`
- **AND** the test path is not also in `candidates`

#### Scenario: Unpaired test has no related_to

- **WHEN** a matching test file has no same-directory source after suffix stripping
- **THEN** the tests entry has `path` and omits `related_to`

### Requirement: Scope prints version 1 YAML to stdout

On success the CLI MUST print a single YAML document to stdout and MUST NOT print JSON. The document MUST include exactly these top-level keys: `version`, `change`, `concepts`, `candidates`, `tests`. `version` MUST be `1`. `change` MUST have `name` and `path`. Each concept MUST have `text` only (no `search_terms`). The CLI MUST NOT write the document into the change directory. If the change is located but no source candidates remain after ranking and default omission, the CLI MUST exit 0 and still print valid YAML with empty `candidates` (and `tests` as applicable).

#### Scenario: Successful YAML shape

- **WHEN** `osi scope add-renewal-status` succeeds
- **THEN** stdout is YAML with `version: 1`
- **AND** top-level keys are `version`, `change`, `concepts`, `candidates`, `tests`
- **AND** `change.name` is `add-renewal-status`
- **AND** `change.path` is `openspec/changes/add-renewal-status`

#### Scenario: Empty candidate list is success

- **WHEN** the change exists but no high or medium source candidates are found
- **THEN** the CLI exits 0
- **AND** stdout YAML has `candidates: []` (or an equivalent empty sequence)

### Requirement: Scope does not perform later-phase analysis

The CLI MUST NOT consult git history, blame, co-change, similar commits, dependency graphs, caller/callee relationships, or ASTs to decide candidates. It MUST NOT judge requirement completeness, coverage gaps, or product intent. It MUST NOT call a language model to extract concepts, rank files, or conclude impact.

#### Scenario: No git history in the pipeline

- **WHEN** `osi scope` runs against a fixture that has no `.git` history beyond what `git grep` needs
- **THEN** the command still produces YAML from OpenSpec text and file search alone
