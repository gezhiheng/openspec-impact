## Why

Default `osi <change>` on a QFT-style workspace takes tens of seconds. Harvest and Node startup are tens of milliseconds; git co-change is a few seconds. The rest is repository search: exclude globs only match at the OpenSpec root (nested `node_modules` / `.git` / `dist` still scanned), Impact list labels such as `**Tenant**` / `**Permission**` become type queries, and `searchConcepts` then rereads the union of those hits and tests every term against every file.

## What Changes

- Treat search exclude names (`node_modules`, `.git`, `dist`, and the rest of the existing list) as path segments at **any** depth, including in `rg` globs, not only as directories at the project root.
- Do not harvest markdown list-item field labels (`- **Tenant**:`, `- **Permission**:`) as typed citations. Path/symbol/api/perm citations in backticks stay.
- Attribute content/symbol hits from the searcher's match lines (or an equivalent per-term file list). Do not read every union file and scan it for every term.
- If one term content-matches more files than a frozen hit cap, keep `path_match` for that term and drop its content/symbol reasons.
- No new command, YAML keys, or Rust rewrite. Git co-change stays sequential.

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-scope`: Repository search MUST exclude listed directories at any path depth; harvest MUST NOT treat Impact-style list labels as citations; content/symbol matching MUST NOT be `union-files × all-terms` full-file reads; a per-term content hit cap MUST apply.

## Impact

- **In scope**: `src/search/repository.ts` (globs, `searchConcepts`), `src/search/terms.ts` (list-label skip), unit tests on harvest labels / exclude depth / wide-term cap. Default `osi` / `osi scope` get faster because they share this search.
- **Out of scope**: rewriting the CLI in Rust, parallel `git log`, changing YAML keys or `confidence` formula, raising `SEARCH_TERM_CAP`, AST/deps.
- **Compatibility**: same CLI and YAML shape. Candidate lists MAY shrink (shared-component content hits and Impact labels go away); that is intended.
- **Deps**: none. Still prefers `rg` when present.
