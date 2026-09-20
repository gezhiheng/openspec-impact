# openspec-impact

[English](#english) | [中文](#中文)

## English

Deterministic evidence CLI for a live [OpenSpec](https://github.com/Fission-AI/OpenSpec) change. Package name `openspec-impact`, binary `osi`.

It harvests typed citations from change docs, searches the repo, and (optionally) expands git co-change neighbors. Output is YAML on stdout. It does **not** decide which files must change, and it does not call an LLM.

A Cursor skill (`/osi-impact`) reads that YAML and writes the impact surface in prose.

Requires Node 18+ and `git`. Uses `rg` when available, otherwise `git grep`.

### Install

```bash
npm install
npm run build
npm link          # puts `osi` on PATH
```

In the project that contains `openspec/changes/`:

```bash
osi init          # writes .cursor/skills/osi-impact/ and .cursor/commands/osi-impact.md
```

### Usage

```
osi impact [--no-search] [--include-low] <change-id|path>
osi scope  [--no-search] [--include-low] <change-id|path>
osi history <change-id|path>
osi init
```

`<change>` is a live change id (`add-renewal-status`) or a path (`openspec/changes/add-renewal-status`). Archived changes are not resolved by id.

| Command | What you get |
|---|---|
| `osi impact` | Evidence pipeline: named seeds + co-change history (this is the default Skill input) |
| `osi scope` | Lexical candidates: `concepts`, `candidates`, `tests` |
| `osi history` | Same YAML shape as `impact` (seeds + history only) |
| `osi init` | Installs the Cursor skill and slash command into the OpenSpec project root |

`--no-search` harvests concepts but skips the repository scan (`seeds` / `candidates` empty). `--include-low` adds up to 20 low-confidence scope hits (default omits them).

### `osi impact` YAML

```yaml
version: 1
change:
  name: "add-renewal-status"
  path: "openspec/changes/add-renewal-status"
seeds:
  - "src/pages/tenant/TenantList.tsx"
history:
  - path: "src/services/tenant.ts"
    via: "src/pages/tenant/TenantList.tsx"
    commits: 2
    reason: co_change
```

`seeds` are named high hits (filename / stem matches a citation). `history` rows are same-repo files that co-occurred with a seed in ≥2 non-merge commits (last 18 months, commits touching >30 files ignored). No `confidence` on history rows.

### `osi scope` YAML

```yaml
version: 1
change:
  name: "add-renewal-status"
  path: "openspec/changes/add-renewal-status"
concepts:
  - text: "TenantList"
candidates:
  - path: "src/pages/tenant/TenantList.tsx"
    confidence: high
    reasons:
      - type: symbol_match
        term: "TenantList"
tests:
  - path: "src/pages/tenant/TenantList.test.tsx"
    related_to: "src/pages/tenant/TenantList.tsx"
```

Search terms are typed citations only (paths, PascalCase symbols, `METHOD /path`, `SCREAMING_SNAKE` codes). Bag-of-words from headings or kebab change ids is not queried. Citations under Out of scope / 不在范围 are dropped.

### Develop

```bash
npm test          # tsc + node:test
npm run fmt       # oxfmt + oxlint
```

---

## 中文

面向一份进行中的 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 变更的**确定性证据** CLI。包名 `openspec-impact`，命令 `osi`。

它从变更文档里抽出带类型的引用（路径、符号、API、权限码），在仓库里搜文件，再用 git 同改记录补邻居。结果打到 stdout 的 YAML。**不判断**哪些文件必须改，也不调大模型。

Cursor skill（`/osi-impact`）读这份 YAML，用人话写影响面。

需要 Node 18+ 和 `git`。优先用 `rg`，没有则退到 `git grep`。

### 安装

```bash
npm install
npm run build
npm link          # 把 `osi` 挂到 PATH
```

在含有 `openspec/changes/` 的项目里：

```bash
osi init          # 写入 .cursor/skills/osi-impact/ 和 .cursor/commands/osi-impact.md
```

### 用法

```
osi impact [--no-search] [--include-low] <change-id|path>
osi scope  [--no-search] [--include-low] <change-id|path>
osi history <change-id|path>
osi init
```

`<change>` 是进行中的变更 id（`add-renewal-status`）或路径（`openspec/changes/add-renewal-status`）。归档变更不能只靠 id 解析。

| 命令 | 输出 |
|---|---|
| `osi impact` | 证据管线：具名种子 + 同改历史（Skill 默认输入） |
| `osi scope` | 词法候选：`concepts`、`candidates`、`tests` |
| `osi history` | 与 `impact` 同形（只有 seeds + history） |
| `osi init` | 把 Cursor skill 和斜杠命令装到 OpenSpec 项目根 |

`--no-search` 只抽概念、不扫仓库。`--include-low` 最多再带 20 条低置信候选（默认丢掉）。

### 证据长什么样

`osi impact` 给出 `seeds`（文件名/词干命中了文档引用的高置信文件）和 `history`（与种子在同一 git 仓库、近 18 个月、非 merge、单次提交不超过 30 个文件、共同出现 ≥2 次的邻居）。history 行没有 `confidence`。

`osi scope` 给出 `concepts` / `candidates` / `tests`。搜索词只来自带类型的引用，不用标题或 kebab 变更名做词袋。Out of scope / 不在范围 里的引用不会进搜索。

### 开发

```bash
npm test          # tsc + node:test
npm run fmt       # oxfmt + oxlint
```
