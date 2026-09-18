## MODIFIED Requirements

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

## ADDED Requirements

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
