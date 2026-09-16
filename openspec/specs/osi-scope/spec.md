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
