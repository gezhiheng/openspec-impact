## 1. 双命令入口

- [x] 1.1 在 `package.json` 的 `bin` 中保留 `osi`，并增加 `openspec-impact`，两者都指向 `dist/src/cli.js`
- [x] 1.2 把 `src/cli.ts` 的 `USAGE` 改成静态文本，为 `impact`、`scope`、`history`、`init` 各列出 `osi` 与 `openspec-impact`

## 2. 验证

- [x] 2.1 增加测试：名为 `openspec-impact` 的 symlink 运行 `scope` 时，退出码和 stdout 与 `osi` 相同；两个入口在无子命令时都以非零退出，且 stderr 同时包含 `osi` 和 `openspec-impact`

## 3. 文档

- [x] 3.1 更新 README 中英文：全局安装后 `osi` 与 `openspec-impact` 是同一 CLI
