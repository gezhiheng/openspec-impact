## Context

See proposal.md for motivation. This repo is an empty OpenSpec-initialized project: no CLI, no `src/`, no tests. Phase 1 adds `osi scope` as the first command of a later multi-command evidence CLI. Specs in `specs/osi-scope/spec.md` are the behavior contract; this file records how to implement them.

Constraints already frozen (grilling): single project root from cwd, YAML-only stdout, no JSON/`--format`, no concept `type`, closed never-search and path-only lists, no CJK–English dictionary, tests split from candidates, `--include-low` capped at 20.

## Goals / Non-Goals

**Goals:**

- Keep harvest, term expansion, search, and ranking as pure functions over files so later commands (`osi deps`, history) can reuse OpenSpec location and repository search.
- Make every ranking step replayable from the YAML (`reasons` on candidates). Search-term expansion stays internal and is not printed.
- Ship a fixture-backed `node:test` suite that does not touch this repo's own git history.

**Non-Goals:**

- Do not add a CLI framework, YAML schema extra keys, Markdown wrapping, or writing `scope.yaml` into the change.
- Do not split OpenSpec root from code root in this phase.

## Decisions

### 1. Package and process shape

- **Choice**: npm package `openspec-impact`, `bin` maps `osi` → compiled `dist` entry. TypeScript, Node, hand-parsed argv (`scope`, `--include-low`, change argument). Modules: `src/commands/scope.ts`, `src/openspec/parser.ts`, `src/search/{repository,terms}.ts`, `src/models/evidence.ts`, `src/output/yaml.ts`.
- **Why**: Matches the agreed command name and leaves room for later subcommands without commander.
- **Alternative**: binary also named `openspec-impact` — rejected; `osi` is the user-facing command. Bun/Go — rejected in grilling.

### 2. Roots

- **Choice**: Walk up from cwd to the directory that contains `openspec/` (OpenSpec nearest-root). That directory is both spec root and search root. Identifiers resolve only to `openspec/changes/<id>/`.
- **Why**: The operator runs the CLI inside the project they care about; flags for dual roots were deferred.
- **Alternative**: `--openspec-root` / `--repo` — later phase.

### 3. Harvest pipeline

- **Choice**: Regex/token harvest, no NLP. Citations (paths, backticks, APIs) become concepts whose `search_terms` are the token itself. Phrases come from headings, Requirement titles, What Changes, Impact, plus backtick/bold/inline code. Change id and spec folder kebab-case split into tokens, then filtered by the closed lists.
- **Why**: Deterministic and matches QFT-style docs that already name files.
- **Alternative**: separate `citations[]` in YAML — rejected to keep `version: 1` small.

### 4. Term expansion and match kinds

- **Choice**: Multi-word → camel / Pascal / snake / kebab. Unigram → original + Pascal. Identifiers and paths are not re-cased. `path_match` = term in relative path. `symbol_match` = term as an identifier (`\bTerm\b` and/or `function|class|type|const|interface` forms). Filename stem is path, not symbol. Path-only list is applied as path queries only.
- **Why**: Distinguishes the three reason types without an AST (out of scope).
- **Alternative**: ctags / tree-sitter — out of Phase 1.

### 5. Search invocation

- **Choice**: Prefer `rg` with gitignore + explicit glob excludes for `openspec/`, `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `vendor/`. If `rg` is missing, `git grep`. Search all remaining text files (rg skips binaries).
- **Why**: Fast, respects ignore files, does not whitelist languages (QFT HTML templates must be visible).
- **Alternative**: extension allowlist — rejected; would drop `.html`.

### 6. Output

- **Choice**: One YAML document on stdout. Keys only those in the spec. Relative posix paths. Sort candidates high → medium → low, then `path`. Errors on stderr; locate-failure is non-zero; empty candidates is zero.
- **Why**: Skill and human share one document; JSON was explicitly dropped.
- **Alternative**: YAML front matter plus Markdown body — deferred until a later human report.

### 7. Tests and fixtures

- **Choice**: `node:test`. Fixture tree under `tests/fixtures/mini-repo/` containing a fake OpenSpec change (`add-renewal-status`) and a tiny tenant app (`TenantList.tsx`, `TenantFilter.tsx`, `tenant.ts`, a sibling `.test.tsx`, plus a file that would only low-match). Tests invoke harvest/search/rank against that tree by chdir or explicit cwd, never against this repo's `src/` as the subject.
- **Why**: Deterministic examples from the original Phase 1 prompt.
- **Alternative**: dogfood `qft-app` — not reproducible in CI.

## Risks / Trade-offs

- [Unigram `tenant` still noisy on large repos] → Default drop low; medium is the remaining leak. Accept for Phase 1; later phases shrink with deps/history.
- [Identifier heuristic false-positive in comments/strings] → Count as `content_match` unless the identifier pattern hits; do not try to parse strings vs code.
- [No `rg` in some environments] → `git grep` fallback; fixture tests should not require `rg` if the search module can be injected or the fallback path is covered.
- [Closed English lists miss Chinese function words] → Search Chinese as original tokens only; noisy 系统-like words may appear until a later list. Do not add a translator.

## Migration Plan

- New package: `npm install` / `npm run build` produces `osi`. No data migration, no version flag beyond YAML `version: 1`.
- Rollback: do not publish; delete the package. Schema bumps later use `version: 2`.
