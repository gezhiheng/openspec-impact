---
name: osi-impact
description: Judge a live OpenSpec change from `osi` evidence. Usage: /osi-impact {change}
disable-model-invocation: true
---

# osi-impact

Usage: `/osi-impact {change}`

`{change}` is a live OpenSpec change id or path. If omitted, ask. Run from the project that contains `openspec/changes/<id>/`. Requires `osi` on PATH.

This skill fires only when the user types `/osi-impact`.

Write the 影响面 in the user's language. Each finding is one **cause → 表现** (or **cause → 漏改**) sentence a reader who does not know the repo can follow: name the file's role (page, shared component, API, job, mapper), then the user-visible change or the spec gap. Paths are supporting detail, not the deliverable.

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

**planned** — "若改" (nothing in this change's diff yet):

> 若改 `PermButton.vue`（列表行上的公共操作按钮），权限不足时从「点击后提示」变成「按钮不可见」，用户会以为功能没了。
>
> `PermCheck.java` 在 git 上常与该按钮一起提交；实施时一起打开。

**partial / done** — "因为已经改了" plus 漏改 from spec + co-change vs this-change diff:

> 因为改了 `PermButton.vue`（公共操作按钮；diff 把权限不足从 toast 改成 `v-if` 隐藏），用户以前点击会提示权限不足，现在看不见按钮。
>
> `PermCheck.java` 在 git 历史上常与 `PermButton.vue` 一起提交，这次只改了按钮。结合 spec「服务端仍校验权限」，需求可能漏改。

Every `in` file gets a 表现 sentence. Every promoted-or-`maybe` neighbor that is absent from this-change diff while spec still needs that behavior gets a 漏改 sentence. Extra files in the diff that are `out` or off the impact set: one sentence that they are outside spec.

**done** closes with coverage: which 表现 are implemented, which 漏改 remain, whether the change is ready to archive.

Need another file: quote the spec sentence that requires it, then open that file. Look up symbols inside already-opened files.
