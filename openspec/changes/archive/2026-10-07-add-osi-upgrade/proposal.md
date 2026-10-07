## Why

用户升级 `openspec-impact` 要先自己执行 `npm install -g`，再在项目里重跑 `osi init`。漏掉第二步时，命令行已是新版本，项目里的 skill 仍是旧副本。只重跑 `init` 又会按当前已安装的包复制模板，拿不到这次 npm 更新里的 skill 改动。

## What Changes

- 新增 `osi upgrade`（`openspec-impact upgrade` 相同）。它先把全局包安装到 `openspec-impact@latest`，再用更新后的包刷新当前项目里已经装过的 skill。
- 某个 agent 没有 `opsx-impact` 或旧名 `osi-impact` 的 skill 文件时，不给它创建 skill。整个项目都没装过时，包更新成功后退出 0，不写文件。
- npm 安装失败时非零退出，且不改项目里的 skill。
- `osi init` 仍只负责选择并安装，不联网。

## Capabilities

### New Capabilities

### Modified Capabilities

- `osi-init`: `osi upgrade` 更新全局包，并只刷新当前项目中已经安装过的 agent skill。

## Impact

- `src/cli.ts` 的用法文本和子命令解析。
- `src/commands/init.ts` 已有的安装、覆盖和旧名删除，供 upgrade 在选定的 agent 上复用。
- README 中英文的升级说明改为 `osi upgrade`。
- 不改证据命令、YAML，也不改 `osi init` 的选择和离线行为。
