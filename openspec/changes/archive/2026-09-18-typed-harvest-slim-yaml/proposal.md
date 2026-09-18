## Why

默认 `osi <change>` 把 `scope.candidates` / `scope.tests` 和词袋命中一起倒给 Skill，主路径被淹没；检索又用 change-id 切词和标题 n-gram，导出页、启动脚本、out-of-scope 里点名的文件也会变成 high。Agent 只要种子和 co-change。

## What Changes

- **BREAKING（默认入口）**: `osi <change>` 只打印 `version` / `change` / `seeds` / `history`（与 `osi history` 同形）。不再嵌套 `scope.concepts` / `scope.candidates` / `scope.tests`。
- `osi scope` 仍可打出 candidates/tests（调试用）。内部仍用一次搜索给 history 选种子，只是 stdout 不再带那层噪音。
- **检索停用词袋**：不再用 change-id/capability kebab 切词、标题/`What Changes` 2–3 gram、`PATH_ONLY` 单词去搜内容。
- **Typed 抽取**（只这些当搜索词）：`repo`（`[qft-app]` / 路径首段仓名，只作路径前缀，不当内容词）、`path`（posix 文件路径）、`symbol`（PascalCase / `Type.member`）、`api`（`METHOD /path`、`FooApi.bar`）、`perm`（`SCREAMING_SNAKE` 权限/配置码）。
- Proposal **out-of-scope**（`Out of scope` / `明确不修` / `不在范围` / `本期不修` 段落或条目）里抽出的 typed citation 做负向过滤：从搜索词里去掉，不得当种子。与 in-scope 相同的短名若仍在范围内，只去掉 out-of-scope 那条更具体的 citation。
- 不把 co-change 并进 `confidence`。不新增 AST。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-evidence`: Default `osi <change>` YAML is the history document only (`seeds` + `history`), not a nested scope wrapper.
- `osi-scope`: Harvest/search uses typed citations plus proposal out-of-scope as a deny list, not bag-of-words.

## Impact

- **In scope**: `toEvidenceYaml` / `runEvidence` 输出形状，`harvestConcepts` / `toSearchConcepts` 改为 typed + deny，proposal out-of-scope 解析，fixture 与默认 CLI 测试。
- **Out of scope**: 删除 `osi scope` 子命令、改 `osi history` 顶层键、AST/deps、JSON。
- **Compatibility**: `osi scope` / `osi history` 调用方不变。解析嵌套 `scope:` 的 Skill 必须改读顶层 `seeds`/`history`。
- **Deps**: none.
