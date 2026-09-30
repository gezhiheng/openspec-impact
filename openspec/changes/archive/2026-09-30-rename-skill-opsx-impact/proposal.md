## Why

The impact skill is invoked as `/osi-impact`, while the OpenSpec workflow commands beside it are `/opsx-propose`, `/opsx-apply`, and the rest of the `/opsx-*` set. The two prefixes make the same kind of slash command look like two products.

## What Changes

- **BREAKING**: The installed skill and its slash command are renamed from `osi-impact` / `/osi-impact` to `opsx-impact` / `/opsx-impact`. Codex invocation becomes `$opsx-impact`.
- `osi init` installs the renamed skill and command paths for every supported agent, and removes that agent's previous `osi-impact` install files so the old command does not remain.
- Skill body, Cursor command stub, README, and product overview use the new name. The evidence CLI stays `osi impact`.

## Capabilities

### New Capabilities

### Modified Capabilities

- `osi-init`: Install paths, skill `name`, and command text use `opsx-impact` / `/opsx-impact`. A selected agent's previous `osi-impact` files are removed.
- `osi-distribution`: The published package installs the renamed skill and Cursor command.
- `osi-impact-review`: The review skill is identified as `/opsx-impact`. Review rules are unchanged.

## Impact

- Templates: `templates/osi-impact/SKILL.md` and `templates/cursor/osi-impact.md` move to `opsx-impact` names.
- `src/commands/init.ts` install paths, generated frontmatter, and generated command text.
- `tests/init.test.ts`.
- Docs that name the skill: `README.md`, `docs/product-overview.md`, `AGENTS.md`.
- Unchanged: `osi` subcommands, YAML evidence, npm package name `openspec-impact`.
