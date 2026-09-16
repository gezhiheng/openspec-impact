## Context

See proposal.md for motivation. `osi scope` already harvests in `src/search/terms.ts` and searches in `src/search/repository.ts`. CLI `--search` defaults off, which contradicts the original `osi-scope` spec (search on `osi scope <change>`). This change only retunes harvest filters and argv; YAML keys stay `version: 1`.

## Goals / Non-Goals

**Goals:**

- Closed-list + cheap token shape checks in `harvestMarked` / kebab splitting so QFT-style SQL backticks and change-id n-grams never become concepts or search terms.
- Restore default search; keep a debug hatch that skips `searchConcepts`.
- Keep fixture `add-renewal-status` green: `TenantList` from backticks, `renewal status` from What Changes, path-only `filter` behavior unchanged.

**Non-Goals:**

- Do not parse SQL, extract column names from rejected backticks, or add a CJK stop list.
- Do not change ranking, rg invocation, or YAML shape.
- Do not add `--repo` or git history.

## Decisions

### 1. Directory names: unigrams only

- **Choice**: `kebabPieces` adds each hyphen piece as a unigram (never/path-only/domain as today) and does **not** call `phrasesFromTokens`. Headings and proposal sections still n-gram via `phrasesFromTokens`.
- **Why**: Change ids like `sync-variable-sublease-checkout-report` were the source of `sync variable sublease`. Spec dirs such as `tenant` remain domain unigrams.
- **Alternative**: Keep n-grams but demote them to path-only — still pollutes `concepts` and path ranking.

### 2. Reject SQL-ish and empty citations in `harvestMarked`

- **Choice**: After trim, drop a backtick/bold span when any of: contains `=`; case-insensitive whole-token match against the spec SQL-noise set; the span is only digits/punctuation (no letter); POSIX path whose first segment is `openspec`; after stripping a leading `.`, the remainder is never-search (`env` covers `.env`). Identifier citations (`TenantList`, `qft_tenants_relet.id`, `GET /api/...`) are unchanged (`search_terms` = `[token]`, no re-case).
- **Why**: Observable spec cases without an SQL parser. `=` catches `relet_type = 2` and `sign_status = 1`.
- **Alternative**: Pull `qft_tenants_relet` out of long SQL backticks — deferred; docs that cite the table alone still harvest it.

### 3. Closed lists only (extend, don’t infer)

- **Choice**: Append spec never-search / path-only / SQL-noise sets in `terms.ts`. Path-only still never content/symbol-queries (`conceptRoleForTerm` unchanged).
- **Why**: Same contract as Phase 1; dogfood tokens that were generic English (`sync`, `report`, `checkout`, `variable`, `id`) belong on those lists, not in heuristics.
- **Alternative**: Frequency-based dropping — non-deterministic across docs.

### 4. Argv: default search, `--no-search`, reject `--search`

- **Choice**: `parseArgv` defaults `search: true`. `--no-search` sets false. `--search` stays an unknown flag (existing branch). `runScope` already treats omitted `search` as on (`!== false`); CLI must pass the parsed boolean through.
- **Why**: Matches the original spec and proposal BREAKING note. Unknown `--search` is the migration signal.
- **Alternative**: Keep `--search` as a no-op alias — hides the break and duplicates flags.

## Risks / Trade-offs

- [SQL backticks that only name a table without `=` still harvest, including long DDL] → Accept; table names are useful seeds. Revisit if dogfood still dumps indexes.
- [CJK-only display strings in backticks remain] → Spec does not drop them; no translator. Watch `--no-search` YAML on QFT.
- [Path-only `checkout` / `sync` hide useful path hits if a file is named only that] → Medium path_match still works; content grep for those unigrams was the bug.
- [Default search on huge workspaces is slower than today’s concepts-only] → That is the intended product; `--no-search` for harvest debugging.

## Migration Plan

- Rebuild `osi`; no YAML version bump.
- Callers using bare `osi scope <id>` start scanning. Callers passing `--search` must drop the flag.
- Rollback: revert the change; lists and argv return to Phase 1.
