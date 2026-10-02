## ADDED Requirements

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
