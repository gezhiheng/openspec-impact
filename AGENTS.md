# AGENTS.md

Deterministic OpenSpec **evidence** CLI (`osi`). Product usage: `README.md`.

## Contract

CLI behavior is the spec, not the current code:

- `openspec/specs/osi-scope/spec.md` — harvest, search, ranking
- `openspec/specs/osi-history/spec.md` — named seeds, co-change
- `openspec/specs/osi-evidence/spec.md` — `osi impact` pipeline + YAML keys
- `openspec/specs/osi-init/spec.md` — `osi init` install paths

A behavior change is an OpenSpec **delta** under `openspec/changes/<id>/`. Caps next to `ponytail:` comments are frozen there; raise them in a delta, not as flags.

## Layers

| Command | Module | Job |
|---|---|---|
| `scope` | `src/commands/scope.ts` | typed citations → lexical candidates |
| `history` | `src/commands/history.ts` | named highs → same-repo co-change |
| `impact` | `src/commands/evidence.ts` | one `runScope`, then `historyFromScope` |
| `init` | `src/commands/init.ts` | copy `templates/` into the target project |

History does not feed scope `confidence`. Pipeline does not search twice.

Argv is hand-parsed in `src/cli.ts`. YAML is hand-written in `src/output/yaml.ts` (stdout only). Locate and usage failures: stderr, non-zero, no YAML.

## Tests

`tests/fixtures/mini-repo` plus tmp git copies of it. Point harvest, search, and co-change at the fixture, never this package’s tree or history. CLI tests spawn `dist/src/cli.js` (tests run after `tsc`). `node:test` + `node:assert/strict`.

## Stack

Node stdlib, `git`, `rg` (fallback `git grep`). Imports use `.js` specifiers (`module: Node16`). The Cursor skill source of truth is `templates/osi-impact/SKILL.md`; `osi init` copies it.
