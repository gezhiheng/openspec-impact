---
name: osi-impact
description: Judge a live OpenSpec change from `osi` evidence. Usage: /osi-impact {change}
disable-model-invocation: true
---

# osi-impact

Usage: `/osi-impact {change}`

`{change}` is a live OpenSpec change id or path. If omitted, ask. Run from the project that contains `openspec/changes/<id>/`. Requires `osi` on PATH.

This skill fires only when the user types `/osi-impact`.

Write the 影响面 in the user's language, chat only. Four blocks, this order: 一句话 → 会变什么 → 可能漏了 → 收尾. A reader who does not know the repo should follow it. Files go in parentheses after the 表现.

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

4. **Seeds** — if `seeds` is empty, write the 影响面 from the docs alone, state that `osi` found no named files, and stop.

5. **Seed files** — open every `seeds` path. Judge each `in` / `maybe` / `out` from spec intent, not from filename alone.
   Call 公共组件/公共方法 only when **both** hold: the seed's `refs` row has `wide` or `others ≥ 2`, **and** the filename/path reads as a shared unit (`src/components/PermButton.vue`, `*Util*`, `*Helper*`), not a page/route (`TenantList.tsx`, `pages/`). Cite one `sample` path. `others` is 出现在, not 引用了.
   Done: every seed is `in` / `maybe` / `out`; 公共 is decided from refs + filename.

6. **Neighbors** — for each `history` row whose `via` is an `in` seed, open that `path`. Promote to `in` when spec semantics connect; keep `maybe` when it is only co-change; `out` when it hits Out of scope. `commits` is support count, not a must-change score.

7. **This-change diff** — when mode is **partial** or **done**, for each git root that contains an `in` path:
   - `git -C <root> diff --name-only HEAD`
   - if that is empty: `git -C <root> diff --name-only main...HEAD` (or `master` / existing `@{u}` if those refs exist)
     Map hits to workspace-relative paths. Read patch hunks for files that are in the impact set (`in` seeds + promoted neighbors). Done: every such changed file has enough hunks to describe the behavior shift.

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

Draw if present, skip if not. Labels are roles (`列表行按钮`), not class names. 无页面仍四段；跳过状态机；有写路径就画保存流。
- 状态机（能改 / 不能改，覆盖 vs 锁住）
- 入口对照（PC/APP × 入口，会变 vs 不动；同一表现一张表 + 一句）
- 保存/数据流（原 URL → 门禁 → 写哪一行；不是类图）

1. **一句话** — 谁、在哪、会怎样（可带未见漏改 / 可 archive）
2. **会变什么** — 图在前或之中；每个**不同**用户可见面一句
3. **可能漏了** — spec 要、这次 diff 没有、用户会受影响；否则「未见漏改」
4. **收尾** — 故意没动各一句（Out of scope / 样板 / osi 误伤，不解释为什么扫到），然后覆盖 / 能否 archive / 上线注意

Lead with 表现 (file in parens). Merge identical twins and passthrough (API / ReqDTO / VO / BeanCopy). A twin that did not change is 漏改. Roles; class names only to locate a 漏改 (≤3/sentence).

Open: `列表行权限不足时按钮消失…（PermButton.vue）`. Not: `因为已经改了 PermButton / PermCheck / …`.

**planned** (「若改」):

> 若改：物业在 PC 工单列表上会看不见无权限按钮（公共操作按钮 PermButton.vue）。APP 详情不动。实施时打开服务端校验（PermCheck.java）。

**partial / done** (already happened; done + no 漏改 ≈ 8–12 sentences):

> 物业在 PC 工单列表上看不见无权限按钮。服务端校验可能漏改。
>
> ```
> [可点] ──权限不足──▶ [不可见]
> ```
>
> ```
> PC 列表行  会变
> APP 详情   不动
> ```
>
> 列表行权限不足时按钮消失，用户会以为功能没了（公共操作按钮 PermButton.vue）。
>
> 可能漏了：服务端仍应拦无权限请求，这次 diff 没动（PermCheck.java）。
>
> 故意没动：APP 详情底栏不在这次范围。
> 上线注意：老用户会问「按钮呢」。能否 archive 取决于服务端是否补上。

Need another file: quote the spec sentence that requires it, then open that file. Look up symbols inside already-opened files.
