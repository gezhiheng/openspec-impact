## Context

See proposal.md for motivation. `parseArgv` today treats first positional `scope` | `history` as layer commands (they require a change id) and everything else as the evidence pipeline. `.cursor/` is gitignored; the working `osi-impact` skill lives only there. `package.json` has no `files` whitelist, so a repo-root `templates/` directory publishes with the npm package.

## Goals / Non-Goals

**Goals:**

- One git-tracked template for the skill and one for the Cursor command.
- `osi init` copies those bytes into the install root and overwrites.
- `init` is a reserved first token with arity 0.

**Non-Goals:**

- Do not add `--tools`, `osi update`, or a second IDE.
- Do not copy templates through `tsc` (markdown stays at package root).
- Do not change `.gitignore`.

## Decisions

### 1. `init` is a setup command, not a layer

- **Choice**: `parseArgv` accepts `init` only as a lone positional (`osi init`). Extra tokens or flags other than the existing global unknown-flag path are usage errors. `main` dispatches to `runInit({ cwd })` and does not call `runEvidence`.
- **Why**: Layer commands take a change id; init does not. Mixing arity in one `LAYERS` set would force a fake change argument.
- **Alternative**: `osi init <path>` like `openspec init [path]` — rejected this change; nearest-root already finds the project. Add a path arg later if needed.

### 2. Templates at package root

- **Choice**: `templates/osi-impact/SKILL.md` (move the current `.cursor/skills/osi-impact/SKILL.md` contents) and `templates/cursor/osi-impact.md` (short command stub that names `/osi-impact` and the skill). Runtime: walk up from `import.meta.url` until `package.json`, then read those two files.
- **Why**: `tsc` does not emit markdown into `dist/`. Walking to `package.json` works for `dist/src/cli.js` and for source runs.
- **Alternative**: embed the skill as a TypeScript string — rejected; the skill is the product text and should be editable as markdown.

### 3. Install root

- **Choice**: Reuse `findProjectRoot(cwd)`; if null, use `cwd`. `mkdir` recursive, then `writeFile` both destinations.
- **Why**: Matches `osi scope` when the operator is in a subdirectory; still works in a folder that has not run `openspec init`.
- **Alternative**: Fail when `openspec/` is missing — rejected; installing the skill does not require specs on disk yet.

### 4. Tests

- **Choice**: Temp directories only (not this repo’s `.cursor/`). Cases: fresh write, overwrite, subdirectory of a fake `openspec/` root, `osi init extra` non-zero, `osi init` stdout is not YAML (`version:` / `seeds:`).
- **Why**: Same fixture style as history/evidence tests; never mutate the package’s ignored `.cursor/` in CI.

## Risks / Trade-offs

- [Change id `init` becomes unreachable by name] → Path form; listed in USAGE reserved words.
- [Published package missing templates if someone adds a `files: ["dist"]` later] → Keep templates next to `package.json`; if `files` is introduced, include `templates/`.
- [Dogfood copy in `.cursor/` drifts] → `osi init` in this repo; do not edit `.cursor/` by hand after that.

## Migration Plan

- Rebuild `osi`. Existing `osi <change>` callers unchanged unless the change is named `init`.
- Operators run `osi init` once per project (and after upgrading osi, to refresh the skill).
- Rollback: revert the change; `init` again becomes a change id.
