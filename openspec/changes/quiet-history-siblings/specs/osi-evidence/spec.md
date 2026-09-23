## MODIFIED Requirements

### Requirement: Pipeline YAML nests scope and history

On pipeline success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `seeds`, `refs`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`. `seeds` and `history` MUST use the same per-item shape as `osi history` (`path`, `via`, `commits`, and `reason` `co_change` or `sibling` on history rows). `refs` MUST follow the usage-refs requirement in this spec. The CLI MUST NOT print `scope`, `concepts`, `candidates`, or `tests` on this document. The CLI MUST NOT assign `confidence` to history rows and MUST NOT write this document into the change directory.

#### Scenario: Successful YAML shape

- **WHEN** `osi impact add-renewal-status` succeeds against the fixture
- **THEN** stdout YAML has `version: 1`
- **AND** top-level keys are `version`, `change`, `seeds`, `refs`, `history`
- **AND** stdout does not contain a top-level `scope:` or `candidates:` key
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history section is success

- **WHEN** the pipeline finds named seeds, no neighbor meets the co-change threshold, and no sibling candidate qualifies
- **THEN** the CLI exits 0
- **AND** `history` is an empty sequence

#### Scenario: Sibling row uses the history shape

- **WHEN** `osi history` would emit a `sibling` row for a seed
- **THEN** `osi impact` history includes that same row
- **AND** `reason` is `sibling`
- **AND** `commits` is 0

### Requirement: Pipeline reuses one scope pass

The history section and the `refs` section MUST be derived from the same internal scope result (same change, same `--no-search`). The CLI MUST NOT run a second repository search to build history or `refs`. `--no-search` MUST yield empty `seeds`, empty `refs`, and empty `history`. History seed selection, the `others` gate, co-change filters, and sibling rules MUST match `osi history`.

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
