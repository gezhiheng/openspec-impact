---
name: opsx-impact
description: Judge a live OpenSpec change from `osi` evidence. Usage: /opsx-impact {change}
disable-model-invocation: true
---

# opsx-impact

Usage: `/opsx-impact {change} [--base <name>=<ref> ...]`

`{change}` is a live OpenSpec change id or path. If omitted, ask. Run from the project that contains `openspec/changes/<id>/`. Requires `osi` on PATH. Repeat `--base` once per Git root when that root has no unique default branch. `<name>` is the root's basename or workspace-relative path.

This skill fires only when the user types `/opsx-impact`.

Write the 影响面 in the user's language, chat only. Five headings, every report (planned and empty seeds too): `## 一句话` → `## 影响范围` → `## 可能遗漏` → `## 故意没动` → `## 上线注意`. Files go in parentheses after the 表现.

Steps below are the impact workflow only. Locating/reading code (especially steps 5–7) follows workspace rules such as `AGENTS.md`; this skill does not replace them. If those rules do not cover how to locate code, fall back to grep.

## Steps

1. **Evidence** — run `osi impact {change}`.
   Done: stdout is YAML with `version`, `change`, `seeds`, `refs`, `history`.
   Non-zero: print stderr and stop.

2. **Change docs** — read `proposal.md`, every file under `specs/`, and `design.md` / `tasks.md` when they exist.
   Done: those files have been opened.

3. **Mode** — from `tasks.md` checkboxes (missing file = 0 complete):
   - **planned**: 0 complete
   - **partial**: some complete
   - **done**: all complete

4. **Seeds** — if `seeds` is empty, state that `osi` found no named files. Continue; the change inventory does not depend on seeds.
   Done: empty seeds are recorded, and later steps still run.

5. **Seed files** — open every `seeds` path whose `refs` row has `wide === false`. A seed with `refs.wide === true` is `out` and is not opened; its closing line is 「宽词误伤」. Judge each opened seed `in` / `maybe` / `out` from spec intent, not from filename alone.
   Call 公共组件/公共方法 only when **both** hold: the seed's `refs` row has `wide` or `others ≥ 2`, **and** the filename/path reads as a shared unit (`src/components/PermButton.vue`, `*Util*`, `*Helper*`), not a page/route (`TenantList.tsx`, `pages/`). Cite one `sample` path. `others` is 出现在, not 引用了.
   Done: every seed is `in` / `maybe` / `out`; 公共 is decided from refs + filename.

6. **Neighbors** — open each `history` row (`co_change` or `sibling`) the same way: when `via` is an `in` seed, open that `path`. Still open a `sibling` when `via` is `out` only because the spec says 不做; if that path is the same operation’s other form or list, put it in 「可能漏了」 and quote that 不做 sentence. Promote to `in` when spec semantics connect; keep `maybe` when it is only co-change or sibling; `out` when it hits Out of scope. `commits` is a support count, not a must-change score; `commits: 0` is not a support count. `refs.sample` stays 出现在; do not open a `sample` path that is absent from `history`.

7. **Change inventory** — every in-scope Git root, independent of seeds and history.

   **Roots.** Take repositories and paths the change docs place in scope. For each existing path, `git -C <dir> rev-parse --show-toplevel`. When no documented path resolves, use the Git roots of seed paths and mark those roots inferred in `上线注意`. Inventory only those roots.
   Done: each root is documented or marked inferred. No documented root and no seed root means scope is unresolved.

   **Base.** For each root, one base, in this order:
   - The `--base <name>=<ref>` for that root, when `git -C <root> rev-parse --verify --quiet <ref>^{commit}` succeeds. An override that matches no in-scope root is unresolved coverage under `上线注意`. A failed verify or two overrides for one root leaves that root's committed comparison unresolved.
   - Otherwise one remote default. `git -C <root> for-each-ref --format='%(refname)' 'refs/remotes/*/HEAD'`: exactly one line, then `git -C <root> symbolic-ref` on it, and use the branch it names (`origin/main`). Zero lines: try local. More than one line: unresolved.
   - Otherwise the one local branch among `main` and `master` that `git -C <root> show-ref --verify --quiet refs/heads/<branch>` accepts. Both or neither: unresolved.

   A base is an override, that unique remote default, or that single local branch. The current branch's upstream is not a base, including when the feature branch tracks its remote counterpart.
   Done: each root has one resolved base, or its committed comparison is marked unresolved.

   **Paths.** Union these, then dedup, as workspace-relative POSIX paths. Prefix a nested root's workspace-relative directory. On a rename or copy (`R` or `C`), keep both paths.
   - Committed, only when the base resolved: `git -C <root> diff --name-status --find-renames <base>...HEAD`
   - Staged: `git -C <root> diff --name-status --cached --find-renames`
   - Unstaged tracked: `git -C <root> diff --name-status --find-renames`
   - Untracked non-ignored: `git -C <root> ls-files --others --exclude-standard`

   An unresolved base skips only the committed diff. Staged, unstaged, and untracked paths stay in the inventory. Leave a path the change docs explicitly place out of scope out of the inventory.
   Done: one inventory; both sides of each rename are present; explicitly out-of-scope paths are absent; local changes are present when the base is unresolved.

   **Review.** Read the diff of every in-scope inventory path and judge it against the change requirements. Review a path that is absent from seed `path`s and history `path`s the same way.
   Done: every in-scope inventory path is reviewed, or named unreviewed under `可能遗漏`.

8. **Deliver** — chat only. No YAML dump, no change-directory file, no path table as the main output.

### Shape

**Visualize**

```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│                                         │
│      ┌────────┐         ┌────────┐      │
│      │ State  │────────▶│ State  │      │
│      │   A    │         │   B    │      │
│      └────────┘         └────────┘      │
│                                         │
│   System diagrams, state machines,      │
│   data flows, architecture sketches,    │
│   dependency graphs, comparison tables  │
│                                         │
└─────────────────────────────────────────┘
```

Draw if present, skip if not, under `## 影响范围`. Labels are roles (`列表行按钮`), not class names. 无页面仍五节标题；跳过状态机；有写路径就画保存流。

- 状态机（能改 / 不能改，覆盖 vs 锁住）
- 入口对照（会变的入口写进下面的 `- ` 列表，不另画表）
- 保存/数据流（原 URL → 门禁 → 写哪一行；不是类图）

`## 一句话` — 谁、在哪、会怎样。planned 以「若改」开头。

`## 影响范围` — 图，然后每种不同表现一条 `- `：`- 表现：哪些入口（file）`。表现相同的入口并进同一条，不写「同上」，也不接成一段。相同的 API / ReqDTO / VO / BeanCopy 并进这一条。公共组件/方法且该单元是 `in`、这次会改或已改：这条里点出其它共用处（一个 `sample`；`wide` 写「多处共用」）。标题仍是 `## 影响范围`。

`## 可能遗漏` — spec 要、这次改动没有、用户会受影响，每条一行。Step 6 的「可能漏了」和未审的 in-scope 路径写在这里。未改的入口、没改的孪生写在这里（≤3 个类名）。未勾选的 smoke / 端到端任务是未验证，不是实现缺失。

`未见遗漏` only when every in-scope changed path was reviewed, every committed base resolved, and every explicit smoke or end-to-end task is complete or the change docs mark it skipped. Otherwise name the open evidence and do not write `未见遗漏`. An inferred root does not by itself block `未见遗漏`. Unresolved scope (no root at all) does.

`## 故意没动` — Out of scope / 样板 / 宽词误伤，各一行，不解释为什么扫到。没有则 `无`。

`## 上线注意` — 覆盖、能否 archive、上线，一行。Put an unresolved committed base, inferred roots, and unchecked smoke or end-to-end tasks here. Call unchecked validation 未验证. 没有则 `无`。

Not this: `可能漏了：服务端仍应拦无权限请求，这次 diff 没动（PermCheck.java）。`
Not this: `PC 列表行 会变：按钮消失（PermButton.vue）其它列表 会变：同上（TenantList）。`

**planned**

```text
## 一句话
若改：物业在 PC 工单列表上看不见无权限按钮。

## 影响范围
- 无权限按钮不可见：PC 工单列表和其它用该按钮的列表（如 TenantList；PermButton.vue）

## 可能遗漏
实施时打开服务端校验（PermCheck.java）。

## 故意没动
APP 详情不在这次范围。

## 上线注意
无
```

**partial / done**

```text
## 一句话
物业在 PC 工单列表上看不见无权限按钮。服务端校验可能遗漏。

## 影响范围
[可点]
  └──权限不足──▶ [不可见]

- 无权限按钮不可见：PC 工单列表和其它用该按钮的列表（如 TenantList；PermButton.vue）

## 可能遗漏
服务端仍应拦无权限请求，这次 diff 没动（PermCheck.java）。

## 故意没动
APP 详情不在这次范围。

## 上线注意
老用户会问「按钮呢」。能否 archive 取决于服务端是否补上。
```

Need another file: quote the spec sentence that requires it, then open that file. Look up symbols inside already-opened files.
