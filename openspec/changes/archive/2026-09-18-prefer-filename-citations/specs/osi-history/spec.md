## MODIFIED Requirements

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
