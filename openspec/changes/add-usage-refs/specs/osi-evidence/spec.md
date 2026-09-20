## MODIFIED Requirements

### Requirement: Default invocation runs the evidence pipeline

When the first positional argument is `impact`, the CLI SHALL treat the next positional as a change identifier or path and run the evidence pipeline: locate the same live OpenSpec change as `osi scope`, produce scope internally (typed search), then the history layer from that result. `osi impact` with no change, extra positionals, or a bare change id with no verb MUST be a usage error: non-zero exit, stderr help, no YAML on stdout. Locate failure MUST exit non-zero, explain on stderr, and MUST NOT print YAML on stdout. `osi scope <change>` and `osi history <change>` MUST remain available. `osi init` MUST remain available and MUST NOT run the evidence pipeline. `osi scope` MUST keep its existing top-level YAML shape (`concepts`, `candidates`, `tests`). `osi history` MUST keep `version`, `change`, `seeds`, `history` and MUST NOT print `refs`. A live change whose id is `impact` or `init` is reachable only as a path (`openspec/changes/impact`).

#### Scenario: Change id runs the pipeline

- **WHEN** the operator runs `osi impact add-renewal-status` from a project that contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change
- **AND** stdout is the evidence YAML with `seeds`, `refs`, and `history` (not the `osi scope` document)

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
- **AND** stdout is not the evidence YAML

### Requirement: Pipeline YAML nests scope and history

On pipeline success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `seeds`, `refs`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`. `seeds` and `history` MUST use the same per-item shape as `osi history` (`path`, `via`, `commits`, `reason: co_change` on history rows). `refs` MUST follow the usage-refs requirement in this spec. The CLI MUST NOT print `scope`, `concepts`, `candidates`, or `tests` on this document. The CLI MUST NOT assign `confidence` to history rows and MUST NOT write this document into the change directory.

#### Scenario: Successful YAML shape

- **WHEN** `osi impact add-renewal-status` succeeds against the fixture
- **THEN** stdout YAML has `version: 1`
- **AND** top-level keys are `version`, `change`, `seeds`, `refs`, `history`
- **AND** stdout does not contain a top-level `scope:` or `candidates:` key
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history section is success

- **WHEN** the pipeline finds named seeds but no neighbor meets the co-change threshold
- **THEN** the CLI exits 0
- **AND** `history` is an empty sequence

### Requirement: Pipeline reuses one scope pass

The history section and the `refs` section MUST be derived from the same internal scope result (same change, same `--no-search`). The CLI MUST NOT run a second repository search to build history or `refs`. `--no-search` MUST yield empty `seeds`, empty `refs`, and empty `history`. History seed selection and co-change filters MUST match `osi history`.

#### Scenario: --no-search skips file evidence

- **WHEN** the operator runs `osi --no-search impact add-renewal-status`
- **THEN** the CLI exits 0
- **AND** `seeds` is empty
- **AND** `refs` is empty
- **AND** `history` is empty

#### Scenario: Named seed in default YAML

- **WHEN** internal scope would emit `src/pages/tenant/TenantList.tsx` as a named high because of term `TenantList`
- **AND** the fixture git repo pairs that file with `src/services/tenant.ts` in two qualifying commits
- **THEN** `seeds` includes `src/pages/tenant/TenantList.tsx`
- **AND** `history` includes a `co_change` row for `src/services/tenant.ts` via that seed

## ADDED Requirements

### Requirement: Evidence YAML includes per-seed usage refs

`osi impact` MUST emit one `refs` item per `seeds` path, in the same order as `seeds`. Each item MUST have `path` (the seed), `term`, `others` (integer), `wide` (boolean), and `sample` (a sequence of posix workspace-relative paths). `term` MUST be a named `path_match` or `symbol_match` reason for that seed (the term matches the file basename or stem). When several named reasons exist, `term` MUST be the filename stem if that stem is among them; otherwise the basename; otherwise the longest named reason.

`others` MUST be the number of distinct non-seed source files whose post-wide-drop hit has `content_match` or `symbol_match` for that `term`. The count MUST use the repository hit map after the 80-file wide-content drop and before ranking, low-confidence omission, and per-repo cap. Files that match `osi scope` test-path rules MUST NOT count toward `others` and MUST NOT appear in `sample`. The seed path MUST NOT count toward `others`. `path_match`-only files MUST NOT count.

When that `term` exceeded 80 distinct content/symbol files (the frozen wide-content cap), `wide` MUST be `true`, `others` MUST be that pre-drop count (greater than 80), and `sample` MUST be empty. Otherwise `wide` MUST be `false`, and `sample` MUST list at most 8 of the counted files, sorted alphabetically by path.

The CLI MUST NOT parse imports or ASTs. The CLI MUST NOT fold `others` into `confidence`. Empty `seeds` MUST yield `refs: []` (or an equivalent empty sequence).

#### Scenario: Shared name has others and sample

- **WHEN** seed `src/components/PermButton.vue` is named by term `PermButton`
- **AND** twelve other non-test source files have a `content_match` or `symbol_match` for `PermButton` after the wide-content drop
- **THEN** `refs` contains an item whose `path` is that seed
- **AND** `term` is `PermButton`
- **AND** `others` is 12
- **AND** `wide` is false
- **AND** `sample` has at most 8 of those paths, sorted alphabetically

#### Scenario: Wide term has empty sample

- **WHEN** seed `src/components/table/VTable.vue` is named by term `VTable`
- **AND** `VTable` occurs as content or symbol in more than 80 files
- **THEN** that seed's `refs` item has `wide: true`
- **AND** `others` is greater than 80
- **AND** `sample` is empty

#### Scenario: Local name has zero others

- **WHEN** seed `src/pages/tenant/TenantList.tsx` is named by term `TenantList`
- **AND** no other non-test source file has a `content_match` or `symbol_match` for `TenantList` after the wide-content drop
- **THEN** that seed's `refs` item has `others: 0`
- **AND** `wide` is false
- **AND** `sample` is empty

#### Scenario: Test files are not counted

- **WHEN** `src/pages/tenant/TenantList.test.tsx` contains `TenantList`
- **AND** that path matches `osi scope` test-path rules
- **THEN** that test path is absent from `others` and from `sample` for the `TenantList` seed
