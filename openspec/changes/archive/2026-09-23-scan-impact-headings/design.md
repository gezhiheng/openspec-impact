## Context

See proposal.md. Source of truth is `templates/osi-impact/SKILL.md`. The intro names four blocks (`会变什么` / `可能漏了` / `收尾`). `### Shape` lists the same four as a numbered instruction to the model. The partial/done example renders `可能漏了：` / `故意没动：` / `上线注意：` as sentence prefixes, with ASCII between unlabeled paragraphs. Steps 1–7 and Step 5 refs/公共 stay verbatim. `.cursor/skills/` is gitignored; local install can lag the template.

## Goals / Non-Goals

**Goals:**

- Someone who only reads the example emits five Markdown headings, with `影响范围` as a line list and `可能遗漏` as its own heading.
- A reader can land on those two headings without reading the body.

**Non-Goals:**

- Do not shorten investigation or skip opening files.
- Do not pin skill prose into `openspec/specs/`.
- Do not paste a product-domain report into the skill.
- Do not change how `in` / `maybe` / `out` or 公共 is decided.

## Decisions

### 1. Rewrite the intro sentence and the example, not only the skeleton

- **Choice**: Replace the paragraph above `## Steps` and everything from the numbered section list through the examples. Leave the Visualize box, `## Steps` 1–7, Deliver's "no YAML dump" line, and the final「Need another file」line.
- **Why**: The intro and the example are the contracts the model copies. A skeleton-only edit leaves `会变什么` / sentence-prefix few-shot in place.
- **Alternative**: Skeleton-only — rejected.

### 2. Five headings, always, same words

Order:

1. `## 一句话`
2. `## 影响范围`
3. `## 可能遗漏`
4. `## 故意没动`
5. `## 上线注意`

- **Choice**: These words, every report, including planned and the empty-seeds stop in Step 4. A 公共组件 does not rename the heading.
- **Why**: The glance target is a fixed place. `会变什么` names a behavior story; `影响范围` names the surfaces. `收尾` hid 故意没动 and 上线注意 in one unlabeled block.
- **Alternative**: Title switches to `影响范围` only when a shared unit changed — rejected. The landmark would move.

### 3. One line per surface; gaps leave the map

- **影响范围**: ASCII (状态机 / 入口对照 / 保存流) lives under this heading. Then one line per distinct surface: `入口  会变：一句表现（file）`. Shared-unit blast radius is the first of those lines when Step 5 called it 公共 and that unit is `in` and this change touches it (planned: would touch it): cite one `sample`, or 「多处共用」 when `wide`. No paragraph after the lines.
- **可能遗漏**: one line per gap (spec requires it, this diff does not, a user would notice). None → the single line `未见遗漏`. An unchanged surface does not stay in the 影响范围 map as 「还没改」.
- **故意没动** / **上线注意**: one line each under that heading (Out of scope / 样板 / 宽词误伤; coverage / archive / rollout). Empty → `无`.
- **Why**: The unreadable report put 「会变」 and 「页面还没改」 in one grid, then restated both as paragraphs. Headings without the split still fail the glance.
- **Alternative**: Keep a behavior essay under `影响范围` — rejected.

### 4. Example is the few-shot

- **Choice**: PermButton + PermCheck. Planned and partial/done both use the five headings. Partial/done puts a two-line state machine and a two-cell 入口表 inside `影响范围`, plus one shared-place line (`TenantList`), one `可能遗漏` line (`PermCheck.java`), one `故意没动`, one `上线注意`. Planned starts `一句话` with 「若改」. One forbidden shape: a paragraph whose only marker is the prefix `可能漏了：`. No domain nouns from a real product report.
- **Why**: Last time the skeleton said "four blocks" and the example was prose, so the model wrote prose.
- **Alternative**: Instruct "use headings" and keep the prose example — rejected.

### 5. Keep the length cap

- **Choice**: If Shape is longer than Steps, cut bans before cutting headings or the example's ASCII.
- **Why**: Same cap as `readable-impact-shape`. Headings are the point of this change; bans are recoverable from the example.

## Risks / Trade-offs

- [Five headings add chrome] → Each body is one line in the example; empty sections are `未见遗漏` or `无`, not a missing heading.
- [Model still writes an essay under the heading] → Example has no essay. The line template is `入口  会变：一句`.
- [Installed skill lags] → Apply edits the template; operators re-run `osi init`.
- [Skill grows] → Cut bans before cutting the headed example.

## Migration Plan

- Edit the template. `osi init` overwrites the installed skill.
- Rollback: revert the template file.

## Open Questions

None.
