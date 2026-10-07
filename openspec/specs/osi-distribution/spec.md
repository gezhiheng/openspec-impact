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

### Requirement: Published package also provides the openspec-impact executable

已发布的 `openspec-impact` 包 SHALL 同时提供名为 `openspec-impact` 的可执行命令。该命令 MUST 与 `osi` 接受相同的子命令和参数，并产生相同的退出码、stdout 与 stderr。无子命令时打印的用法 MUST 同时出现 `osi` 和 `openspec-impact`。

#### Scenario: 全局安装后可运行 openspec-impact

- **WHEN** 用户通过 npm 全局安装已发布的 `openspec-impact` 包
- **THEN** 用户可以在 PATH 中运行 `openspec-impact`
- **AND** `openspec-impact impact <change>` 与 `osi impact <change>` 针对同一 OpenSpec 项目产生相同的退出码和 stdout

#### Scenario: 用法同时列出两个命令名

- **WHEN** 用户运行 `osi` 或 `openspec-impact` 且未提供子命令
- **THEN** 进程以非零状态退出
- **AND** stderr 中的用法文本同时包含 `osi` 和 `openspec-impact`

### Requirement: Executables print the package version

`osi` 与 `openspec-impact` MUST 在唯一参数为 `-v` 或 `--version` 时，向 stdout 打印本包的版本字符串并跟一个换行，然后以状态码 0 退出。版本字符串 MUST 等于该次运行所在包的 `version` 字段。两个命令名 MUST 打印同一字符串。stdout MUST NOT 是 YAML，stderr MUST 为空。该参数与任何子命令或其他参数同时出现时 MUST 是用法错误：非零退出，stderr 为用法说明，stdout 不打印版本、也不打印 YAML。`-V` 以及其他未列出的版本写法 MUST 仍按未知参数处理。

#### Scenario: osi -v 打印版本

- **WHEN** 用户运行 `osi -v`
- **THEN** 进程以状态码 0 退出
- **AND** stdout 是包版本加换行
- **AND** stderr 为空

#### Scenario: osi --version 打印同一版本

- **WHEN** 用户运行 `osi --version`
- **THEN** stdout 与 `osi -v` 相同
- **AND** 进程以状态码 0 退出

#### Scenario: openspec-impact 打印同一版本

- **WHEN** 用户运行 `openspec-impact -v` 或 `openspec-impact --version`
- **THEN** stdout 与 `osi -v` 相同
- **AND** 进程以状态码 0 退出

#### Scenario: 与子命令混用是用法错误

- **WHEN** 用户运行 `osi -v impact <change>` 或 `osi impact --version <change>`
- **THEN** 进程以非零状态退出
- **AND** stderr 包含用法说明
- **AND** stdout 不包含版本字符串，也不是 YAML

### Requirement: A version change on main publishes latest

推送到 `main` 时，仓库 MUST 先运行 `npm run fmt:check` 与 `npm test`。仅当该次 push 终点的 `package.json` `version` 与起点不同、该字符串不含 `-`、且两项检查都通过时，仓库 MUST 把 `openspec-impact` 的这个版本发布到公共 npm registry，且 dist-tag 为 `latest`。发布所用版本 MUST 等于终点上已有的 `version`。发布流程 MUST NOT 修改 `package.json` 的版本。发布凭证 MUST 是该次运行获得的短期凭证。仓库 MUST NOT 包含 npm token。

未合并到 `main` 的变更 MUST NOT 发布。起点版本无法读取时 MUST NOT 发布。新版本已存在于 registry 时，发布 MUST 失败且 MUST NOT 覆盖该版本。一次发布正在进行时，后续 push MUST NOT 取消它。

发布失败后，重跑同一次 push 的发布 MUST 在版本仍是该终点版本时再次尝试发布。其后任何未改变 `version` 的 push MUST NOT 发布。

#### Scenario: 版本未变则不发布

- **WHEN** 一次推送到 `main` 的起点与终点上 `package.json` 的 `version` 相同
- **THEN** registry 上不出现新版本

#### Scenario: 版本改变且检查通过则发布 latest

- **WHEN** 一次推送到 `main` 将 `version` 从已发布版本改为一个不含 `-` 的新版本，且 `npm run fmt:check` 与 `npm test` 都通过
- **THEN** 该新版本出现在公共 npm registry 上
- **AND** 其 dist-tag `latest` 指向该版本

#### Scenario: 检查失败则不发布

- **WHEN** 一次推送到 `main` 改变了 `version`，但 `npm run fmt:check` 或 `npm test` 失败
- **THEN** 该版本不被发布

#### Scenario: 预发布号不进入 latest

- **WHEN** 一次推送到 `main` 将 `version` 改为含 `-` 的字符串
- **THEN** 该版本不被发布为 `latest`

#### Scenario: 拉取请求不发布

- **WHEN** 一个尚未合并到 `main` 的变更修改了 `version`
- **THEN** registry 上不出现该版本

#### Scenario: 已存在的版本不被覆盖

- **WHEN** 终点 `version` 已经存在于公共 npm registry
- **THEN** 发布失败
- **AND** registry 上该版本的内容不变

#### Scenario: 失败后仅重跑同一次 push

- **WHEN** 某次改变了 `version` 的推送发布失败，之后另一次推送到 `main` 的 `version` 与失败时的终点版本相同
- **THEN** 这后一次推送不发布
- **AND** 重跑失败的那一次发布会再次尝试发布该版本
