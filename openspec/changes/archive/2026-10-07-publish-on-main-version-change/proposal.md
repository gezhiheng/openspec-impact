## Why

`openspec-impact` 已在公共 npm 上，但每次发布都是维护者在本机执行 `npm publish`。推到 `main` 的版本没有统一的检查门，仓库里也没有和 registry 对齐的发布记录。版本号已经由人改在 `package.json` 里，缺的是：到了 `main` 且版本变了，就自动发出去。

## What Changes

- 推送到 `main` 时运行现有的 `fmt:check` 和 `npm test`。
- 同一次 push 的起点与终点上，`package.json` 的 `version` 不同，且检查通过，则将该版本发布到 npm 的 `latest`。
- 版本字符串含 `-` 的预发布号不发布到 `latest`。
- 使用 npm Trusted Publisher（OIDC）发布并附带 provenance。仓库不存放 npm token。
- 发布失败时重跑该次 workflow。后续未再改版本的 push 不重复发布。

## Capabilities

### New Capabilities

### Modified Capabilities

- `osi-distribution`: 推送到 `main` 后，仅当 `package.json` 的 `version` 相对该次 push 的起点发生改变且检查通过时，将该版本发布为 npm `latest`。

## Impact

- 新增 GitHub Actions workflow。发布 job 依赖检查 job，进行中的发布不因后续 push 被取消。
- 维护者在 npm 上为包 `openspec-impact`、仓库 `gezhiheng/openspec-impact` 配置一次 Trusted Publisher。workflow 文件名在配置之后保持不变。
- README 贡献者说明补一句：改 `main` 上的 `version` 会发布；同一版本不要再在本机 `npm publish`。
- 不改 CLI、`prepack`、`files` 白名单，也不由 CI 改版本号。
