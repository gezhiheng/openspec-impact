## Why

用户现在必须 checkout 仓库、本地构建并运行 `npm link` 才能使用 `osi`。把现有 CLI 作为 npm 包发布，可以提供熟悉、可重复的安装方式；`osi init` 则从同一安装版本提供 Cursor skill。

## What Changes

- 使用现有包名 `openspec-impact` 发布 CLI，并提供可全局安装的 `osi` 可执行命令。
- 确保打包时会构建 CLI，并且 npm 包只包含 `osi` 与 `osi init` 运行所需文件和 Cursor 模板。
- 将全局 npm 安装、运行 `osi init` 配置 Cursor、调用 CLI 作为文档快速开始；保留 checkout 和 `npm link` 作为贡献者流程。

## Capabilities

### New Capabilities

- `osi-distribution`: 用户可以从已发布的 npm 包安装和运行 `osi`，并使用包内的 Cursor skill 模板。

### Modified Capabilities

## Impact

- 影响 `package.json`、`README.md` 及 npm 打包/发布验证流程。
- 现有 `osi` 命令行为不变；`osi init` 继续从已安装的包复制 `.cursor/skills/osi-impact/SKILL.md` 和 `.cursor/commands/osi-impact.md`。
- 不增加运行时依赖。当前公共 npm registry 中没有 `openspec-impact` 的公开记录；最终发布时仍需确认名称状态和发布权限。
