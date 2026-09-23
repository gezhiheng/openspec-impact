## Context

See proposal.md for motivation. `runEvidence` calls `historyFromScope` and then `refsFromHits`. `runHistory` calls `runScope`, which drops `hits` and `wide`. `coChangeNeighbors` always runs git log. `HistoryEntry.reason` is only `co_change`. The global cut is `sort` by `commits` then `slice(0, HISTORY_CAP)` with `HISTORY_CAP` 50.

## Goals / Non-Goals

**Goals:**

- One scope pass feeds `refs` and neighbors for both `osi history` and `osi impact`.
- `others ≥ 30` skips git for that seed.
- Sibling rows share the existing `history` array and the existing 50 cut.

**Non-Goals:**

- A new YAML key, a second search, or a higher `HISTORY_CAP`.
- A third “stem contains `Detail`” pass, or emitting every file in the directory.

## Decisions

### 1. Refs before neighbors

- **Choice**: Both commands call `runScopePass`. `refsFromHits(seeds, hits, wide)` runs first. `historyFromScope(doc, projectRoot, refs)` uses those rows. `toHistoryYaml` still omits `refs`.
- **Why**: The gate and the sample list already exist on `RefItem`. A second search would violate the evidence spec.
- **Alternative**: Recompute `others` inside `coChangeNeighbors` — duplicates `refsFromHits` and still needs `hits`. Rejected.

### 2. Gate is `others >= 30`

- **Choice**: New constant next to a `ponytail:` comment, frozen in the history spec. Do not reuse `WIDE_FILES` (also 30, but that is files in one commit). If `others >= 30`, skip `coChangeNeighbors` and skip siblings. Wide terms already have `others > 80`, so they take the same branch.
- **Why**: The album case is `others` 33 with `wide: false`. One comparison covers both.
- **Alternative**: Branch on `wide` and on `others` separately — same outcome, two conditions. Rejected.

### 3. Siblings only when co-change returns no rows

- **Choice**: If `coChangeNeighbors` returns `[]`, `readdir` the seed’s parent. Keep stem matches, then same-parent `sample` paths, drop the seed, drop `isTestPath`, drop paths that contain an `openspec` segment, dedupe, slice 4. Stem: strip one trailing `Details` or else `Detail` from the seed stem; empty remainder matches nothing; candidate stem equals the remainder or starts with it. `reason: 'co_change' | 'sibling'`.
- **Why**: `ReturnVisitDetails.vue` → `ReturnVisit.vue` is the stem rule. `MaintenanceRecord.vue` stays out unless it is already in `sample`. The detail-only tier pulls unrelated `*Detail` files once any neighbor exists.
- **Alternative**: Append any same-directory `*Detail` after the first hit — rejected in the proposal.

### 4. One list, then the existing cut

- **Choice**: Push sibling rows into the same array. Keep `sort` by `commits` descending then `path`, then `slice(0, 50)`.
- **Why**: Sibling `commits` are 0 and co-change `commits` are at least 2, so co-change stays in front. Slicing after the sort keeps the cap. Appending after `slice(0, 50)` can exceed 50.
- **Alternative**: Slice co-change first, then concatenate siblings — rejected.

### 5. Skill copy, two steps

- **Choice**: In `templates/osi-impact/SKILL.md` only. Step 5: a seed with `refs.wide === true` is `out` and is not opened; the closing line is 「宽词误伤」. Step 6: open `sibling` the same way as `co_change` when `via` is `in`. If `via` is `out` only because the spec says 不做, still open the sibling; when it is the same operation’s other form or list, put it in 「可能漏了」 and quote that 不做 sentence. `commits: 0` is not a support count. `refs.sample` stays 出现在; open a path only when it is in `history`.
- **Why**: `osi init` copies this template. The four-block shape and seed selection stay. A wide seed is never `in`, so the existing 公共 sentence does not need an edit.

## Risks / Trade-offs

- [Short remainder] `RoomDetail.vue` strips to `Room`, so `RoomImages.vue` in that directory can become a sibling when co-change is empty and `others` is under 30. → Accepted. A minimum length would be a new rule. The seed `RoomImages` with `others ≥ 30` is still gated.
- [`MaintenanceRecord.vue` stays missing] unless that path is in `sample`. → Accepted. Listing the directory would put the album noise back.
- [Callers that allow only `reason: co_change`] see `sibling`. → Top-level keys and `version` stay. Tests in this change cover the new value.
- [`TenantList.test.tsx`] has stem `TenantList.test`, which starts with `TenantList`. → The existing test-path filter applies to sibling rows, so the empty-history fixture stays empty.

## Migration Plan

- Rebuild `osi`. Re-run `osi init` where the skill is installed.
- Rollback: revert the change.

## Open Questions

None. The four choices are in proposal.md.
