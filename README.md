# openspec-impact

[English](#english) | [中文](#中文)

## English

`openspec-impact` provides the `osi` CLI for gathering deterministic evidence about a live [OpenSpec](https://github.com/Fission-AI/OpenSpec) change. It finds code files that match explicit citations in the change docs and adds limited Git history. It does not decide which files must change, and the CLI does not call an LLM.

The optional Cursor skill (`/osi-impact`) reads the evidence and writes a human-readable impact report. For a product-manager-oriented overview, see [the product guide](docs/product-overview.md).

### Requirements

- Node.js 18 or later and Git.
- `rg` is optional. Without it, `osi` walks the project files and searches their contents directly.

### Quick start

Install the latest release globally:

```bash
npm install -g openspec-impact@latest
```

In the project that contains the live OpenSpec change, install or refresh the Cursor skill and command:

```bash
cd your-openspec-project
osi init
```

Then invoke the slash command in Cursor:

```text
/osi-impact add-renewal-status
```

To get YAML evidence directly in a terminal, run:

```bash
osi impact add-renewal-status
```

`osi init` creates or updates `.cursor/skills/osi-impact/SKILL.md` and `.cursor/commands/osi-impact.md` in the nearest OpenSpec project root.

After upgrading the global package, run `osi init` again to refresh and overwrite these project files with the templates from the new version:

```bash
npm install -g openspec-impact@latest
osi init
```

If the `osi` command is not found after installation, add npm's global executable directory to your `PATH`. On Unix-like systems, this is the `bin` directory under `npm prefix -g`; on Windows, it is the directory returned by `npm prefix -g`.

### Commands

```text
osi impact [--no-search] [--include-low] <change-id|path>
osi scope  [--no-search] [--include-low] <change-id|path>
osi history <change-id|path>
osi init
```

`<change>` is a live change id, such as `add-renewal-status`, or a path such as `openspec/changes/add-renewal-status`. Archived changes are not resolved by id.

| Command       | Output                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| `osi impact`  | Main evidence pipeline: named seeds, citation references, and history.         |
| `osi scope`   | `concepts`, ranked `candidates`, and related `tests`.                          |
| `osi history` | `seeds` and `history`, with the same history rules as `impact`; no `refs` key. |
| `osi init`    | Installs the Cursor skill and slash command in the OpenSpec project.           |

- `--no-search` keeps harvested concepts but skips the repository scan. In `scope`, `candidates` and `tests` are empty; in `impact`, `seeds`, `refs`, and `history` are empty.
- `--include-low` adds up to 20 low-confidence candidates to `scope`. The flag is accepted by `impact`, but does not add low-confidence rows to its output; `impact` reports named high-confidence seeds.

### `osi impact` output

The successful output is one YAML document with `version`, `change`, `seeds`, `refs`, and `history` at the top level:

```yaml
version: 1
change:
  name: 'add-renewal-status'
  path: 'openspec/changes/add-renewal-status'
seeds:
  - 'src/pages/tenant/TenantList.tsx'
refs:
  - path: 'src/pages/tenant/TenantList.tsx'
    term: 'TenantList'
    others: 0
    wide: false
    sample: []
history:
  - path: 'src/services/tenant.ts'
    via: 'src/pages/tenant/TenantList.tsx'
    commits: 2
    reason: co_change
```

- `seeds` are named, high-confidence files that match a citation by filename or symbol. They are starting points, not a complete change list.
- Each `refs` row describes the seed's citation term and how often it appears in other source files. `others` counts distinct non-test files with a content or symbol match; it does not measure dependency. `sample` lists up to 8 example paths. `wide: true` means the term matched content or symbols in more than 80 files; `sample` is then empty.
- `history` may contain `co_change` or `sibling` rows. A `co_change` neighbor appeared with the seed in at least 2 qualifying commits in the same Git repository during the last 18 months. Merge commits and commits touching more than 30 files are ignored; each seed contributes at most 10 co-change rows.
- If a seed has an enclosing Git root, no qualifying co-change rows, and `refs.others` is below 30, `history` may include up to 4 same-directory siblings selected by a limited filename rule or by `refs.sample`. A sibling has `reason: sibling` and `commits: 0`; that value is not historical support. When `refs.others` is 30 or more, neither co-change nor sibling expansion runs for that seed. A seed without a Git root has no history rows.
- The complete `history` list is capped at 50 rows. History rows have no `confidence` score.

### `osi scope` output

`scope` returns `concepts`, `candidates`, and `tests`:

```yaml
version: 1
change:
  name: 'add-renewal-status'
  path: 'openspec/changes/add-renewal-status'
concepts:
  - text: 'TenantList'
candidates:
  - path: 'src/pages/tenant/TenantList.tsx'
    confidence: high
    reasons:
      - type: symbol_match
        term: 'TenantList'
tests:
  - path: 'src/pages/tenant/TenantList.test.tsx'
    related_to: 'src/pages/tenant/TenantList.tsx'
```

Search uses explicit typed citations from the change docs: paths, code symbols, HTTP method/path pairs, and permission or configuration codes. It does not turn headings or ordinary prose into search terms, and it drops citations under Out of scope / 不在范围. Candidate confidence is a lexical match category, not a probability that the file must change.

### Contributor setup

From a checkout of this repository, build and link the CLI:

```bash
npm install
npm run build
npm link
```

Run the checks from the checkout:

```bash
npm test
npm run fmt
```

## 中文

`openspec-impact` 提供命令行工具 `osi`，为一份进行中的 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 变更收集确定性证据。它根据变更文档里的明确引用寻找代码文件，再补充有限的 Git 历史线索。它不会决定哪些文件必须修改，CLI 本身也不调用大模型。

可选的 Cursor 技能 `/osi-impact` 会读取这些证据并生成易读的影响面报告。面向产品经理的介绍见[产品说明](docs/product-overview.md)。

### 环境要求

- Node.js 18 或更高版本，以及 Git。
- `rg` 是可选的。没有 `rg` 时，`osi` 会遍历项目文件并直接搜索文件内容。

### 快速开始

全局安装最新版本：

```bash
npm install -g openspec-impact@latest
```

在包含进行中 OpenSpec 变更的目标项目里，安装或刷新 Cursor 技能和斜杠命令：

```bash
cd your-openspec-project
osi init
```

然后在 Cursor 中调用斜杠命令：

```text
/osi-impact add-renewal-status
```

如需直接在终端获取 YAML 证据，运行：

```bash
osi impact add-renewal-status
```

`osi init` 会在最近的 OpenSpec 项目根目录创建或更新 `.cursor/skills/osi-impact/SKILL.md` 和 `.cursor/commands/osi-impact.md`。

升级全局安装的包后，再次运行 `osi init`，用新版本模板刷新并覆盖项目中的这两个文件：

```bash
npm install -g openspec-impact@latest
osi init
```

如果安装后找不到 `osi` 命令，请将 npm 的全局可执行文件目录加入 `PATH`。在类 Unix 系统中，它是 `npm prefix -g` 返回目录下的 `bin`；在 Windows 中则是 `npm prefix -g` 返回的目录。

### 命令

```text
osi impact [--no-search] [--include-low] <change-id|path>
osi scope  [--no-search] [--include-low] <change-id|path>
osi history <change-id|path>
osi init
```

`<change>` 可以是进行中的变更 id（如 `add-renewal-status`），也可以是路径（如 `openspec/changes/add-renewal-status`）。归档变更不能只靠 id 解析。

| 命令          | 输出                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `osi impact`  | 默认证据管线：具名种子、引用情况和历史线索。                            |
| `osi scope`   | `concepts`、排序后的 `candidates` 和相关 `tests`。                      |
| `osi history` | `seeds` 和 `history`，使用与 `impact` 相同的历史规则，但不输出 `refs`。 |
| `osi init`    | 在 OpenSpec 项目安装 Cursor 技能和斜杠命令。                            |

- `--no-search` 保留从变更文档抽出的概念，但跳过仓库搜索。`scope` 的 `candidates` 和 `tests` 会为空；`impact` 的 `seeds`、`refs` 和 `history` 会为空。
- `--include-low` 让 `scope` 额外输出最多 20 个低置信度候选。`impact` 虽接受此参数，但不会因此多输出低置信度项；它只报告具名高置信度种子。

### `osi impact` 输出

成功时输出一份 YAML，顶层字段为 `version`、`change`、`seeds`、`refs` 和 `history`：

```yaml
version: 1
change:
  name: 'add-renewal-status'
  path: 'openspec/changes/add-renewal-status'
seeds:
  - 'src/pages/tenant/TenantList.tsx'
refs:
  - path: 'src/pages/tenant/TenantList.tsx'
    term: 'TenantList'
    others: 0
    wide: false
    sample: []
history:
  - path: 'src/services/tenant.ts'
    via: 'src/pages/tenant/TenantList.tsx'
    commits: 2
    reason: co_change
```

- `seeds` 是文件名或符号与文档引用对应、且达到高置信度的文件。它们是核对起点，不是完整改动清单。
- 每条 `refs` 说明 seed 对应的引用词及该词在其它源码文件中的出现情况。`others` 统计包含该词的不同非测试文件数，不代表依赖数量。`sample` 最多列 8 个示例路径。若内容或符号命中超过 80 个文件，`wide` 为 `true`，此时 `sample` 为空。
- `history` 可能包含 `co_change` 或 `sibling`。`co_change` 表示同一 Git 仓库内的文件在过去 18 个月里至少 2 次与 seed 出现在同一条符合条件的提交中；合并提交和一次改动超过 30 个文件的提交会被忽略。每个 seed 最多输出 10 条同改记录。
- 如果 seed 有所属的 Git 根目录、没有符合条件的同改记录，且 `refs.others` 小于 30，`history` 可能补充最多 4 个同目录文件：按有限的文件名规则匹配，或来自 `refs.sample`。这类行的 `reason` 是 `sibling`，`commits` 为 0，不代表有历史同改支持。`refs.others` 达到 30 时，该 seed 不做同改或兄弟文件扩展；没有 Git 根目录的 seed 不会有 history 行。
- `history` 总计最多 50 条；历史行没有 `confidence` 分数。

### `osi scope` 输出

`scope` 返回 `concepts`、`candidates` 和 `tests`：

```yaml
version: 1
change:
  name: 'add-renewal-status'
  path: 'openspec/changes/add-renewal-status'
concepts:
  - text: 'TenantList'
candidates:
  - path: 'src/pages/tenant/TenantList.tsx'
    confidence: high
    reasons:
      - type: symbol_match
        term: 'TenantList'
tests:
  - path: 'src/pages/tenant/TenantList.test.tsx'
    related_to: 'src/pages/tenant/TenantList.tsx'
```

搜索词只来自变更文档中明确标记的类型化引用：文件路径、代码符号、HTTP 方法与路径、权限或配置码。标题和普通描述不会被拆成搜索词；Out of scope / 不在范围里的引用会被排除。候选的置信度表示词法匹配档位，不代表文件必须修改的概率。

### 贡献者设置

在本仓库的 checkout 中构建并链接 CLI：

```bash
npm install
npm run build
npm link
```

在 checkout 中运行检查：

```bash
npm test
npm run fmt
```
