## MODIFIED Requirements

### Requirement: Scope searches the project from the OpenSpec project root

Unless the operator passes `--no-search`, the CLI MUST search files from the project root that contains the OpenSpec directory, even if the current working directory is a subdirectory. It MUST respect `.gitignore` when practical. It MUST NOT search a file whose posix path contains any of these names as a path segment: `openspec`, `node_modules`, `.git`, `dist`, `build`, `coverage`, `vendor`. Exclusion MUST apply at any depth (including `qft-app/node_modules/...` and `qft-all/.git/...`), not only as immediate children of the project root. Remaining text files MAY be searched; binary files MUST be skipped. The CLI SHOULD use `rg` when available and MUST fall back to `git grep` otherwise.

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

## ADDED Requirements

### Requirement: List-item field labels are not citations

The CLI MUST NOT harvest a bold or inline-code span as a concept or search term when it is the field label of a markdown list item: the span is the first marked token on the line after an unordered-list marker and is immediately followed by a colon (for example `- **Tenant**: isolation` or `- **Permission**: existing auth`). A distinct backtick or bold citation on that line or elsewhere that is not such a label MUST still be harvested.

#### Scenario: Impact Tenant label is not a type query

- **WHEN** `proposal.md` Impact contains the list item `- **Tenant**: companyId isolation` and no other marked span whose text is `Tenant`
- **THEN** `concepts` does not include `text` `Tenant`
- **AND** default search does not query `Tenant`

#### Scenario: Backticked identifier on a list line is kept

- **WHEN** a list item contains `` `TenantList` `` as inline code that is not a trailing-colon field label
- **THEN** `concepts` includes `text` `TenantList`

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
