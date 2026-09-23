## Why

`/osi-impact` 的 Shape 要求「每个 in 文件一句表现」，例子又以文件名开头。`osi` 扫出几十个 seed（DTO、Mapper、样板、误伤）时，agent 把类名堆进散文交差；漏改和故意没动混写；没有图。产品读者读不懂。压缩的是交付物，不是调查。

## What Changes

- 替换 `templates/osi-impact/SKILL.md` 文首口吻和 Deliver / Shape：按用户路径固定四段写，并强制 ASCII Visualize（对齐 openspec-explore 的 Visualize 块）。
- 删除「Every `in` file gets a 表现 sentence」和「因为改了 `File.vue`」式 few-shot。
- Steps 1–7（osi impact → 读 change 文档 → 判 mode → 打开 seeds/neighbors → 对照 this-change diff）原文保留。
- 保持 `disable-model-invocation: true` 和「只有用户打 `/osi-impact` 才跑」。
- 不改 CLI、YAML 键、`openspec/specs/`。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- （无。Skill 文案不是 CLI requirement；`.openspec.yaml` 设 `skip_specs: true`。）

## Impact

- **In scope**: `templates/osi-impact/SKILL.md` 文首 + Deliver / Shape。
- **Out of scope**: Steps 1–7（含 Step 5 的 refs / 公共判断）、Cursor command stub、`osi impact` YAML、harvest / search / history、`osi init` 安装路径。
- **Compatibility**: 已安装 skill 要再跑 `osi init` 才刷新。下游若有人依赖「按 in 文件逐句」的旧输出会变。
- **Deps**: none.
