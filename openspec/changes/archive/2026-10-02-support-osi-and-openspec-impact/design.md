## Context

参见 `proposal.md` 的 Why。`package.json` 的 `bin` 只有 `osi` → `dist/src/cli.js`。`src/cli.ts` 的 `USAGE` 和缺少子命令时的 stderr 都写死 `osi`。入口用 `realpath` 判断是否直接运行，不看命令名。

## Goals / Non-Goals

**Goals:**

- 安装后 `osi` 与 `openspec-impact` 都指向同一入口。
- 无子命令时的用法文本同时写出两个名字。

**Non-Goals:**

- 不改包名、子命令、YAML 或 init 安装的 skill。
- 不按 `argv[0]` 切换行为。

## Decisions

- **选择**：`bin` 增加 `"openspec-impact": "dist/src/cli.js"`，与现有 `osi` 并列。用法字符串静态列出两行命令名。
- **备选**：只把 bin 改名为 `openspec-impact`。否决，现有 `osi` 调用必须继续可用。
- **备选**：按进程名生成用法。否决，两个名字的输出必须相同，静态文本更短。

## Risks / Trade-offs

- [旧版本全局安装只有 `osi`] → 升级到含第二个 bin 的版本后，`openspec-impact` 才会出现在 PATH。不迁移已安装的 skill 文件。
