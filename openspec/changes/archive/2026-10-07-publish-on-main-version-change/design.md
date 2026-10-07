## Context

参见 `proposal.md` 的 Why。包 `openspec-impact` 的 `latest` 已是 `0.3.2`。`prepack` 会在 `npm publish` 前运行 `tsc`，`files` 白名单已限制 tarball。仓库没有 GitHub Actions，也没有 git tag。`package-lock.json` 根上的 `version` 仍是 `0.2.1`，`npm ci` 目前可以通过。

## Goals / Non-Goals

**Goals:**

- 同一个 workflow 在 pull request 和推送到 `main` 时跑检查，只在 `main` 上版本变化时发布。
- 版本比较、预发布跳过、发布排队都在 workflow 里完成，不新增依赖。

**Non-Goals:**

- CI 修改版本、打 git tag、写 changelog。
- 把含 `-` 的版本发到 `latest` 以外的 dist-tag。
- `workflow_dispatch`、semantic-release、changesets。
- 在 CI 里做临时 prefix 的全局安装冒烟。
- 为这次发布去对齐 lockfile 根上的 `version`。

## Decisions

### 一个 workflow 文件，检查与发布分开

- **选择**：`.github/workflows/ci.yml`。`check` 在 `pull_request` 和推送到 `main` 时运行。`publish` 仅在推送到 `main`、`check` 成功、且版本条件满足时运行。
- **原因**：拉取请求要先挡住会发布失败的检查；发布又不能在合并前发生。一个文件对应 npm Trusted Publisher 里登记的那一个 workflow 文件名。
- **替代方案**：检查与发布分成两个文件。发布者配置要多记一个名字，拉取请求仍要单独的检查文件。

### 用 push 的两端比较 version

- **选择**：读 `github.event.before` 与当前 `package.json` 的 `version`。checkout 使用 `fetch-depth: 0`，以便起点 SHA 在本地。起点是 40 个 0，或 `git show <before>:package.json` 失败时，不发布。用 `node` 读取 JSON，不用 jq。
- **原因**：一次 push 里可以有多个 commit，两端才是「这次进 main 的版本有没有变」。全历史对这个仓库足够小。读不到起点就发布，会把无法比较的 push 发出去。
- **替代方案**：只和 `HEAD~1` 比。多 commit 的合并会漏掉更早的版本改动，或在 squash 之外的合并里看错父提交。

### 发布用 Trusted Publisher

- **选择**：`publish` job 设置 `id-token: write` 与 `contents: read`，在决定发布之后执行 `npm install -g npm@11` 和 `npm publish --provenance`。不设置 `registry-url`，不设置 `NODE_AUTH_TOKEN`。`package.json` 的 `repository.url` 指向 `github.com/gezhiheng/openspec-impact`。检查 job 在 Node 18 和 Node 22 上跑 `npm ci` 与 `npm test`；`npm run fmt:check` 只在 Node 22 上跑。发布 job 只用 Node 22。
- **原因**：包是未 scoped 的既有公共包，不需要 `--access`。npm 的默认 registry 就是 `https://registry.npmjs.org`。`setup-node` 的 `registry-url` 会写入空的 `_authToken`，npm 因此不再走 OIDC。Trusted Publisher 要求 npm ≥ 11.5.1，Node 22 自带的 npm 仍低于该版本。`repository.url` 必须和 OIDC 里的仓库一致，否则发布被拒绝。CLI 的 `engines` 下限是 18，所以测试要覆盖 18。oxfmt 与 oxlint 的原生包要求 `^20.19.0 || >=22.12.0`，Node 18 上 npm 不会安装这些 optional binding，格式检查只能放在 Node 22。发布只需要一个 Node。provenance 依赖该 job 的 OIDC。
- **替代方案**：仓库 secret 里放 NPM token。长期凭证留在 GitHub 上，和「短期凭证」的要求相反。

### 预发布与排队

- **选择**：新 `version` 含 `-` 时 `publish` 跳过。`publish` job 使用 concurrency 组 `npm-publish`，`cancel-in-progress: false`。
- **原因**：默认的 `npm publish` 会移动 `latest`。排队保证 `0.3.3` 不会被紧接着的 `0.3.4` 取消。
- **替代方案**：预发布发到 `beta` tag。当前没有这条发布线。

### 失败后重跑原 run

- **选择**：不增加手动触发。发布失败后重跑失败的那次 GitHub Actions run。
- **原因**：后续 push 若版本未变，按规格不得发布。重跑保留原来的起点和终点。
- **替代方案**：`workflow_dispatch` 再发当前 `main`。那是另一次触发，容易把「版本没变也发」做成第二条路。

## Risks / Trade-offs

- [workflow 与版本改动同一 push 合入，但 Trusted Publisher 尚未配置] → 先合入不改 `version` 的 workflow，在 npm 配好发布者，之后再改版本。
- [发布失败后版本已在 `main`，下一次不改版本的 push 不会重试] → 重跑失败的那次 run。
- [维护者已在本机发布过同一版本] → registry 拒绝覆盖，workflow 失败，已发布内容不变。
- [直接 push 到 `main` 也会发布] → 与「到了 `main` 且版本变了就发」同一规则。检查 job 仍先运行。

## Migration Plan

1. 添加 `ci.yml` 与 README 中英文贡献者说明。此提交不修改 `package.json` 的 `version`。
2. 在 npm 的 `openspec-impact` 上添加 Trusted Publisher：仓库 `gezhiheng/openspec-impact`，workflow 文件 `ci.yml`。文件名此后保持不变。
3. 下一次需要发布时，由人修改 `version` 并推到 `main`。workflow 发布该版本。
4. 若要停用自动发布，禁用或删除该 workflow。已经发出的版本保留在 registry 上。
