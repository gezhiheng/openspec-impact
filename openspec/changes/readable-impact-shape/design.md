## Context

See proposal.md. Source of truth is `templates/osi-impact/SKILL.md` (`osi init` copies it). Steps 1–7 and Step 5 refs/公共 stay verbatim. `.cursor/skills/` is gitignored; local install can lag the template.

## Goals / Non-Goals

**Goals:**

- A reader who has not seen the repo, looking only at Shape, produces 一句话 + ASCII + short 表现, not a file list.
- Skill stays short: four-section skeleton, five bans, Visualize block, one tiny example.

**Non-Goals:**

- Do not shorten investigation or skip opening files.
- Do not pin skill prose into `openspec/specs/`.
- Do not paste the real 维修保洁 report into the skill.

## Decisions

### 1. Replace intro + Shape only

- **Choice**: Rewrite the paragraph above `## Steps` and everything from `### Shape` through the examples. Leave `## Steps` 1–7 and the final「Need another file」line untouched.
- **Why**: Line 15 (`cause → 表现` per finding) and 「Every `in` file gets a 表现 sentence」are the same contract. Shape-only edit would resurrect the file list from the intro.
- **Alternative**: Shape-only — rejected.

### 2. Four sections; 故意没动 lives in 收尾

1. 一句话：谁、在哪、会怎样（可带未见漏改 / 可 archive）
2. 会变什么：ASCII first or among the sentences; one sentence per distinct 用户可见面
3. 可能漏了：spec 要、这次 diff 没有、用户会受影响；否则「未见漏改」
4. 收尾：故意没动各一句，然后覆盖 / 能否 archive / 上线注意

- **Why**: Countable structure replaces 「every in file」. 漏改 vs 没动 stay in different sections without a fifth heading.
- **Alternative**: Fifth section for 故意没动 — extra header, same content. Rejected.

### 3. Cluster bans; do not number eight rules

- 表现 first, file in parens. Never lead with「因为已经改了 A/B/C」.
- One sentence, one main file. Identical twins merge. Passthrough (API / ReqDTO / VO / BeanCopy) → one user-visible sentence. One twin unchanged → 漏改, do not merge.
- Role names (`维修保洁列表`). Hide symbols unless locating a 漏改. ≤3 class names per sentence.
- planned =「若改」; partial/done = already happened.
- done + no 漏改 ≈ 8–12 sentences. 漏改: one sentence each. 「不是漏改」must not match that length.

- **Why**: Eight numbered patches become a second checklist. Clustering keeps the skill short.
- **Alternative**: Paste all eight as a numbered list — rejected.

### 4. Visualize before the four sections; examples must contain ASCII

- **Choice**: Paste the openspec-explore Visualize ASCII box (English, as-is or slight edit) immediately under Deliver, before the four-section skeleton. Draw if present, skip if not: 状态机, 入口对照 (PC/APP × 入口, 会变 vs 不动), 保存/数据流 (URL → 门禁 → 写哪一行, not a class diagram). Diagram labels are role names.
- **Why**: Few-shot beats slogans. A Visualize block buried after bans is treated as optional.
- **Alternative**: Prose-only「please draw」— rejected.

### 5. Short button example, not a domain dump

- **Choice**: Keep PermButton + PermCheck. Positive example: one-liner, tiny state machine, 2-cell 入口表 (one cell 不动), one 表现 sentence, one 漏改, one 故意没动, one 上线注意. Anti-pattern: one forbidden opener, not the real failure report.
- **Why**: Teach structure. Copying 维修保洁 freezes product nouns into the skill.
- **Alternative**: Embed the full target report — rejected.

## Risks / Trade-offs

- [「每个用户可见面一句」still enumerates] → Skill: 可见面 = 入口×角色上的**不同**表现; same 表现 across entries = one 入口表 + one sentence.
- [No UI] → Four sections still hold (「用户侧无可见变化」); skip 状态机; keep 保存流 if there is a write.
- [Installed skill lags] → Apply edits the template; operators re-run `osi init`.
- [Skill grows] → If Shape is longer than Steps, cut bans before cutting the example diagrams.

## Migration Plan

- Edit the template. `osi init` overwrites the installed skill.
- Rollback: revert the template file.

## Open Questions

None.
