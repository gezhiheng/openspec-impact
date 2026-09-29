## 1. Wire refs into history

- [x] 1.1 `HistoryEntry.reason` is `'co_change' | 'sibling'`
- [x] 1.2 `runHistory` and `runEvidence` share one `runScopePass`; build `refs` then expand neighbors; `osi history` stdout still has no `refs`

## 2. Neighbors

- [x] 2.1 Skip co-change and siblings when `refs.others >= 30` (own constant with a `ponytail:` cap, not `WIDE_FILES`)
- [x] 2.2 When that seed's co-change result is empty, add at most 4 same-directory siblings (stem matches, then `sample`); drop tests and `openspec` paths; do not add a Detail-only tier
- [x] 2.3 Put sibling rows in the same `history` array; keep sort by `commits` then `slice(0, 50)`

## 3. Skill

- [x] 3.1 In `templates/osi-impact/SKILL.md` step 5, a seed with `refs.wide === true` is `out` and is not opened; the closing line is 「宽词误伤」
- [x] 3.2 In step 6, open `sibling` the same way as `co_change`; still open it when `via` is `out` only because the spec says 不做, and put that form or list in 「可能漏了」 with that sentence; `commits: 0` is not a support count; do not open `sample` paths that are absent from `history`

## 4. Tests

- [x] 4.1 A seed with qualifying co-change keeps those rows and gains no `sibling`
- [x] 4.2 Empty co-change plus same-directory `ReturnVisit.vue` yields `reason: sibling` and `commits: 0`; `MaintenanceRecord.vue` stays out unless it is in `sample`
- [x] 4.3 A seed with `others >= 30`, including a wide term, has no co-change row and no sibling row
- [x] 4.4 A commit that touches more than 30 files is still dropped whole; the empty-history fixture stays `history: []`
