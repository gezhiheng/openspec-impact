## Why

`osi impact` 的 history 被宽词和相册共改占满（`others` 为 33，未到宽词线 80）。另一边，18 个月内没有合格共改的页面被漏掉：`ReturnVisitDetails.vue` 旁边的登记表单 `ReturnVisit.vue` 进不了 history。

## What Changes

- **BREAKING（history 行的 `reason`）**: 允许 `sibling`。`commits` 为 0。`via` 仍是 seed。没有新的顶层键，`version` 仍为 1。
- 某个 seed 的 `refs.others ≥ 30`（宽词的 `others` 大于 80，已含在内）：不跑共改，不补邻居。
- 其余 seed 的共改照旧：18 个月、忽略 merge、单次超过 30 个文件整笔丢掉、至少 2 次、每 seed 最多 10 条。
- 仅当该 seed 共改为 0 条：补同目录邻居，最多 4 个。同目录 = 父目录相同。只收两类：
  - 词干：去掉 seed 文件名末尾的 `Details` 或 `Detail` 后，同目录文件的词干等于剩余部分，或以其开头。`ReturnVisitDetails.vue` → `ReturnVisit.vue`。
  - sample：该 seed 的 `refs.sample` 里、且父目录与 seed 相同的路径。
- 名字对不上的列表（`MaintenanceRecord.vue`）不保证出现。不收「词干含 `Detail`」的第三档。不做全目录展开。
- 共改与 sibling 进同一个 `history`，按 `commits` 降序再裁到 50。sibling 为 0，排在共改之后。共改占满 50 时 sibling 被裁掉。不提高 `HISTORY_CAP`。
- `osi history` 与 `osi impact` 走同一条邻居逻辑，只搜一次仓库。`osi history` 仍不打印 `refs`。
- Skill 只改 `templates/osi-impact/SKILL.md` 第 5、6 步。不改报告四段，不改 seed 选取。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-history`: `others ≥ 30` 的 seed 不展开；共改为空才补 `sibling`；`reason` 允许 `sibling`；总共仍最多 50 条。
- `osi-evidence`: impact 的 history 行允许 `sibling`；没有共改且没有 sibling 时 history 才为空。

## Impact

- **In scope**: `historyFromScope` 在展开前读到同一次 scope pass 的 `refs`；`HistoryEntry.reason`；`tests/history.test.ts`；两份规格里 `reason` / 空 history 的句子；Skill 第 5、6 步。
- **Out of scope**: 放宽 18 个月 / merge / 30 文件整笔丢弃 / 至少 2 次 / 每 seed 10 条 / 总共 50 条；提高 `HISTORY_CAP`；全目录展开；import / AST / 依赖图；第三档详情；保证 `MaintenanceRecord.vue`；`osi history` 打印 `refs`；改 seed 选取；改报告四段。
- **Compatibility**: 只断言 `reason: co_change` 的调用方会看到 `sibling`。顶层键不变。
- **Deps**: none.
