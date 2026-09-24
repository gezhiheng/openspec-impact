## Why

`/osi-impact` 已经规定四段（一句话 → 会变什么 → 可能漏了 → 收尾），但例子是连成一篇的散文，「可能漏了：」只是句首。模型照例子写，影响范围和漏改埋在同一张入口表和后面的长段落里，扫不到标题。

## What Changes

- 改 `templates/osi-impact/SKILL.md` 文首和 Deliver / Shape：聊天输出用固定 Markdown 标题，例子里必须出现这些标题。
- 标题顺序：`## 一句话` → `## 影响范围` → `## 可能遗漏` → `## 故意没动` → `## 上线注意`。`会变什么` 改名为 `影响范围`；`收尾` 拆成后两个标题。
- `影响范围`：图放在这一节里；每个入口一行，行尾写会怎样。改到公共组件时标题不变，这一节开头写其它共用处。
- `可能遗漏`：spec 要、这次 diff 没有、用户会受影响的点各一行；没有则写「未见遗漏」。入口表里不再混「还没改」。
- 删掉以句首「可能漏了：」「故意没动：」「上线注意：」代替标题的 few-shot。
- Steps 1–7 原文保留。不改 CLI、YAML 键、`openspec/specs/`。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- （无。Skill 文案不是 CLI requirement；`.openspec.yaml` 设 `skip_specs: true`。）

## Impact

- **In scope**: `templates/osi-impact/SKILL.md` 文首 + Deliver / Shape（含例子）。
- **Out of scope**: Steps 1–7（含 Step 5 的 refs / 公共判断）、Cursor command stub、`osi impact` YAML、harvest / search / history、`osi init` 安装路径。
- **Compatibility**: 已安装 skill 要再跑 `osi init` 才刷新。读者会看到标题，不再看到无标题散文。
- **Deps**: none.
