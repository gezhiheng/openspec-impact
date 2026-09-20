## Why

`osi <change>` 把任意非保留字都当成证据流水线，和 `init` 等动词撞名，也和「spec 名」口误绑在一起。人要的入口是带动词的 `osi impact <change>`；YAML 仍是证据，不是 `/osi-impact` 的影响面结论。

## What Changes

- **BREAKING**: 裸 `osi <change-id|path>` 不再跑流水线，改为 usage error（stderr USAGE，stdout 非 YAML）。
- 新增动词：`osi impact <change-id|path>` 跑现有 scope→history YAML（形状不变）。
- `--no-search` / `--include-low` 仍作用在这次流水线上，例如 `osi --no-search impact add-renewal-status`。
- 保留字：`impact`、`scope`、`history`、`init`。change 名叫 `impact` 时用路径传入。
- 打包的 osi-impact Skill / command 改口：跑 `osi impact <change>`，占位符 `{change}`，不再写 `{spec name}`。

## Capabilities

### New Capabilities

- （无。）

### Modified Capabilities

- `osi-evidence`: The evidence pipeline is invoked as `osi impact <change>`, not as a bare change id.

## Impact

- **In scope**: `parseArgv` / USAGE / `main` 分发，`tests` 里所有裸 change CLI，Skill 与 Cursor command 模板用词。
- **Out of scope**: 改 YAML 键、`osi update`、让 CLI 写影响面句子、改 harvest / history 算法。
- **Compatibility**: `osi scope` / `osi history` / `osi init` 不变。依赖 `osi add-renewal-status` 的脚本要改成 `osi impact add-renewal-status`。
- **Deps**: none.
