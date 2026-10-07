## Context

参见 `proposal.md` 的 Why。`runInit` 已经会覆盖选中 agent 的 skill，并删除路径里的 `osi-impact` 旧文件。模板来自当前进程所在包的 `templates/`。`packageRoot()` 从正在执行的模块向上找 `package.json`。

## Goals / Non-Goals

**Goals:**

- 一次 `upgrade` 先完成全局安装，再让新包里的代码执行刷新。
- 已安装的判定只看 skill 文件是否存在，然后交给现有的 `runInit`。

**Non-Goals:**

- pnpm、yarn、bun，或项目本地依赖里的那份包。
- 刷新当前项目以外的目录。
- `upgrade` 上的 `--agent`、交互选择，或改 `osi init` 的离线行为。

## Decisions

### 先安装，再执行新包里的刷新

- **选择**：未设置内部环境变量时，`upgrade` 执行 `npm install -g openspec-impact@latest`，stdio 继承。退出码非 0 则原样返回，不写文件。成功后用 `npm root -g` 定位 `openspec-impact/dist/src/cli.js`，以 `OSI_UPGRADE_REFRESH=1` 再启动那个文件的 `upgrade`。子进程看到该变量时跳过 npm，只做刷新。
- **原因**：当前进程的 `import.meta.url` 仍指向启动时的包，直接 `runInit` 会复制旧模板。环境变量防止新二进制再次安装。
- **替代方案**：在同一进程里读全局 `node_modules` 的模板。路径和渲染仍要分叉一份，而且旧代码不认识新模板的安装规则。

### 用 skill 文件决定 agent，再调用 runInit

- **选择**：安装根与 `runInit` 相同，`findProjectRoot(cwd) ?? cwd`。对每个 adapter，若 `<root>/<skill>` 存在，或把该相对路径中的 `opsx-impact` 换成 `osi-impact` 后的文件存在，则该 agent 已安装。把这些 id 交给 `runInit`。一个都没有时直接返回，退出 0。
- **原因**：`init` 写过的 agent 总会留下 skill 文件；只存在 `.cursor` 这类标记并不表示装过。旧名文件要算已安装，这样现有的 `removePrevious` 才会把它们换成 `opsx-impact`。
- **替代方案**：再跑一遍 `init` 的检测并默认全选。没装过的工具会被新写成 skill。

### 测试不访问 registry

- **选择**：安装步骤做成可替换的一次调用。失败的测试断言没有写入。刷新测试直接调用选择和 `runInit`，模板就是测试进程所在的包。不把真实 `npm install -g` 放进测试。
- **原因**：规格要求的是「更新成功之后的包」和「失败时不写文件」。联网安装不是这次要锁的行为。
- **替代方案**：CI 里对 registry 做真实全局安装。慢，而且改到跑测试的机器。

## Risks / Trade-offs

- [全局 prefix 不可写，或 `npm` 不在 PATH] → 安装步骤失败，项目文件不动，stderr 留给 npm。
- [`npm root -g` 指向的不是刚装上的那份包] → 刷新仍可能复制旧模板。文档只承诺 npm 全局安装这一条路径。
- [用户改过项目里的 SKILL.md] → 已安装的 agent 会被包内模板覆盖，与 `osi init` 相同。

## Migration Plan

1. 实现 `upgrade` 与测试，用法文本加上该子命令。
2. README 中英文把升级步骤改成在项目里执行 `osi upgrade`。首次安装 skill 仍用 `osi init`。
