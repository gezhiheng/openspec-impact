## Why

安装后的 `osi` / `openspec-impact` 没有办法打印自己的版本。`-v` 和 `--version` 现在被当成未知参数，以非零退出并打印用法，用户无法确认正在运行的包版本。

## What Changes

- `osi -v`、`osi --version`，以及 `openspec-impact` 的同名参数，向 stdout 打印本包 `package.json` 的 `version`，退出码为 0。
- 两个命令名打印同一行版本。不输出 YAML，不把版本写进 evidence 文档。
- 该参数单独出现。和子命令或其他参数一起出现时仍是用法错误。
- 用法文本列出 `-v` 和 `--version`。

## Capabilities

### New Capabilities

### Modified Capabilities

- `osi-distribution`: 已发布的 `osi` 与 `openspec-impact` 必须能用 `-v` / `--version` 打印包版本。

## Impact

- `src/cli.ts` 的参数解析、用法文本，以及版本字符串的读取（运行中的 `package.json`，不新依赖）。
- CLI 测试覆盖两个入口的 `-v` / `--version`，以及与子命令混用时的用法错误。
- README 的命令说明补一行。不改子命令、YAML 或 `osi init`。
