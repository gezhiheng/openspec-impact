## Why

Large changes harvest more citations than the search-term cap. Filling that cap by string length drops short file names (`TenantCheckOutPact.vue`) in favor of longer dotted/API strings, so history seeds miss the pages the spec actually named. A second cut (5 named seeds per git root, longest match first) then drops cited classes in favor of long Mapper/Impl names.

## What Changes

- When default search trims citations to the term cap, fill in this order: source-file citations (basename + implementation suffix), then PascalCase type names (including the left segment of `Type.method`), then the remaining citations by length as today.
- Do not boost `.js` / `.md` / `.sql` / HTTP paths into the file bucket (those were the false-high scripts and APIs).
- History **must-keep** a named high candidate whose basename or stem matches a file-citation or Pascal type citation. The 5-per-git-root cap applies only to other named highs. Stop using match-term length as the primary seed sort.
- No new command, no AST, no raising the numeric cap unless the buckets still overflow after this order.

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-scope`: Default search-term selection MUST prefer filename and type citations before filling the remaining cap by length.
- `osi-history`: Named-seed selection MUST keep cited files/types; the per-root cap MUST NOT evict them. (Live seed requirement is in `add-osi-history` until that change is archived.)

## Impact

- **In scope**: `toSearchConcepts` bucket order + optional `Type.method` → `Type` extra term; `selectSeeds` must-keep + sort; unit tests on harvest fixtures (no QFT checkout).
- **Out of scope**: new repo-wide `*.vue` scan, changing `SEARCH_TERM_CAP` itself, `osi evidence` YAML shape, ranking `confidence` formula, AST/deps.
- **Compatibility**: same CLI and YAML keys; different files may appear in `candidates` / `seeds` on large specs.
- **Deps**: none.
