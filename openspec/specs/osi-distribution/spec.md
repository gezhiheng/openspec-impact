# osi-distribution Specification

## Purpose

让用户可以从公共 npm 包安装 `osi` CLI，并直接使用包内的 Cursor 集成，而不必自行克隆或构建本仓库。

## Requirements

### Requirement: Published npm package provides the osi executable

项目 SHALL 以 `openspec-impact` 包名发布 npm 包，并提供全局安装后可用的 `osi` 可执行命令。该命令 MUST 支持现有的 `impact`、`scope`、`history` 和 `init` 命令，用户无需克隆或构建本仓库。

#### Scenario: 全局安装后可运行 osi

- **WHEN** 用户通过 npm 全局安装已发布的 `openspec-impact` 包
- **THEN** 用户可以在 PATH 中运行 `osi` 命令
- **AND** `osi impact <change>` 会针对当前 OpenSpec 项目运行

### Requirement: Published package supports Cursor setup with osi init

已发布的包 MUST 包含 `osi init` 所需的版本化 Cursor skill 与 command 模板。在 OpenSpec 项目中运行 `osi init` MUST 从包内模板安装或刷新 `.cursor/skills/osi-impact/SKILL.md` 和 `.cursor/commands/osi-impact.md`。

#### Scenario: 全局安装后安装 Cursor skill

- **WHEN** 用户全局安装已发布的包，并在包含 `openspec/` 的项目中运行 `osi init`
- **THEN** 项目中生成 `.cursor/skills/osi-impact/SKILL.md` 和 `.cursor/commands/osi-impact.md`
- **AND** 用户可以在 Cursor 中调用 `/osi-impact <change>`

#### Scenario: 升级后刷新 Cursor skill

- **WHEN** 用户升级全局安装的包并再次运行 `osi init`
- **THEN** 已安装的 skill 和 command 文件与升级后包内模板一致
