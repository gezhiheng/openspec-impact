## Context

See proposal.md for motivation. Default `osi <change>` currently wraps `runScope` in nested YAML (`scope.candidates` / `tests` included). Harvest still runs kebab unigrams + heading n-grams + `PATH_ONLY`, then typed file/type buckets on top.

## Goals / Non-Goals

**Goals:**

- Default stdout === `osi history` document shape.
- Search terms = typed citations minus proposal out-of-scope citations.
- `osi scope` still dumps candidates for debugging.

**Non-Goals:**

- Do not delete the `scope` subcommand.
- Do not glob `*.vue` or parse ASTs.
- Do not put a `type:` field on YAML concepts.

## Decisions

### 1. Default CLI prints `toHistoryYaml`

- **Choice**: `runEvidence` returns `HistoryDocument`; `main` uses `toHistoryYaml`. Delete nested `toEvidenceYaml` (or leave unused and remove). `--include-low` is ignored on the default path (history never printed lows).
- **Why**: Matches “only seeds + history”. No second schema.
- **Alternative**: Keep `scope:` with empty candidates — still noise. Rejected.

### 2. Replace bag harvest, keep one `searchConcepts`

- **Choice**: Stop calling `kebabPieces` and `phrasesFromTokens` for headings / What Changes / Impact. Harvest marked spans + prose paths + `[repo]` tokens. Classify each span: `repo` | `path` | `symbol` | `api` | `perm`. `toSearchConcepts` emits search terms only for path/symbol/api/perm (plus `Type` left of `Type.member`). Repo is stored only as a prefix hint (optional: if a path citation lacks a first segment, prepend the nearest `[repo]` on the same tasks line). Do not query `qft-app` as content.
- **Why**: Same rg pipeline; fewer terms. No new matcher.
- **Alternative**: Per-type indexes — extra code. Rejected.

### 3. Out-of-scope deny list

- **Choice**: From `proposal.md`, take (a) sections whose heading matches `Out of scope` / `不在范围` / `明确不修` / `本期不修`, (b) list items under What Changes / Impact whose text matches those phrases. Run the same typed harvest on that slice → deny set. Search terms whose exact `text` is in deny are dropped. `TenantCheckOutPact` in-scope is not dropped because `TenantCheckOutPact.loadDynamicHeaders` is a different string.
- **Why**: Exact string subtract; no NLP.
- **Alternative**: Drop any file whose basename appears in out-of-scope — would kill the Vue page when the unfixed slot bug cites it. Rejected.

### 4. Tests

- **Choice**: Fixture proposal gets an Out of scope bullet with a fake `` `NoiseUtil.ts` ``; in-scope keeps `` `TenantList` ``. Assert default CLI has no `candidates:`, harvest does not search `renewal status` expansions or change-id `sync`, and `NoiseUtil.ts` is absent from search terms. Update evidence tests that expected `scope:`.

## Risks / Trade-offs

- [Mini-repo What Changes has no backticks except Impact `TenantList`] → seeds still work via `TenantList`. If a future change writes only prose, seeds go empty — that is the point of typed extract.
- [Permission codes collide with SQL `COUNT`] → perm requires an underscore (`_[A-Z0-9]+`).
- [Repo prefix unused if tasks omit `[qft-app]`] → path citations already carry `qft-app/...`.

## Migration Plan

- Rebuild `osi`. Skill parsers that read `scope:` on the default command must switch to `seeds` / `history`.
- Rollback: revert this change.
