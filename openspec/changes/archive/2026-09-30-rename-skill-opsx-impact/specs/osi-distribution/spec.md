## MODIFIED Requirements

### Requirement: Published package supports Cursor setup with osi init

已发布的包 MUST 包含 `osi init` 所需的版本化 skill 内容、支持的 agent adapters 及其工具专属模板。初始支持范围 MUST 包含 Cursor、Claude Code、Codex、Windsurf、Cline、Roo、OpenCode、GitHub Copilot 和 Pi。用户在 OpenSpec 项目运行 `osi init` 并选择 agent 后，MUST 从包内模板安装所选工具的项目级 `opsx-impact` 集成；使用 `--agent` 时 MUST 安装参数列出的集成，而不要求用户克隆或构建本仓库。

#### Scenario: 全局安装后安装所选的多个 agent

- **WHEN** 用户全局安装已发布的 `openspec-impact` 包，并在包含 `openspec/` 的项目中运行 `osi init --agent cursor,codex`
- **THEN** 项目中生成 Cursor 和 Codex 对应的 opsx-impact skill 文件
- **AND** Cursor 集成还包含 `.cursor/commands/opsx-impact.md`
- **AND** 未选择的 agent 不会被安装

#### Scenario: 升级后刷新所选集成

- **WHEN** 用户升级全局安装的包并再次运行 `osi init --agent cursor,claude`
- **THEN** 已选择的 skill 和 command/prompt 文件与升级后包内对应模板一致
- **AND** 未选择的集成文件保持不变
