## ADDED Requirements

### Requirement: A version change on main publishes latest

推送到 `main` 时，仓库 MUST 先运行 `npm run fmt:check` 与 `npm test`。仅当该次 push 终点的 `package.json` `version` 与起点不同、该字符串不含 `-`、且两项检查都通过时，仓库 MUST 把 `openspec-impact` 的这个版本发布到公共 npm registry，且 dist-tag 为 `latest`。发布所用版本 MUST 等于终点上已有的 `version`。发布流程 MUST NOT 修改 `package.json` 的版本。发布凭证 MUST 是该次运行获得的短期凭证。仓库 MUST NOT 包含 npm token。

未合并到 `main` 的变更 MUST NOT 发布。起点版本无法读取时 MUST NOT 发布。新版本已存在于 registry 时，发布 MUST 失败且 MUST NOT 覆盖该版本。一次发布正在进行时，后续 push MUST NOT 取消它。

发布失败后，重跑同一次 push 的发布 MUST 在版本仍是该终点版本时再次尝试发布。其后任何未改变 `version` 的 push MUST NOT 发布。

#### Scenario: 版本未变则不发布

- **WHEN** 一次推送到 `main` 的起点与终点上 `package.json` 的 `version` 相同
- **THEN** registry 上不出现新版本

#### Scenario: 版本改变且检查通过则发布 latest

- **WHEN** 一次推送到 `main` 将 `version` 从已发布版本改为一个不含 `-` 的新版本，且 `npm run fmt:check` 与 `npm test` 都通过
- **THEN** 该新版本出现在公共 npm registry 上
- **AND** 其 dist-tag `latest` 指向该版本

#### Scenario: 检查失败则不发布

- **WHEN** 一次推送到 `main` 改变了 `version`，但 `npm run fmt:check` 或 `npm test` 失败
- **THEN** 该版本不被发布

#### Scenario: 预发布号不进入 latest

- **WHEN** 一次推送到 `main` 将 `version` 改为含 `-` 的字符串
- **THEN** 该版本不被发布为 `latest`

#### Scenario: 拉取请求不发布

- **WHEN** 一个尚未合并到 `main` 的变更修改了 `version`
- **THEN** registry 上不出现该版本

#### Scenario: 已存在的版本不被覆盖

- **WHEN** 终点 `version` 已经存在于公共 npm registry
- **THEN** 发布失败
- **AND** registry 上该版本的内容不变

#### Scenario: 失败后仅重跑同一次 push

- **WHEN** 某次改变了 `version` 的推送发布失败，之后另一次推送到 `main` 的 `version` 与失败时的终点版本相同
- **THEN** 这后一次推送不发布
- **AND** 重跑失败的那一次发布会再次尝试发布该版本
