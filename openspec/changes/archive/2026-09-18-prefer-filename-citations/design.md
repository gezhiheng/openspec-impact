## Context

See proposal.md for motivation. `toSearchConcepts` currently sorts strong searchable citations by `text.length` descending and `slice(0, SEARCH_TERM_CAP)` (80). `selectSeeds` keeps named highs, max 5 per git root, sorted by `namedMatchLength` then path. `SEARCH_TERM_CAP` stays 80.

## Goals / Non-Goals

**Goals:**

- Cited `*.vue` / `*.xml` / `*.java` (whitelist) survive the cap even when shorter than dotted APIs.
- `BillApi.getBillCode` still yields search term `BillApi`.
- Cited named files remain history seeds when a git root has more than 5 named highs.

**Non-Goals:**

- Do not change harvest (what gets extracted).
- Do not glob the tree for suffixes.
- Do not raise `SEEDS_PER_ROOT` for the non-cited remainder.

## Decisions

### 1. Bucket inside `toSearchConcepts`, not a second rg pass

- **Choice**: Partition the existing citation list. Concatenate file bucket + type bucket + remainder-by-length, `slice(0, SEARCH_TERM_CAP)`, then append kebab path-only as today. For `PascalCase.member`, if the concept’s `search_terms` is `[full]`, also push `PascalCase` onto `search_terms` (or add a sibling concept). Shared helpers: `isFileCitation(text)`, `isTypeCitation(text)` used by seeds too.
- **Why**: One cap, one search. File bucket on the QFT change is ~6 entries.
- **Alternative**: Reserved N slots for files — extra magic number. Rejected.
- **Alternative**: Scan `*.vue` — not a citation. Rejected.

### 2. File vs type vs leftover

- **File**: `^[^/\s]+\.(vue|tsx|ts|jsx|java|xml|rs|go)$` (case-insensitive). No `.js`.
- **Type**: `^[A-Z][A-Za-z0-9]+$` or `^[A-Z][A-Za-z0-9]+\.[A-Za-z][A-Za-z0-9]*$`. Reject SQL leftovers `LIKE`/`WHERE`/`DISTINCT` via existing `SQL_NOISE` / never-search if they appear as whole citation text; `ResultT` stays a type (harmless extra term).
- **`Type.method` extra term**: left segment only, not `getBillCode` (too many method hits).

### 3. Must-keep seeds share the same predicates

- **Choice**: A named high is cited if some `path_match`/`symbol_match` reason term’s basename/stem equals a file citation or type citation (or the type left-segment). All cited named highs are kept per git root; remaining named highs fill up to 5, sorted by `path` only.
- **Why**: Same definition as search buckets; Mapper.xml length cannot evict `CheckoutReportSourceBranch`.
- **Alternative**: Raise 5 to 15 — still evicts short names if sort is by length. Rejected as the primary fix.

### 4. Tests

- **Choice**: Extend `tests/harvest.test.ts` with a synthetic harvested list (80+ long strings + short `.vue` + `BillApi.getBillCode`) asserting `toSearchConcepts` keeps them. Extend history tests with fake candidates: five long named highs + cited Vue in one git root → Vue still in `historyFromScope` seeds. Do not dogfood QFT in CI.

## Risks / Trade-offs

- [Many PascalCase citations fill the cap before HTTP paths] → Accept; those are the named types. HTTP stays remainder.
- [Must-keep can exceed 5 seeds/root and git log cost] → Bounded by how many file/type names the spec actually wrote. ponytail: if a spec cites 40 classes, pay 40 logs or cap later.
- [`List.vue` as a file citation is generic] → Harvested only if spec wrote it; do not special-case.

## Migration Plan

- Rebuild `osi`. Layer YAML keys unchanged.
- Rollback: revert; large specs again drop short filenames.
