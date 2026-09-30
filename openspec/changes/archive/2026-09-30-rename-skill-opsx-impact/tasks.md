## 1. Templates

- [x] 1.1 Move `templates/osi-impact/SKILL.md` to `templates/opsx-impact/SKILL.md`. Rename the skill token to `opsx-impact` and the invocation to `/opsx-impact`. Leave the `osi impact` CLI phrase unchanged.
- [x] 1.2 Move `templates/cursor/osi-impact.md` to `templates/cursor/opsx-impact.md`. Set frontmatter `name: "/opsx-impact"` and `id: "opsx-impact"`. The stub follows the `opsx-impact` skill and still tells the agent to run `osi impact`.

## 2. Init

- [x] 2.1 In `src/commands/init.ts`, point skill, command, and template paths at `opsx-impact`. Update `OTHER_FRONT` and `GENERATED_COMMAND` the same way.
- [x] 2.2 For each selected agent, delete that agent's previous `osi-impact` skill and command files before writing the new ones. Remove an empty parent directory named `osi-impact`. Leave unselected agents' files in place.

## 3. Tests

- [x] 3.1 Update `tests/init.test.ts` for the new template and install paths. Assert `name: opsx-impact`, `/opsx-impact`, and that the installed skill still contains `osi impact`.
- [x] 3.2 Add coverage that `osi init --agent cursor` removes `.cursor/skills/osi-impact/SKILL.md` and `.cursor/commands/osi-impact.md`, and leaves `.claude/skills/osi-impact/SKILL.md` unchanged.

## 4. Docs

- [x] 4.1 Update `README.md`, `docs/product-overview.md`, and `AGENTS.md` to the new skill path and `/opsx-impact` / `$opsx-impact` invocation.
- [x] 4.2 Update the Purpose lines in `openspec/specs/osi-init/spec.md` and `openspec/specs/osi-impact-review/spec.md` that still name `/osi-impact`.
