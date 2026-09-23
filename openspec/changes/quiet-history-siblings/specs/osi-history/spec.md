## MODIFIED Requirements

### Requirement: History expands co-change inside one git root

For each seed the CLI MUST find the nearest enclosing git directory for that file (walking up from the file, not only the OpenSpec project root). Co-change MUST count other files that appear in the same non-merge commits as the seed, using paths relative to that git root, then emit workspace-relative posix paths. The CLI MUST NOT treat files from two different git repositories as co-changed. A seed with no enclosing git directory MUST remain in `seeds` and MUST NOT produce `history` rows.

Commits MUST be limited to the last 18 months. Merge commits MUST be ignored. Commits that touch more than 30 files MUST be ignored. A co-change neighbor MUST appear in at least 2 counted commits with the seed. The CLI MUST emit at most 10 co-change rows per seed. Tests matching `osi scope` test-path rules MUST NOT appear in `history` (they MAY appear under a future tests list; this command omits them). OpenSpec paths MUST NOT appear in `history`.

The CLI MUST compute the same per-seed `others` count that `osi impact` emits on `refs`, from the same scope pass that selected the seeds, and MUST NOT run a second repository search to do so. `osi history` MUST NOT print `refs`. When that `others` count is greater than or equal to 30, including when the term is wide and `others` is greater than 80, the CLI MUST NOT run co-change for that seed and MUST NOT emit sibling rows for that seed.

When `others` is less than 30 and that seed's co-change result is empty (before the global row limit), the CLI MUST emit same-directory sibling rows, at most 4 for that seed. Same directory means the parent directory is the same. The CLI MUST NOT emit every file in that directory. A sibling row MUST have `reason: sibling`, `commits: 0`, and `via` set to the seed path. The CLI MUST keep a candidate only when it is one of these:

- **Stem.** Remove a trailing `Details` or else a trailing `Detail` from the seed filename stem (case-sensitive, one suffix). If the remainder is empty, the stem rule matches nothing. Otherwise a same-directory file matches when its stem equals the remainder or starts with the remainder. `ReturnVisitDetails.vue` matches `ReturnVisit.vue`.
- **Sample.** The path is in that seed's `refs.sample` (at most 8 paths, as defined for `osi impact`) and the parent directory is the same.

The seed path itself MUST NOT be a sibling. A path MUST NOT be repeated for the same seed. Stem matches MUST be kept before sample matches; within each group, path order applies; then the CLI MUST keep at most 4. A same-directory file whose stem merely contains `Detail` MUST NOT be emitted unless it also matches the stem rule or the sample rule. A same-directory file whose name does not match either rule (for example `MaintenanceRecord.vue` beside `ReturnVisitDetails.vue`) MUST NOT be emitted.

Sibling rows count only after that seed has zero co-change rows. The CLI MUST NOT add sibling rows to fill in for a commit that touched more than 30 files. Co-change rows and sibling rows go in one `history` list. The CLI MUST order that list by `commits` descending then `path`, then emit at most 50 rows. Because sibling `commits` are 0 and co-change `commits` are at least 2, co-change rows come first. When co-change rows already fill 50, sibling rows are omitted. The CLI MUST NOT raise this total above 50.

Each history entry MUST have `path`, `via` (the seed path), `commits` (an integer), and `reason` (`co_change` or `sibling`). The CLI MUST NOT assign `confidence` or claim the neighbor must change.

#### Scenario: Same-repo neighbor is emitted

- **WHEN** a fixture git repo contains seed `src/pages/tenant/TenantList.tsx` and `src/services/tenant.ts` together in two non-wide, non-merge commits within 18 months
- **THEN** `history` includes an entry whose `path` is `src/services/tenant.ts`
- **AND** `via` is `src/pages/tenant/TenantList.tsx`
- **AND** `reason` is `co_change`
- **AND** `commits` is at least 2

#### Scenario: Nested repo is not mixed with the workspace root

- **WHEN** a seed path is `pkg-a/src/A.ts` and only `pkg-a/` contains `.git`
- **THEN** co-change is computed only from commits in `pkg-a`
- **AND** files that exist only in a sibling git repo are absent from `history`

#### Scenario: Wide commit is ignored

- **WHEN** the only shared commit between a seed and another file touches more than 30 files
- **AND** no other qualifying commits pair them
- **THEN** that other file is absent from `history` as a `co_change` row
- **AND** the CLI does not keep that commit in order to manufacture a neighbor

#### Scenario: Qualifying co-change does not add a sibling

- **WHEN** a seed has at least one qualifying co-change row
- **AND** the same directory also contains a file that matches the stem rule
- **AND** that file is not itself a qualifying co-change neighbor
- **THEN** `history` includes the co-change row
- **AND** `history` has no `sibling` row for that seed

#### Scenario: Empty co-change adds the stem sibling

- **WHEN** seed `src/pages/house/ReturnVisitDetails.vue` has `others` less than 30
- **AND** that seed has no qualifying co-change row
- **AND** `src/pages/house/ReturnVisit.vue` is in the same directory
- **THEN** `history` includes `src/pages/house/ReturnVisit.vue`
- **AND** `via` is `src/pages/house/ReturnVisitDetails.vue`
- **AND** `reason` is `sibling`
- **AND** `commits` is 0

#### Scenario: Unrelated list name is not a sibling

- **WHEN** seed `src/pages/house/ReturnVisitDetails.vue` has no qualifying co-change row
- **AND** `src/pages/house/MaintenanceRecord.vue` is in the same directory
- **AND** that path is not in the seed's `sample`
- **THEN** `MaintenanceRecord.vue` is absent from `history`

#### Scenario: Noisy seed is not expanded

- **WHEN** a seed's `others` count is greater than or equal to 30, whether or not `wide` is true
- **AND** qualifying co-change commits exist
- **AND** a same-directory stem match exists
- **THEN** that seed has no `co_change` row and no `sibling` row

#### Scenario: Global cap keeps co-change ahead of siblings

- **WHEN** co-change rows and sibling rows are both present across seeds
- **THEN** every emitted `co_change` row has `commits` greater than every emitted `sibling` row
- **AND** `history` has at most 50 rows

### Requirement: History prints version 1 YAML to stdout

On success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `seeds`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`. Each seed MUST be a path string. The CLI MUST NOT print this document as `osi scope` output and MUST NOT write it into the change directory. The CLI MUST NOT print JSON.

#### Scenario: Successful YAML shape

- **WHEN** `osi history add-renewal-status` succeeds against the fixture
- **THEN** stdout is YAML with `version: 1`
- **AND** top-level keys are `version`, `change`, `seeds`, `history`
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history is success

- **WHEN** named seeds exist, no neighbor meets the co-change commit threshold, and no sibling candidate qualifies
- **THEN** the CLI exits 0
- **AND** stdout YAML has `history: []` (or an equivalent empty sequence)

### Requirement: History does not perform impact analysis

The CLI MUST NOT use blame, commit-message similarity, dependency graphs, ASTs, or a language model to choose neighbors or conclude impact. Co-change counts are the only git signal in this command. Sibling rows are not a git signal. The CLI MUST choose them only by the same-directory stem and sample rules in this spec.

#### Scenario: No blame in the pipeline

- **WHEN** `osi history` runs against a fixture git repo
- **THEN** `co_change` neighbors are determined only from same-commit file lists and the filters in this spec
- **AND** `sibling` neighbors are determined only from the same-directory stem and sample rules
- **AND** the command does not use blame, an AST, or a dependency graph
