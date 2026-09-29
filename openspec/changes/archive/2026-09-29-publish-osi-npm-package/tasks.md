## 1. 打包配置

- [x] 1.1 在 `package.json` 添加 `prepack` 构建步骤，保留现有包名、`0.1.0` 首发候选版本、`osi` bin 与 Node.js engine 要求。
- [x] 1.2 添加 `files` 白名单，包含 `dist/src`、两份 Cursor 模板及 README 链接的产品说明，排除测试、fixture 和仓库 OpenSpec 历史文件。

## 2. 用户文档

- [x] 2.1 更新 README 中英文快速开始：`npm install -g openspec-impact@latest`，进入目标项目执行 `osi init`，在 Cursor 调用 `/osi-impact <change>`；另列 `osi impact <change>` 直接获取证据的方式。
- [x] 2.2 说明升级包后需再次运行 `osi init` 刷新并覆盖项目中的模板、Node.js/Git 要求及 npm global bin PATH 提示；将 checkout、构建和 `npm link` 放到贡献者设置中。

## 3. 打包验证

- [x] 3.1 从包含待发布改动、已安装开发依赖但没有 `dist/` 的临时源码副本运行 `npm pack`；检查 tarball 包含完整运行时、两份模板和文档，排除测试、fixture 和 OpenSpec 历史。
- [x] 3.2 将 tarball 以 `npm install -g --prefix <temp-prefix> --ignore-scripts <tarball>` 安装；从该 prefix 的 bin 在 `tests/fixtures/mini-repo` 的临时 Git 副本中运行 `osi init`，比对两个生成文件与包内模板，再修改生成文件并重跑 init 验证刷新。
- [x] 3.3 使用同一个已安装的 bin 在 fixture 临时副本中运行 `osi impact add-renewal-status`，检查退出码、YAML 字段与预期 seed，确保不依赖源码 checkout 或开发依赖。
- [x] 3.4 运行 `npm test`、`npm run fmt:check` 和 `openspec validate publish-osi-npm-package --strict`，记录 tarball 验证结果。

  `npm test`（58/58）和严格校验通过；`npm run fmt:check` 仅被 `HEAD` 中未改动的 `AGENTS.md` 与 `docs/product-overview.md` 格式问题阻断，本次改动文件已通过 `oxfmt --check`、`oxlint` 和 `git diff --check`。已验证的 tarball 含 16 个发布文件，并完成隔离安装、`osi init` 刷新和 fixture `osi impact` smoke test。

## 4. 首次发布

- [x] 4.1 确认 npm 登录账号及 `openspec-impact` 名称/版本状态，使用维护者的发布权限将已验证的 tarball 发布到公共 registry 的 `latest` 标签。
- [x] 4.2 从 registry 将 `openspec-impact@latest` 全局安装到新的临时 prefix，使用该 bin 在 fixture 的临时 Git 副本重做 `osi init` 和 `osi impact` 验证，记录已发布版本及 registry 地址。已发布版本为 `0.1.0`，registry 为 `https://registry.npmjs.org/`。
