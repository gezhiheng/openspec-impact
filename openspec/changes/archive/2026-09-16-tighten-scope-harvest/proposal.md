## Why

`osi scope` on a real QFT change harvests SQL fragments, change-id n-grams, and generic unigrams (`id`, `IFNULL`, `sync`). Default-off `--search` then either does nothing useful or, if enabled, greps the whole workspace with that list. Phase 1’s point is candidate files with evidence; dirty terms make search a liability, so agents still grep.

## What Changes

- Tighten harvest so YAML `concepts` (and the internal search-term set) prefer **citations** (backticked identifiers, paths, APIs, table/class names) over change-id 2–3 grams and SQL/generic tokens.
- Expand the closed never-search / path-only lists for tokens that exploded in dogfood (`sync`, `report`, `checkout`, `variable`, SQL verbs/functions, `.env`, `id` as a standalone term).
- **BREAKING**: repository search becomes the default for `osi scope <change>`. `--search` is removed; `--no-search` is the debug hatch that prints concepts with empty `candidates` / `tests`.
- Default search uses only **searchable** harvested terms (citations and remaining domain phrases), not path-only unigrams as content queries (already true) and not dropped noise.

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-scope`: Harvest and default search behavior of `osi scope` — which concepts are emitted, which terms are queried, and whether the repo is scanned without an extra flag.

## Impact

- **In scope**: `src/search/terms.ts` (and closed lists), `src/commands/scope.ts` / `src/cli.ts` argv, tests and fixture markdown if harvest expectations change. YAML top-level keys stay `version: 1`.
- **Out of scope**: git history / co-change, deps/AST, JSON/`--format`, writing files into the change, CJK–English dictionary, `--repo` / split OpenSpec vs code roots, Skill text.
- **Compatibility**: scripts that relied on concepts-only output without `--search` will start scanning the repo. Scripts that passed `--search` must drop it (unknown flag) or switch to no flag.
- **Deps**: none.
