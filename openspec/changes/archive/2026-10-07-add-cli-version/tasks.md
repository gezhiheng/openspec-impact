## 1. 版本参数

- [x] 1.1 `parseArgv`：argv 恰好是 `-v` 或 `--version` 时返回 version 命令；与子命令或其他参数同时出现仍是用法错误，`-V` 仍是未知参数。`USAGE` 列出这两个参数
- [x] 1.2 `main` 在任何子命令之前把本包 `version` 写到 stdout（该字符串加一个换行）并返回 0。用 `createRequire(import.meta.url)` 读 CLI 旁的 `package.json`（`dist/src/cli.js` 对应 `../../package.json`）。不加依赖，不写死版本号

## 2. 验证

- [x] 2.1 测试 `osi` 与 `openspec-impact` 的 `-v` / `--version`：stdout 等于本包 `version` 加换行，退出码 0，stderr 为空。`osi -v impact <change>` 与 `osi impact --version <change>` 非零退出，stderr 含用法，stdout 不含版本

## 3. 文档

- [x] 3.1 README 的命令说明补一行 `-v` / `--version`
