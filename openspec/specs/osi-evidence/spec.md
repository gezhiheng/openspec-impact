# osi-evidence Specification

## Purpose

Lets an operator or Skill run `osi <change>` and receive one YAML document with separate scope (lexical candidates) and history (git co-change) sections, so the default CLI path is the full evidence pipeline without mixing those layers into one confidence score.

## Requirements

### Requirement: Default invocation runs the evidence pipeline

When the first positional argument is `impact`, the CLI SHALL treat the next positional as a change identifier or path and run the evidence pipeline: locate the same live OpenSpec change as `osi scope`, produce scope internally (typed search), then the history layer from that result. `osi impact` with no change, extra positionals, or a bare change id with no verb MUST be a usage error: non-zero exit, stderr help, no YAML on stdout. Locate failure MUST exit non-zero, explain on stderr, and MUST NOT print YAML on stdout. `osi scope <change>` and `osi history <change>` MUST remain available. `osi init` MUST remain available and MUST NOT run the evidence pipeline. `osi scope` MUST keep its existing top-level YAML shape (`concepts`, `candidates`, `tests`). `osi history` MUST keep `version`, `change`, `seeds`, `history`. A live change whose id is `impact` or `init` is reachable only as a path (`openspec/changes/impact`).

#### Scenario: Change id runs the pipeline

- **WHEN** the operator runs `osi impact add-renewal-status` from a project that contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change
- **AND** stdout is the history-shaped YAML (not the `osi scope` document)

#### Scenario: Reserved word still selects the layer command

- **WHEN** the operator runs `osi scope add-renewal-status`
- **THEN** stdout is the existing scope YAML (`concepts`, `candidates`, `tests` at the top level)

#### Scenario: Unknown identifier

- **WHEN** the operator runs `osi impact does-not-exist` and no live change directory matches
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

#### Scenario: Bare change id is usage

- **WHEN** the operator runs `osi add-renewal-status` from a project that contains that live change
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

#### Scenario: Init does not run the pipeline

- **WHEN** the operator runs `osi init` from a project that contains `openspec/changes/init/`
- **THEN** the CLI does not treat `init` as that change
- **AND** stdout is not the history-shaped YAML

### Requirement: Pipeline YAML nests scope and history

On pipeline success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `seeds`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`. `seeds` and `history` MUST use the same per-item shape as `osi history` (`path`, `via`, `commits`, `reason: co_change` on history rows). The CLI MUST NOT print `scope`, `concepts`, `candidates`, or `tests` on this document. The CLI MUST NOT assign `confidence` to history rows and MUST NOT write this document into the change directory.

#### Scenario: Successful YAML shape

- **WHEN** `osi impact add-renewal-status` succeeds against the fixture
- **THEN** stdout YAML has `version: 1`
- **AND** top-level keys are `version`, `change`, `seeds`, `history`
- **AND** stdout does not contain a top-level `scope:` or `candidates:` key
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history section is success

- **WHEN** the pipeline finds named seeds but no neighbor meets the co-change threshold
- **THEN** the CLI exits 0
- **AND** `history` is an empty sequence

### Requirement: Pipeline reuses one scope pass

The history section MUST be derived from the same internal scope result (same change, same `--no-search`). The CLI MUST NOT run a second repository search to build history. `--no-search` MUST yield empty `seeds` and empty `history`. History seed selection and co-change filters MUST match `osi history`.

#### Scenario: --no-search skips file evidence

- **WHEN** the operator runs `osi --no-search impact add-renewal-status`
- **THEN** the CLI exits 0
- **AND** `seeds` is empty
- **AND** `history` is empty

#### Scenario: Named seed in default YAML

- **WHEN** internal scope would emit `src/pages/tenant/TenantList.tsx` as a named high because of term `TenantList`
- **AND** the fixture git repo pairs that file with `src/services/tenant.ts` in two qualifying commits
- **THEN** `seeds` includes `src/pages/tenant/TenantList.tsx`
- **AND** `history` includes a `co_change` row for `src/services/tenant.ts` via that seed
