## Context

See proposal.md for motivation. Today `searchConcepts` already builds a per-file hit map, then `dropWideContent` throws away the wide-term set. `runEvidence` returns `HistoryDocument` and `toHistoryYaml` dumps four keys. `skipExt` / `rgGlobs` skip html/minified/class/jar, not docs.

## Goals / Non-Goals

**Goals:**

- One search pass feeds both history and `refs`.
- `osi history` dump path unchanged.
- Doc suffixes skipped in both `rg` and walk/`git grep`.

**Non-Goals:**

- Do not add a refs flag, a second ripgrep, or a `version: 2`.
- Do not put `refs` on `ScopeDocument` or `HistoryDocument`.

## Decisions

### 1. Split impact document from history document

- **Choice**: `EvidenceDocument = HistoryDocument & { refs: RefItem[] }`. `runEvidence` returns that. `toHistoryYaml` stays four keys. New `toEvidenceYaml` = history fields + `refs` between `seeds` and `history`. `osi history` / `runHistory` still use `toHistoryYaml`.
- **Why**: Spec forbids `refs` on history stdout; sharing one dump function would leak the key.
- **Alternative**: Always dump `refs: []` from `toHistoryYaml` — rejected.

### 2. Count from the post-wide hit map, keep the wide set

- **Choice**: `dropWideContent` returns `Map<term, count>` for terms that exceeded 80. `searchConcepts` returns `{ hits, wide }`. `runScope` still ranks `hits` into the scope document. `runEvidence` calls the same search (via a small `runScope` unpack or a shared helper that returns `{ doc, hits, wide }`) and `refsFromHits(seeds, hits, wide)`.
- **Why**: After drop, wide terms have no content/symbol reasons left; `wide`/`others > 80` need the pre-drop count. Ranking/omit-low/per-repo cap must not shrink `others`.
- **Alternative**: Re-scan after ranking — second search, and would miss files omitted by cap. Rejected.
- **Term**: filename stem if that stem is a named `path_match`/`symbol_match` reason; else basename; else longest named reason. (A harvested posix path is named but would count path-string hits, not identifier reuse.)
- **others (not wide)**: distinct `hits` paths with `content_match`/`symbol_match` for that term, minus seed, minus `isTestPath`.
- **sample**: those paths sorted, slice 8.

### 3. Suffix skip is search-wide

- **Choice**: Add the five doc suffixes to `skipExt` and matching `rgGlobs`. Same list for content search and file listing.
- **Why**: Spec treats them like `node_modules`: not candidates, so they cannot inflate `refs` either.
- **Alternative**: Skip markdown only when counting refs — README would still become a candidate. Rejected.

### 4. Skill reads `refs` and the filename

- **Choice**: In `templates/osi-impact/SKILL.md` step 5 (seed files): call 公共 only when **both** (a) `wide` or `others ≥ 2` and (b) the seed filename/path reads as a shared component or method (`src/components/PermButton.vue`, `*Util*`, `*Helper*`) rather than a page/route (`TenantList.tsx`, `*Page*`, `pages/`). Cite one `sample` when calling 公共. Cursor command file unchanged beyond existing `osi impact` pointer.
- **Why**: High `others` on a page is mention-count, not “this is a shared widget”. Filename is the role signal; refs are the reuse signal. `osi init` already overwrites from templates.

## Risks / Trade-offs

- [Literal co-occurrence ≠ import graph] → Skill copy must not claim "imported by N files". Mitigation: spec says 字面共现; skill says 出现在, not 引用了.
- [Callers that assert impact YAML has exactly four keys] → This change's tests; no in-repo parser besides those tests.
- [Existing fixtures with `TenantList` in markdown] → Those files drop out of candidates; update fixture/tests if a current assertion depended on them.

## Migration Plan

- Rebuild `osi`. `osi scope` / `osi history` YAML keys unchanged. Re-run `osi init` to refresh installed skill.
- Rollback: revert the change.

## Open Questions

None. The five frozen choices are in proposal.md.
