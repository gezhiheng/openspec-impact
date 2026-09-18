## Why

Skill 要的是一份 change 的完整确定性证据（词法 scope，再 git co-change），但现在必须记两次调用、两份 YAML。漏跑 `osi history` 就会只剩点名命中。默认入口应走完整流水线；两层证据仍分开，不合成 `confidence`。

## What Changes

- **BREAKING（仅对未知子命令）**: `osi <change-id|path>` 不再报 `Unknown command`，而是跑 scope → history，向 stdout 打一份嵌套 YAML（`scope` 与 `history` 分栏）。
- 保留 `osi scope` 与 `osi history` 作为单层逃生口，各自 YAML 形状不变。
- 保留字：第一位置参数是 `scope` 或 `history` 时走单层；其它当成 change。change 就叫 `scope` 时用路径传入。
- 流水线把 `--no-search` / `--include-low` 传给 scope 层。history 层消费那次 scope 的结果，不再搜第二次。
- 不把 history 邻居写入 `candidates`，不新增影响结论。AST/deps 本 change 不做。

## Capabilities

### New Capabilities

- `osi-evidence`: Default `osi <change>` runs the scope-then-history pipeline and prints one nested YAML document with separate `scope` and `history` sections, without judging impact.

### Modified Capabilities

- （无。`osi-scope` 的 `osi scope` 文档形状不变；`osi-history` 仍在未归档 change 里，单层命令行为不变。）

## Impact

- **In scope**: `src/cli.ts` argv（默认流水线 vs 保留字），编排函数复用 `runScope` + 现有种子/co-change，`toEvidenceYaml`，USAGE，测试覆盖默认入口与单层未回归。
- **Out of scope**: 新证据层（AST/deps/blame）、JSON、改 scope 排序、把 co-change 并入 `confidence`、改 `osi history` 的顶层键。
- **Compatibility**: `osi scope` / `osi history` 调用方不变。现在会失败的 `osi add-renewal-status` 将成功并打印新文档。
- **Deps**: none.
