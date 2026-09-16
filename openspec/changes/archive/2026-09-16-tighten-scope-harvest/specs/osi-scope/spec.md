## MODIFIED Requirements

### Requirement: Scope harvests concepts and search terms

The CLI MUST extract concepts from the change documents without calling a language model. It MUST harvest:

- citation tokens: backtick / inline-code / bold spans that are paths, APIs, or identifiers (including `PascalCase`, `camelCase`, `snake_case`, dotted table/column names, and `METHOD /path` API strings)
- path-like tokens that appear in prose (not under `openspec/`)
- unigram kebab pieces of the change directory name and capability directory names, after never-search / path-only filtering
- 2–3 token phrases from headings, `### Requirement` lines, and the proposal sections What Changes and Impact

It MUST NOT n-gram scenario / Why body prose. It MUST NOT n-gram the change directory name or capability directory names into 2–3 word phrases. It MUST NOT translate Chinese into English.

It MUST NOT harvest as concept `text`:

- tokens on the never-search list (standalone)
- backtick/bold spans that are SQL predicates or assignments (the span contains `=`, or matches a closed SQL-noise list as the whole token)
- tokens that are only digits, punctuation, or numeric literals (for example `0.00`)
- path-like tokens whose first path segment is `openspec`

Tokens in the path-only list MAY be used only for path matching, never as content or symbol queries. Multi-word phrases that contain a path-only word (for example `tenant list`) MUST still be expanded and fully searched when those phrases come from headings or proposal sections (not from directory-name n-grams).

Search-term expansion MUST be limited to:

- multi-word phrases → `camelCase`, `PascalCase`, `snake_case`, `kebab-case`
- single words → original + `PascalCase`
- tokens that are already paths or harvested identifiers → no further expansion

The CLI MUST NOT emit a `type` field on concepts. Default repository search MUST query only harvested search terms that are not path-only unigrams; dropped noise MUST NOT be queried.

Never-search (standalone): `should` `must` `shall` `may` `system` `user` `when` `then` `given` `and` `the` `a` `an` `to` `of` `in` `on` `for` `with` `by` `from` `this` `that` `support` `display` `add` `added` `change` `changes` `requirement` `scenario` `purpose` `why` `what` `id` `env` `alter` `explain` `ifnull` `count`

SQL-noise (whole backtick/bold token, case-insensitive): `IFNULL` `DATE_FORMAT` `ALTER` `EXPLAIN` `COUNT(*)` `COUNT`

Path-only: `filter` `export` `search` `create` `update` `renew` `list` `detail` `page` `status` `form` `view` `modal` `dialog` `table` `button` `sync` `report` `checkout` `variable`

#### Scenario: Phrase from What Changes is expanded

- **WHEN** What Changes contains the phrase `renewal status`
- **THEN** the YAML `concepts` list includes an entry whose `text` is `renewal status`
- **AND** that entry has no `search_terms` field
- **AND** no concept `text` is `RENEWALSTATUS`

#### Scenario: Identifier is not re-cased

- **WHEN** a document contains `` `TenantList` ``
- **THEN** `concepts` includes an entry whose `text` is `TenantList`
- **AND** that entry has no `search_terms` field

#### Scenario: Stop word is not a search term

- **WHEN** the documents use the word `should` only as a standalone English word
- **THEN** `should` does not appear as any concept `text`

#### Scenario: Path-only word does not content-match alone

- **WHEN** the harvested terms include standalone `filter` and a file's contents mention `filter` but its path does not
- **AND** that file has no other matching terms
- **THEN** that file is not emitted as a default (high/medium) candidate solely for that content hit

#### Scenario: Change id is not n-grammed into concepts

- **WHEN** the change directory name is `sync-variable-sublease-checkout-report`
- **AND** those words do not appear as a heading or What Changes / Impact phrase
- **THEN** `concepts` does not include `text` `sync variable sublease`
- **AND** `concepts` does not include `text` `variable sublease checkout`

#### Scenario: SQL backtick is not a concept

- **WHEN** a document contains `` `relet_type = 2` `` or `` `IFNULL` ``
- **THEN** `concepts` does not include `text` `relet_type = 2`
- **AND** `concepts` does not include `text` `IFNULL`

#### Scenario: OpenSpec path citation is dropped

- **WHEN** a document contains the path-like token `openspec/specs/`
- **THEN** `concepts` does not include `text` `openspec/specs/`

#### Scenario: Standalone id is dropped

- **WHEN** documents use `id` only as a standalone English token (not as part of `checkOutId` or `qft_tenants_relet.id`)
- **THEN** `id` does not appear as any concept `text`

### Requirement: Scope searches the project from the OpenSpec project root

Unless the operator passes `--no-search`, the CLI MUST search files from the project root that contains the OpenSpec directory, even if the current working directory is a subdirectory. It MUST respect `.gitignore` when practical. It MUST NOT search `openspec/`, `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, or `vendor/`. Remaining text files MAY be searched; binary files MUST be skipped. The CLI SHOULD use `rg` when available and MUST fall back to `git grep` otherwise.

The CLI MUST NOT require `--search`. If the operator passes `--search`, the CLI MUST treat it as an unknown flag: non-zero exit, stderr help, no YAML on stdout.

#### Scenario: Subdirectory invocation still searches the project

- **WHEN** the operator runs `osi scope add-renewal-status` from `src/pages/tenant/`
- **THEN** candidates may include files outside that subdirectory, from the project root search

#### Scenario: OpenSpec files are not candidates

- **WHEN** a concept matches text inside `openspec/changes/add-renewal-status/proposal.md`
- **THEN** that markdown file is not listed in `candidates` or `tests`

#### Scenario: Default invocation searches without a flag

- **WHEN** the operator runs `osi scope add-renewal-status` from the fixture project with no extra flags
- **THEN** stdout YAML may include non-empty `candidates` when source files match harvested terms

#### Scenario: Legacy search flag is rejected

- **WHEN** the operator runs `osi scope --search add-renewal-status`
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

## ADDED Requirements

### Requirement: Scope can skip repository search

The CLI SHALL accept `--no-search`. When that flag is present, the CLI MUST still locate the change and harvest concepts, MUST NOT scan the repository, and MUST emit `candidates: []` and `tests: []` (or equivalent empty sequences) while keeping other YAML keys.

#### Scenario: No-search prints concepts only

- **WHEN** the operator runs `osi scope --no-search add-renewal-status` from a fixture that would otherwise yield source candidates
- **THEN** stdout YAML includes harvested `concepts`
- **AND** `candidates` is empty
- **AND** `tests` is empty
- **AND** the process exits 0
