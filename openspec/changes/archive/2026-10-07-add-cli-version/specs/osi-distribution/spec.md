## ADDED Requirements

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
