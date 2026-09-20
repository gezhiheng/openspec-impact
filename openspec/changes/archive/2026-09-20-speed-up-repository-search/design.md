## Context

See proposal.md for motivation. `searchConcepts` in `src/search/repository.ts` lists files with `rg --files` / a walk, path-matches in JS, then `rg -F -l -f` for a union, then `readFileSync` + `symbolMatches` / `contentMatches` for every union file × every term. `rgGlobs()` emits `!node_modules/**` (root-only). Typed harvest in `src/search/terms.ts` still takes bold spans, so proposal Impact `- **Tenant**:` becomes a type query. Default `osi` and `osi history` call this search once; this change does not touch git.

## Goals / Non-Goals

**Goals:**

- Nested-aware exclude globs that match the existing `SEARCH_EXCLUDES` path-segment filter.
- Skip list-item field labels at harvest time so they never reach `rg`.
- One content `rg` whose output names enough text to attribute terms; no `files × terms` full-file read.
- Frozen per-term content/symbol cap of 80 files.

**Non-Goals:**

- Rust rewrite, parallel `git log`, `confidence` formula, YAML keys, `SEARCH_TERM_CAP`.
- Teaching `rg` to respect workspace `.gitignore` (nested `qft-*` repos are ignored on purpose; keep `--no-ignore-vcs`).

## Decisions

### 1. `**/` globs for every exclude name

- **Choice**: For each `SEARCH_EXCLUDES` entry, pass `--glob '!**/<name>/**'` (and keep `!.git/**` style for `.git`). Keep the JS `excluded()` path-segment filter as a second pass. Same `**/` idea for the extra skip globs (`*.html`, `*.min.js`, …) is unnecessary; those are already suffix matches.
- **Why**: `!node_modules/**` only binds at the search root. QFT workspaces put `node_modules` under `qft-app/`, `qft-universal/`, etc. The walk already skipped by segment name; `rg` did not.
- **Alternative**: Drop `rg --files` and only walk — slower on large trees. Rejected.

### 2. Structural list-label skip, not a closed word list

- **Choice**: In `harvestMarked`, ignore a backtick/bold span when the current line is an unordered list item and the span is the first marked token, immediately followed by `:`. Covers `- **Tenant**:`, `- **Permission**:`, `- **Compatibility**:` without listing Impact headings.
- **Why**: QFT proposals reuse OpenSpec Impact field names. A denylist would miss the next label (`**Status**`).
- **Alternative**: Never harvest bold, only backticks — would drop real `**TenantList**` citations. Rejected.

### 3. Line-oriented `rg`, not a second full-file loop

- **Choice**: One `rg -F -f <terms> --json` (nested globs, `--max-filesize 512K`) on content terms. For each match event, test which terms occur in `lines.text` and run the existing identifier regex on that line for `symbol_match`. Path matching stays the JS scan over `listSourceFiles`. Do not `readFileSync` the union. Compile term regexes once per search, not per file×term.
- **Why**: Union `-l` then JS rescan is O(union files × terms) and `toLowerCase()`s whole files. Match lines already contain the hit. Case-folding content (`content.toLowerCase()`) is dropped; typed citations are exact.
- **Alternative**: One `rg -l` per term — 50+ process starts, each walks the tree. Measured slower. Rejected.
- **Alternative**: Rust port of the same loop. Same I/O shape. Rejected.

### 4. Wide-term cap after attribution

- **Choice**: Count distinct files per term that received content/symbol reasons. If count > 80, drop those reason types for that term; keep `path_match`. `ponytail:` ceiling 80; raise via a delta if a real identifier must stay a content candidate above that.
- **Why**: Shared components (`VTable`) and any label that still slips through must not fill the candidate cap or the JSON stream.
- **Alternative**: Cap `rg` with `--max-count` globally — would also hide a rare term that shares a file with a wide one. Rejected.

### 5. Tests stay in-repo; QFT dogfood is not CI

- **Choice**: Mini-repo / tmp fixtures: nested `pkg/node_modules/...` containing a cited identifier; proposal Impact `- **Tenant**:` plus `` `TenantList` ``; a helper-level test that >80 content files for one term lose content reasons. Do not add `qft-workspace` to CI.
- **Why**: Same pattern as history's disposable git fixture.
- **Alternative**: Snapshot wall-clock on QFT. Flaky. Rejected.

## Risks / Trade-offs

- [Symbol declared on a different line than the `rg` match] → Identifier regex on every matching line, not `--max-count 1`. Declaration lines that contain the term still count.
- [List label skip drops `- **Foo**:` when `Foo` is also a class] → Authors must backtick the class (` \`Foo\` `) as they already do for real types. Document in this design only; no YAML flag.
- [No `rg`: walk + full-file loop on the remaining tree] → Mini-repos stay small. Do not add `git grep` in this change (main spec already allows a fallback).
- [80-cap hides a legitimately ubiquitous type] → Path/basename still seed `VTable.vue`. Raise the cap with a later delta if needed.

## Migration Plan

- Rebuild `osi`. No YAML version bump. Skill parsers unchanged.
- Rollback: revert the change; search is slow again but output keys match.
