## Why

AI agents today spend tokens repeatedly grepping the repository to guess which files an OpenSpec change might touch. Phase 1 of this impact-analysis CLI collects that candidate code scope deterministically, so later phases (and the Skill) reason over evidence instead of searching again. This is the first slice of the longer pipeline; it does not judge impact, coverage, or whether a file must change.

## What Changes

- Add a Node/TypeScript CLI binary `osi` (package name `openspec-impact`).
- Add subcommand `osi scope <change-id|path>` that locates one live OpenSpec change, harvests search terms, searches the project, ranks candidates, and prints YAML to stdout.
- Add a small fixture repository used only by tests; do not bind tests to this repo's source tree or git history.

## Capabilities

### New Capabilities

- `osi-scope`: Given an OpenSpec change identifier or path, emit versioned YAML of extracted concepts, candidate source files with evidence, and separately listed test files. Default output omits low-confidence matches. Does not perform dependency, git, AST, or LLM impact analysis.

### Modified Capabilities

- （无。`openspec/specs/` 尚无主规格。）

## Impact

- **In scope**: new CLI package layout (`src/commands`, `src/openspec`, `src/search`, `src/models`, `src/output`), `package.json` bin `osi`, fixture tests under `tests/fixtures/`.
- **Out of scope**: git history / blame / co-change, dependency graphs, AST impact, requirement coverage, Markdown reports, JSON output, `--format`, multi-repo `--repo` / `--openspec-root`, Chinese–English dictionaries, writing files into the change directory.
- **Compatibility**: new tool; no existing CLI to break. YAML schema is `version: 1`.
- **Deps**: Node + TypeScript; argv parsed by hand; prefer `rg`, fall back to `git grep`. No CLI framework.
