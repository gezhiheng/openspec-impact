## Context

See proposal.md. The skill token `osi-impact` is the frontmatter `name`, the install directory, and the slash-command id. OpenSpec workflow commands use the id `opsx-*` (`/opsx-propose`). The evidence CLI is a different surface: `osi impact`.

## Goals / Non-Goals

**Goals:**

- One token, `opsx-impact`, for the skill name, install directory, and command id.
- `osi init` for a selected agent writes the new paths and deletes that agent's old `osi-impact` files.

**Non-Goals:**

- Renaming `osi`, `osi impact`, or the npm package `openspec-impact`.
- Keeping `/osi-impact` as an alias.
- Inlining the skill body into the Cursor command file.

## Decisions

### Skill token matches the slash command

The installed name is `opsx-impact`, invoked as `/opsx-impact` (Codex: `$opsx-impact`). Cursor command frontmatter follows the OpenSpec command files: `name: "/opsx-impact"`, `id: "opsx-impact"`.

Alternative: skill directory `openspec-impact` with command id `opsx-impact`, matching `openspec-propose` / `/opsx-propose`. Rejected. This repo uses one token for the skill and the command, and `openspec-impact` is already the npm package name.

### Replace the token, leave the CLI phrase

In templates and generated install text, replace `osi-impact` and `/osi-impact`. Do not change the command string `osi impact`.

Template files move:

- `templates/osi-impact/SKILL.md` → `templates/opsx-impact/SKILL.md`
- `templates/cursor/osi-impact.md` → `templates/cursor/opsx-impact.md`

Each `AGENTS` entry in `src/commands/init.ts` changes its `skill`, `command`, and `commandTemplate` the same way (`osi-impact` → `opsx-impact`). `OTHER_FRONT` and `GENERATED_COMMAND` use the new name.

### Old files are the previous relative paths

Before writing a selected agent's files, delete the paths those entries have today (`osi-impact` in the same relative slots). Unlink the file only. If its parent directory is named `osi-impact` and is then empty, remove that directory. Skip missing paths. Do not touch unselected agents.

Cursor's old paths are `.cursor/skills/osi-impact/SKILL.md` and `.cursor/commands/osi-impact.md`. The other agents use the same substitution on their current skill and command paths (`.claude`, `.agents`, `.windsurf`, `.cline` / `.clinerules`, `.roo`, `.opencode`, `.github`, `.pi`).

## Risks / Trade-offs

- [Projects that do not re-run `osi init` keep `/osi-impact`] → Document that init is the migration. No dual-name period.
- [A string replace also rewrites `osi impact`] → Replace the hyphenated skill token only. Tests assert the skill still tells the agent to run `osi impact`.

## Migration Plan

1. Ship the renamed templates and init behavior.
2. In a project that already has the skill, run `osi init` and select the same agents. New files appear; that agent's old `osi-impact` files are removed.
3. Rollback is the previous package plus `osi init`. That older init writes `osi-impact` again and does not delete `opsx-impact`; remove the new paths by hand if rolling back.

## Open Questions
