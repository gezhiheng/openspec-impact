## Context

参见 `proposal.md` 的 Why。当前 `package.json` 已声明 `openspec-impact` 包名、`osi` bin 和 Node.js 18 最低版本。`src/cli.ts` 有 Node shebang；`osi init` 会从包根目录读取 `templates/`。不过 `dist/` 被 git 忽略，现有 npm 生命周期不会在打包前生成它；目前的 tarball 也会包含测试、fixture 和 OpenSpec 历史文件。

## Goals / Non-Goals

**Goals:**

- 从干净 checkout 创建可安装的 npm tarball，安装后 `osi` 可执行。
- 保留 `osi init` 所需的 Cursor 模板，并通过 tarball 验证全局安装流程。
- 让普通用户文档以 npm 安装为首选，同时保留开发者的本地链接方式。

**Non-Goals:**

- 在本次变更中扩展 Cursor 以外的 Agent 集成。
- 改动 `osi` 的证据算法、YAML 输出或 `osi init` 的现有目标路径和覆盖行为。
- 新增运行时依赖、Homebrew 或独立二进制分发。

## Decisions

### 打包时构建并限制发布文件

- **选择**：在 `package.json` 增加 `prepack` 构建步骤，并用 `files` 白名单包含 `dist/src/**`、`templates/**`、README 和 README 链接的产品说明。
- **原因**：`prepack` 同时覆盖 `npm pack` 和 `npm publish`，因此干净 checkout 也能生成 bin 指向的文件。白名单能排除 `dist/tests`、fixture 和 `openspec/` 历史记录，又保留 CLI 和模板所需内容。
- **替代方案**：提交 `dist/` 构建产物，或依赖发布者手动先运行 build；两者都会增加不同步风险或引入容易遗漏的发布步骤。

### 保持现有包名和 `osi` bin

- **选择**：沿用 manifest 中的未 scoped 包名 `openspec-impact` 和命令名 `osi`。README 的快速开始使用 `npm install -g openspec-impact@latest`，之后在项目中执行 `osi init`。
- **原因**：保持当前项目身份与 CLI 命令；全局安装适合反复在不同项目中调用的工具，`osi init` 将对应版本的 Cursor 文件安装到具体项目。
- **替代方案**：`npm exec` 无需全局安装，但调用更长且 skill 运行时要求 `osi` 在 PATH；项目本地依赖适合团队锁版本，可留作补充说明。

### 用干净 tarball 验证发布体验

- **选择**：在包含待发布改动、已安装开发依赖但没有 `dist/` 的临时源码副本中运行 `npm pack`。将 tarball 全局安装到临时 npm prefix，禁用安装生命周期脚本，证明用户安装不需要 TypeScript 或本地构建。从该 prefix 的已安装 `osi` 调用 `init` 和 `impact`，目标始终是 `tests/fixtures/mini-repo` 的临时 Git 副本。比对 Cursor 文件与包内模板，并确认 impact 输出预期的 fixture seed 与 YAML 字段。
- **原因**：只在仓库 checkout 中运行命令无法发现打包漏文件、bin 路径或包根定位错误。
- **替代方案**：只检查 `npm pack --dry-run` 文件列表；它不能证明安装后的 bin 和模板路径能正常工作。

## Risks / Trade-offs

- [当前 registry 返回 404，但名称和发布权限仍可能受占用或权限影响] → 使用 `openspec-impact` 作为暂定名称；首次发布前由 npm registry 的实际发布校验确认。
- [用户更新 npm 包后，项目里的 Cursor 文件仍是旧版本，直到再次运行 init] → README 清楚说明升级后重新执行 `osi init` 可刷新模板；该命令已有覆盖更新行为。
- [全局 npm bin 目录不在 PATH 时用户会认为安装失败] → README 加入检查 npm global bin PATH 的简短说明。

## Migration Plan

1. 配置打包生命周期与白名单，更新中英文 README。
2. 运行测试、格式检查和 tarball 安装验证。
3. 使用当前版本 `0.1.0` 作为首发候选；具备 npm 发布权限的维护者确认 registry 状态后发布已验证的 tarball，再从 registry 安装到隔离 prefix 完成 fixture 验证。
4. 用户按 `npm install -g openspec-impact@latest` 安装，在目标项目运行 `osi init`；升级时重复这两步。若发布失败，修正错误后重试；若已发布版本有缺陷，修复后发布新的 patch 版本，不覆盖已发布版本。
