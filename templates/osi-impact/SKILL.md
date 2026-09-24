---
name: osi-impact
description: Judge a live OpenSpec change from `osi` evidence. Usage: /osi-impact {change}
disable-model-invocation: true
---

# osi-impact

Usage: `/osi-impact {change}`

`{change}` is a live OpenSpec change id or path. If omitted, ask. Run from the project that contains `openspec/changes/<id>/`. Requires `osi` on PATH.

This skill fires only when the user types `/osi-impact`.

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

4. **Seeds** — if `seeds` is empty, write the 影响面 from the docs alone, state that `osi` found no named files, and stop.

5. **Seed files** — open every `seeds` path whose `refs` row has `wide === false`. A seed with `refs.wide === true` is `out` and is not opened; its closing line is 「宽词误伤」. Judge each opened seed `in` / `maybe` / `out` from spec intent, not from filename alone.
   Call 公共组件/公共方法 only when **both** hold: the seed's `refs` row has `wide` or `others ≥ 2`, **and** the filename/path reads as a shared unit (`src/components/PermButton.vue`, `*Util*`, `*Helper*`), not a page/route (`TenantList.tsx`, `pages/`). Cite one `sample` path. `others` is 出现在, not 引用了.
   Done: every seed is `in` / `maybe` / `out`; 公共 is decided from refs + filename.

6. **Neighbors** — open each `history` row (`co_change` or `sibling`) the same way: when `via` is an `in` seed, open that `path`. Still open a `sibling` when `via` is `out` only because the spec says 不做; if that path is the same operation’s other form or list, put it in 「可能漏了」 and quote that 不做 sentence. Promote to `in` when spec semantics connect; keep `maybe` when it is only co-change or sibling; `out` when it hits Out of scope. `commits` is a support count, not a must-change score; `commits: 0` is not a support count. `refs.sample` stays 出现在; do not open a `sample` path that is absent from `history`.

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

Draw if present, skip if not, under `## 影响范围`. Labels are roles (`列表行按钮`), not class names. 无页面仍五节标题；跳过状态机；有写路径就画保存流。

- 状态机（能改 / 不能改，覆盖 vs 锁住）
- 入口对照（会变的入口写进下面的 `- ` 列表，不另画表）
- 保存/数据流（原 URL → 门禁 → 写哪一行；不是类图）

`## 一句话` — 谁、在哪、会怎样。planned 以「若改」开头。

`## 影响范围` — 图，然后每种不同表现一条 `- `：`- 表现：哪些入口（file）`。表现相同的入口并进同一条，不写「同上」，也不接成一段。相同的 API / ReqDTO / VO / BeanCopy 并进这一条。公共组件/方法且该单元是 `in`、这次会改或已改：这条里点出其它共用处（一个 `sample`；`wide` 写「多处共用」）。标题仍是 `## 影响范围`。

`## 可能遗漏` — spec 要、这次 diff 没有、用户会受影响，每条一行。没有则 `未见遗漏`。Step 6 的「可能漏了」写在这里。未改的入口、没改的孪生写在这里（≤3 个类名）。

`## 故意没动` — Out of scope / 样板 / 宽词误伤，各一行，不解释为什么扫到。没有则 `无`。

`## 上线注意` — 覆盖、能否 archive、上线，一行。没有则 `无`。

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
