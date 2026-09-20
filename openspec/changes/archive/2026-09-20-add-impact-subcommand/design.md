## Context

See proposal.md. `parseArgv` treats `init` as arity-0 and `scope`/`history` as arity-1; any other single positional is still the evidence pipeline (`command: 'evidence'`). Tests and the osi-impact templates still say `osi <change>` and `{spec name}`.

## Goals / Non-Goals

**Goals:**

- `impact` is an arity-1 reserved command that dispatches to `runEvidence`.
- A single positional that is not `init` is a usage error.
- Templates say `{change}` and `osi impact <change>`.

**Non-Goals:**

- Do not rename `runEvidence` or YAML keys.
- Do not add `osi update`.
- Do not keep a hidden bare-change alias.

## Decisions

### 1. Put `impact` with `scope` / `history`

- **Choice**: `LAYERS = {scope, history, impact}`. `main` already has an `impact`/`evidence` fall-through; map `command === 'impact'` to `runEvidence`. Internal function names stay `runEvidence` / `toHistoryYaml`.
- **Why**: Same arity as the layer commands. Avoid a second parser branch.
- **Alternative**: Keep `command: 'evidence'` as the parsed name — rejected; argv and dispatch should share the verb the user typed.

### 2. Drop the bare change id

- **Choice**: After `init` and `LAYERS`, any remaining argv is USAGE, including `osi add-renewal-status` and `osi --no-search add-renewal-status`.
- **Why**: The point of the verb is to stop eating future words (`update`). An alias reopens the hole.
- **Alternative**: Keep the alias one release — rejected this change.

### 3. Templates

- **Choice**: Edit `templates/osi-impact/SKILL.md` and `templates/cursor/osi-impact.md` in the same change: Usage `/osi-impact {change}`, step 1 runs `osi impact {change}`.
- **Why**: Skill is what operators copy via `osi init`; stale `{spec name}` is the bug that prompted the verb.
- **Alternative**: Only CLI, refresh skill later — would ship a lying template.

## Risks / Trade-offs

- [Scripts still call `osi <change>`] → USAGE on stderr; one-line migration in proposal.
- [`impact` as a change id] → path form, same as `init`/`scope`.
- [CLI name vs `/osi-impact` Skill] → USAGE: YAML evidence, not the 影响面 narrative.

## Migration Plan

- Rebuild `osi`. Replace `osi <id>` with `osi impact <id>`. Re-run `osi init` to refresh the skill copy.
- Rollback: revert; bare change ids work again.
