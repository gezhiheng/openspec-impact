# osi-history Specification

## Purpose

Lets an operator or Skill run `osi history` on one OpenSpec change and receive named scope seeds plus same-repo git co-change neighbors, as evidence only, without the CLI judging impact or altering `osi scope` confidence.

## Requirements

### Requirement: History command locates a live OpenSpec change

The CLI SHALL provide `osi history <change>` where `<change>` is a change identifier or path, using the same OpenSpec nearest-root and live-change rules as `osi scope`. Locate failure MUST exit non-zero, explain on stderr, and MUST NOT print YAML on stdout.

#### Scenario: Identifier in a live change directory

- **WHEN** the operator runs `osi history add-renewal-status` from a project that contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change and continues

#### Scenario: Unknown identifier

- **WHEN** the operator runs `osi history does-not-exist` and no live change directory matches
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

### Requirement: History selects named high seeds from scope

The CLI MUST obtain candidates by running the same scope pipeline as `osi scope <change>` (including default search). It MUST keep a candidate as a seed only when `confidence` is `high` and a `path_match` or `symbol_match` reason term matches the file basename or filename stem (a **named** hit). It MUST NOT use table-name or other non-named high hits as seeds.

A named high candidate is **cited** when a reason term equals the file basename or stem, or equals a file-citation / PascalCase type citation as defined for search-term selection (including the `PascalCase` left segment of `Type.member`). Cited named highs MUST appear in `seeds` for their git root even when that would exceed 5 seeds in that root. For other named highs the CLI MUST keep at most 5 per git root, ordered by path, and MUST NOT prefer longer matching terms over shorter cited names. If no named high candidates exist, the CLI MUST still exit 0 and print YAML with empty `seeds` and empty `history`.

#### Scenario: Named file is a seed

- **WHEN** scope would emit `src/pages/tenant/TenantList.tsx` as high because of term `TenantList`
- **THEN** `seeds` includes `src/pages/tenant/TenantList.tsx`

#### Scenario: Unnamed high is not a seed

- **WHEN** a high candidate matches only a snake_case table-like term that is not the file basename or stem
- **THEN** that path is absent from `seeds`

#### Scenario: Cited Vue is kept when five other named files exist in the same git root

- **WHEN** a git root has five named high files whose matching terms are longer than `TenantCheckOutPact.vue`
- **AND** `TenantCheckOutPact.vue` is a named high cited by that basename
- **THEN** `seeds` still includes that Vue path

#### Scenario: Cited Java type is not evicted by a longer Mapper filename

- **WHEN** `CheckoutReportSourceBranch` is a named high because the stem matches that PascalCase citation
- **AND** the same git root also has named highs for longer file citations such as `ReletCheckOutReportIncludeMapper.xml`
- **THEN** `seeds` includes the `CheckoutReportSourceBranch` path

### Requirement: History expands co-change inside one git root

For each seed the CLI MUST find the nearest enclosing git directory for that file (walking up from the file, not only the OpenSpec project root). Co-change MUST count other files that appear in the same non-merge commits as the seed, using paths relative to that git root, then emit workspace-relative posix paths. The CLI MUST NOT treat files from two different git repositories as co-changed. A seed with no enclosing git directory MUST remain in `seeds` and MUST NOT produce `history` rows.

Commits MUST be limited to the last 18 months. Merge commits MUST be ignored. Commits that touch more than 30 files MUST be ignored. A neighbor MUST appear in at least 2 counted commits with the seed. The CLI MUST emit at most 10 history rows per seed and at most 50 history rows in total, ordered by `commits` descending then `path`. Tests matching `osi scope` test-path rules MUST NOT appear in `history` (they MAY appear under a future tests list; this command omits them). OpenSpec paths MUST NOT appear in `history`.

Each history entry MUST have `path`, `via` (the seed path), `commits` (integer support count), and `reason: co_change`. The CLI MUST NOT assign `confidence` or claim the neighbor must change.

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
- **THEN** that other file is absent from `history`

### Requirement: History prints version 1 YAML to stdout

On success the CLI MUST print a single YAML document to stdout with exactly these top-level keys: `version`, `change`, `seeds`, `history`. `version` MUST be `1`. `change` MUST have `name` and `path` as in `osi scope`. Each seed MUST be a path string. The CLI MUST NOT print this document as `osi scope` output and MUST NOT write it into the change directory. The CLI MUST NOT print JSON.

#### Scenario: Successful YAML shape

- **WHEN** `osi history add-renewal-status` succeeds against the fixture
- **THEN** stdout is YAML with `version: 1`
- **AND** top-level keys are `version`, `change`, `seeds`, `history`
- **AND** `change.name` is `add-renewal-status`

#### Scenario: Empty history is success

- **WHEN** named seeds exist but no neighbor meets the commit threshold
- **THEN** the CLI exits 0
- **AND** stdout YAML has `history: []` (or an equivalent empty sequence)

### Requirement: History does not perform impact analysis

The CLI MUST NOT use blame, commit-message similarity, dependency graphs, ASTs, or a language model to choose neighbors or conclude impact. Co-change counts are the only git signal in this command.

#### Scenario: No blame in the pipeline

- **WHEN** `osi history` runs against a fixture git repo
- **THEN** neighbors are determined only from same-commit file lists and the filters in this spec
