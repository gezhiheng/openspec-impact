## Why

`osi scope` now yields named high seeds (classes, Vue files, jobs) but still only lexical hits. Files that spec never cites yet always change with those seeds stay invisible, so a Skill still greps or guesses. Git co-change is the next deterministic evidence layer; it must not be folded into scope `confidence`.

## What Changes

- Add subcommand `osi history <change-id|path>` that locates the same live OpenSpec change as `osi scope`, runs scope internally, selects **named** high candidates as seeds (basename/stem matches a citation), and expands one hop of same-repo co-change.
- Print a separate `version: 1` YAML document to stdout with `change`, `seeds`, and `history` (path, via, commits, reason `co_change`). Do not merge neighbors into `osi scope` `candidates` or reuse `high|medium|low`.
- Resolve each seed to a nested git root (workspace-relative `qft-all/...` → `qft-all/.git` + repo-relative path). Do not compute co-change across git repositories.
- Drop merge commits and wide commits (more than 30 files). Count co-occurrence over a bounded window (18 months). Emit a neighbor only at ≥2 supporting commits. Cap per seed and globally.

## Capabilities

### New Capabilities

- `osi-history`: Given an OpenSpec change, emit YAML of named scope seeds and same-repo git co-change neighbors with counts, without judging impact or mixing into scope confidence.

### Modified Capabilities

- （无。`osi-scope` 行为不变；history 是新命令。）

## Impact

- **In scope**: `src/cli.ts` argv (`history` alongside `scope`), `src/commands/history.ts`, git-root resolution, co-change over `git log`, YAML keys `version` / `change` / `seeds` / `history`. Fixture with a tiny git repo under `tests/fixtures/` (not this package’s history).
- **Out of scope**: blame, commit-message similarity, cross-repo coupling, AST/deps, Skill text, changing `osi scope` ranking or `--no-search`, writing files into the change directory, JSON/`--format`.
- **Compatibility**: new subcommand; unknown command stays non-zero. Scope YAML shape unchanged.
- **Deps**: none beyond git on PATH (already assumed for `git grep` fallback).
