## Why

Skill 要判断「公共组件/方法」，但 `osi impact` 只给 seed 路径。搜索其实已经知道同一 citation 还出现在哪些文件里；宽词（>80 文件）也已经在算。文档后缀（`.md` 等）现在仍被搜，README 会冒充引用。

## What Changes

- **BREAKING（YAML 键）**: `osi impact` 顶层增加 `refs`（`version` 仍为 1）。`osi history` / `osi scope` 形状不变。
- 每个 seed 一条 ref：字面共现文件数（不含自己、不含测试）。不解析 import。不再搜第二次。
- 计数在 drop-wide 之后、ranking / omit-low / 每仓 cap **之前**。term 触发宽词上限则 `wide: true`，`sample` 为空。
- 搜索跳过 `.md` `.mdx` `.txt` `.rst` `.adoc`（大小写不敏感）。不跳 `.json` / `.xml` / `.yml`。
- osi-impact Skill：`wide` 或 `others ≥ 2` 只说明复用；还要结合文件名/路径判断是不是公共组件或公共方法（页面被点名 ≠ 公共组件）。两者都成立才写「公共」，并点一条 `sample`。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-evidence`: `osi impact` YAML includes `refs` usage counts per seed.
- `osi-scope`: Repository search MUST skip the frozen documentation suffixes.
- `osi-history`: `osi history` YAML still has no `refs` key.

## Impact

- **In scope**: `skipExt` / rg globs，wide 集留给 evidence，`refs` 只出现在 impact YAML，Skill 模板，fixture 里带 citation 的 markdown 不再进 candidates。
- **Out of scope**: 解析 import/AST、`osi history` 加 `refs`、方法级独立计数、CLI flag、改 `confidence`、升 `version: 2`。
- **Compatibility**: `osi scope` 候选可能变少（少了 markdown）。`osi history` 调用方不变。读 impact YAML 且校验「只有四键」的脚本会断。
- **Deps**: none.
