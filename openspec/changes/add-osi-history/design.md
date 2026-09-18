## Context

See proposal.md for motivation. `osi scope` already locates a change, harvests citations, and ranks candidates (`seedRank` / named basename-stem hits) in `src/commands/scope.ts` and `src/search/repository.ts`. YAML is stdout-only, `version: 1`. QFT workspaces are a parent git repo that gitignores nested `qft-*` repos; co-change is only meaningful inside those nested roots.

## Goals / Non-Goals

**Goals:**

- Reuse `runScope` (no second harvest/search).
- Export a named-seed predicate shared with ranking so history seeds match what operators already see as “this file was cited.”
- Resolve git roots per file; run `git log` only there.
- Keep history YAML disjoint from scope YAML.

**Non-Goals:**

- Do not change scope ranking, caps, or `--no-search`.
- Do not pipe stdin YAML (Skill passes a change id).
- Do not call `git blame` or parse commit messages.

## Decisions

### 1. Subcommand, not `--history`

- **Choice**: `parseArgv` accepts `history` like `scope` (`[--include-low]` unused for history; omit it). `main` dispatches to `runHistory`.
- **Why**: Scope contract stays “lexical candidates.” Mixing neighbors into `confidence` was rejected in explore.
- **Alternative**: `osi scope --history` — rejected; Skill and tests would overload one document.

### 2. Named seeds = existing basename/stem rule

- **Choice**: Export `isNamedCandidate(path, reasons)` from `repository.ts` (the seedRank-0 check). History keeps `confidence === 'high'` AND named, then at most 5 per enclosing git root (longer matching term, then path).
- **Why**: One definition; table-name XML highs stay out.
- **Alternative**: Re-implement a looser “any high” seed list — rejected; QFT would expand from every checkout Mapper.

### 3. Git root from the file, not OpenSpec root

- **Choice**: From the seed’s absolute path, walk up until `.git` exists. Workspace-relative output path = posix relative to OpenSpec project root. `git -C <root> log --follow --since=18.months --no-merges --name-only --pretty=format:%H -- <rel>` then `git -C <root> diff-tree --no-commit-id --name-only -r <hash>` to count files; skip if >30 names.
- **Why**: Matches nested `qft-all/.git`. OpenSpec root’s git does not contain those files.
- **Alternative**: Always `git -C projectRoot` — wrong on QFT workspace.

### 4. YAML helper

- **Choice**: `toHistoryYaml` in `src/output/yaml.ts` (same quoting). Keys only those in the spec. Seeds as a sequence of path strings.
- **Why**: One output module; no schema version bump beyond a different key set on a different command.
- **Alternative**: Reuse `toYaml(ScopeDocument)` with extra keys — would **BREAK** scope’s “exactly these keys” spec.

### 5. Fixture git

- **Choice**: Tests build a temp git repo (or `tests/fixtures/mini-git/`) copied from mini-repo sources, `git init`, two small commits pairing `TenantList.tsx` and `tenant.ts`, plus one 31-file wide commit that MUST NOT create a history row. Never `git log` this package’s `.git` as the subject.
- **Why**: Deterministic dates (`GIT_AUTHOR_DATE`) within 18 months.
- **Alternative**: Dogfood qft-all — not CI-reproducible.

## Risks / Trade-offs

- [Named cap 5 drops a cited Vue if 5 other named files sort first in that repo] → Accept; Skill can still read scope YAML. Do not raise without evidence.
- [Renames: `--follow` vs workspace path] → Emit current workspace-relative path; if git prints the old name, map via `ls-files` / existence under the git root.
- [No git binary] → Seeds still printed; `history: []`.
- [18-month / 30-file / ≥2 are magic numbers] → Frozen in spec; change later with a delta, not flags.

## Migration Plan

- Rebuild `osi`; new usage line. Scope callers unchanged.
- Rollback: revert the change; `history` becomes unknown command again.
