## MODIFIED Requirements

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
