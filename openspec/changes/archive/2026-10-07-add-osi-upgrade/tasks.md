## 1. 刷新已安装的 agent

- [x] 1.1 在安装根上判定已安装的 agent：该 agent 的 `opsx-impact` skill 文件或其 `osi-impact` 旧 skill 文件存在。安装根与 `runInit` 相同
- [x] 1.2 只把这些 id 交给 `runInit`。一个都没有时不写文件，退出 0

## 2. 命令

- [x] 2.1 `osi` 与 `openspec-impact` 接受 `upgrade`。无子命令的用法文本列出 `upgrade`。不提示，不打印 YAML
- [x] 2.2 未设置 `OSI_UPGRADE_REFRESH` 时执行 `npm install -g openspec-impact@latest`。失败则返回 npm 的退出码且不写文件。成功则用 `npm root -g` 定位新的 `dist/src/cli.js`，以 `OSI_UPGRADE_REFRESH=1` 再执行它的 `upgrade`

## 3. 测试

- [x] 3.1 项目没有任何 skill 文件时，更新成功后不创建文件且退出 0
- [x] 3.2 已有 Cursor skill、没有 Claude skill 时，只刷新 Cursor，不创建 Claude 的文件
- [x] 3.3 仅有 `.cursor/skills/osi-impact/SKILL.md` 时，升级后该文件消失，opsx-impact 的 skill 与 command 与包内模板一致
- [x] 3.4 安装步骤失败时非零退出，且项目文件不变。测试不访问 registry

## 4. 文档

- [x] 4.1 README 中英文把升级步骤改成在项目里执行 `osi upgrade`。首次安装 skill 仍写 `osi init`
