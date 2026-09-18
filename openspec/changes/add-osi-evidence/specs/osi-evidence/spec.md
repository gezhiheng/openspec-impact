## Purpose

Lets an operator or Skill run `osi <change>` and receive one YAML document with separate scope (lexical candidates) and history (git co-change) sections, so the default CLI path is the full evidence pipeline without mixing those layers into one confidence score.

## ADDED Requirements

### Requirement: Default invocation runs the evidence pipeline

When the first positional argument is not a reserved layer command (`scope`, `history`), the CLI SHALL treat it as a change identifier or path and run the evidence pipeline: locate the same live OpenSpec change as `osi scope`, produce the scope layer, then the history layer from that scope result. Locate failure MUST exit non-zero, explain on stderr, and MUST NOT print YAML on stdout. `osi scope <change>` and `osi history <change>` MUST remain available and MUST keep their existing top-level YAML shapes.

#### Scenario: Change id runs the pipeline

- **WHEN** the operator runs `osi add-renewal-status` from a project that contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change
- **AND** stdout is the nested evidence YAML (not the `osi scope` document and not the `osi history` document)

#### Scenario: Reserved word still selects the layer command

- **WHEN** the operator runs `osi scope add-renewal-status`
- **THEN** stdout is the existing scope YAML (`concepts`, `candidates`, `tests` at the top level)
- **AND** it MUST NOT wrap those keys under `scope:`

#### Scenario: Unknown identifier

- **WHEN** the operator runs `osi does-not-exist` and no live change directory matches
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

### Requirement: Pipeline YAML nests scope and history

On pipeline success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `scope`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`.

`scope` MUST contain `concepts`, `candidates`, and `tests` with the same per-item shape as `osi scope` for the same change and flags. `history` MUST contain `seeds` and `history` with the same per-item shape as `osi history` (`path`, `via`, `commits`, `reason: co_change`). The CLI MUST NOT assign a shared `confidence` to history rows, MUST NOT copy history neighbors into `scope.candidates`, and MUST NOT write this document into the change directory.

#### Scenario: Successful nested shape

- **WHEN** `osi add-renewal-status` succeeds against the fixture
- **THEN** stdout YAML has `version: 1`
- **AND** top-level keys are `version`, `change`, `scope`, `history`
- **AND** `scope` has `concepts`, `candidates`, `tests`
- **AND** `history` has `seeds` and `history`
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history section is success

- **WHEN** the pipeline finds named seeds but no neighbor meets the co-change threshold
- **THEN** the CLI exits 0
- **AND** `history.history` is an empty sequence

### Requirement: Pipeline reuses one scope pass

The history section MUST be derived from the same scope result the pipeline just produced (same change, same `--no-search` / `--include-low`). The CLI MUST NOT run a second repository search to build the history section. `--no-search` MUST yield empty `scope.candidates` and therefore empty `history.seeds` and empty `history.history`. History seed selection and co-change filters MUST match `osi history` (named high seeds, nested git root, 18-month window, no merges, skip commits with more than 30 files, ≥2 co-occurrence, caps, omit tests and OpenSpec paths).

#### Scenario: --no-search skips both layers of file evidence

- **WHEN** the operator runs `osi --no-search add-renewal-status`
- **THEN** the CLI exits 0
- **AND** `scope.candidates` is empty
- **AND** `history.seeds` is empty
- **AND** `history.history` is empty

#### Scenario: Named seed in nested YAML

- **WHEN** scope would emit `src/pages/tenant/TenantList.tsx` as high because of term `TenantList`
- **AND** the fixture git repo pairs that file with `src/services/tenant.ts` in two qualifying commits
- **THEN** `history.seeds` includes `src/pages/tenant/TenantList.tsx`
- **AND** `history.history` includes a `co_change` row for `src/services/tenant.ts` via that seed
