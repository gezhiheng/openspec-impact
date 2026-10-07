## 1. Workflow

- [x] 1.1 添加 `.github/workflows/ci.yml`：`check` 在 `pull_request` 与推送到 `main` 时，于 Node 18 和 Node 22 上运行 `npm ci` 与 `npm test`；`npm run fmt:check` 只在 Node 22 上运行
- [x] 1.2 `publish` 仅在推送到 `main` 且 `check` 成功后运行；用 `node` 比较 `github.event.before` 与当前 `package.json` 的 `version`（checkout `fetch-depth: 0`）。起点为 40 个 0、起点版本读不到、两端版本相同，或新版本含 `-` 时不发布
- [x] 1.3 `publish` 使用 Node 22、`contents: read`、`id-token: write`，对 `https://registry.npmjs.org` 执行 `npm publish --provenance`，不设置 `NODE_AUTH_TOKEN`。concurrency 组 `npm-publish`，`cancel-in-progress: false`
- [x] 1.4 本变更不修改 `package.json` 的 `version`

## 2. 贡献者说明

- [x] 2.1 在 README 英文 Contributor setup 与中文贡献者设置中写明：推到 `main` 且 `version` 改变会发布该版本；不要再对本机同一版本执行 `npm publish`；发布失败时重跑该次 Actions run

## 3. 发布者

- [ ] 3.1 workflow 已在 `main` 且该次推送未改 `version` 之后，由维护者在 npm 的 `openspec-impact` 上添加 Trusted Publisher：仓库 `gezhiheng/openspec-impact`，workflow 文件 `ci.yml`，并允许直接 `npm publish`。2026-09-03 之后新建的配置默认只有 stage；首次成功发布须在创建后 2 天内完成，否则配置过期
