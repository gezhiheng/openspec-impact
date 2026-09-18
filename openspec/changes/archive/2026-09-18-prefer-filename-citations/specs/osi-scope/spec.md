## ADDED Requirements

### Requirement: Search-term cap prefers filename and type citations

When default repository search cannot query every harvested citation, the CLI MUST fill the search-term budget in this order, then stop at the existing cap:

1. **File citations**: a strong citation whose `text` is a single path segment (no `/` or whitespace) ending in an implementation suffix `.vue` `.tsx` `.ts` `.jsx` `.java` `.xml` `.rs` or `.go`. Citations ending in `.js` `.md` `.sql` or similar MUST NOT enter this bucket.
2. **Type citations**: a strong citation that is a `PascalCase` identifier, or a `PascalCase.member` token from which the CLI also searches the `PascalCase` left segment. `ss.remark`, `row.sign`, and other lowercase-left dotted fields MUST NOT enter this bucket.
3. **Remainder**: other searchable citations, longest `text` first (HTTP `METHOD /path` strings live here).

The CLI MUST still query kebab path-only unigrams from the change id after these citations. It MUST NOT scan the repository with glob patterns such as `*.vue` in place of harvested citations.

#### Scenario: Short Vue filename is searched before a longer dotted member

- **WHEN** harvested citations include both `TenantCheckOutPact.vue` and a longer string `TenantCheckOutPact.loadDynamicHeaders`
- **AND** the search-term cap cannot keep every citation
- **THEN** `TenantCheckOutPact.vue` is among the queried search terms

#### Scenario: CheckoutStatistics.vue is not dropped for length

- **WHEN** harvested citations include `CheckoutStatistics.vue` (22 characters) and many longer API or dotted strings
- **AND** the search-term cap is 80
- **THEN** `CheckoutStatistics.vue` is among the queried search terms

#### Scenario: Type.method keeps the type name

- **WHEN** a document contains `` `BillApi.getBillCode` ``
- **THEN** default search includes a term `BillApi`

#### Scenario: Script suffix is not a file citation

- **WHEN** harvested citations include `tenant-check-out-config.js` and `CheckoutStatistics.vue`
- **AND** the search-term cap cannot keep every citation
- **THEN** `CheckoutStatistics.vue` is preferred over `tenant-check-out-config.js` for the file-citation budget
