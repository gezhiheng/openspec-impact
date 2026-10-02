## Why

已发布的 npm 包名是 `openspec-impact`，但唯一的可执行命令是 `osi`。用户按包名安装后，无法用同名命令调用 CLI，和 `npx openspec-impact` 的预期也不一致。

## What Changes

- 全局安装后，`osi` 与 `openspec-impact` 都进入 PATH，并执行同一套 `impact`、`scope`、`history`、`init`。
- 用法说明同时列出这两个命令名。现有 `osi` 调用方式保持可用。
- 包名、子命令、YAML 输出和 `osi init` 安装的 skill 不变。

## Capabilities

### New Capabilities

### Modified Capabilities

- `osi-distribution`: 已发布的包必须同时提供 `osi` 和 `openspec-impact` 两个等价可执行命令。

## Impact

- `package.json` 的 `bin`、`src/cli.ts` 的用法文本、README 的安装与命令说明。
- 现有以 `osi` 为入口的测试保留；补一条以 `openspec-impact` 为入口的同等调用。
- 不增加依赖，不改 npm 包名。
