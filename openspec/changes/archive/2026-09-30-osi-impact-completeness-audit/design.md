## Context

See `proposal.md` for the motivation. `osi impact` deliberately returns bounded lexical candidates and same-repository Git history; it does not promise a complete list of changed files. The packaged `/osi-impact` skill currently reads diffs only for paths already promoted into its impact set. `osi init` copies the versioned skill and command from `templates/` into the target project.

## Goals / Non-Goals

**Goals:**

- Preserve OSI as the first, bounded evidence pass and add an independent audit of changed paths in repositories that the OpenSpec change declares in scope.
- Make the comparison base explicit or deterministic for each nested Git root.
- Ensure a missing base, an unreviewed in-scope path, or an incomplete validation task prevents a definitive “no known omissions” report.
- Keep implementation findings distinct from unverified validation scenarios.

**Non-Goals:**

- Changing `osi impact`, `osi scope`, or `osi history` output, ranking, search limits, or history rules.
- Scanning every nested repository in a workspace regardless of the change's stated scope.
- Treating an unchecked task as proof that code is missing or automatically running product-specific end-to-end tests.

## Decisions

### Keep the completeness pass in the report workflow

The new pass belongs in `templates/osi-impact/SKILL.md`. The CLI remains a deterministic evidence generator, and its bounded seeds remain useful for quickly finding likely code. The skill supplements those candidates by enumerating changed paths, so the fix does not depend on widening global search caps or adding project-specific file-name rules. `tests/init.test.ts` will verify that `osi init` installs the updated templates and retains key completeness safeguards.

### Discover in-scope Git roots from change documents

Resolve repository roots from repositories and paths that the OpenSpec change explicitly marks in scope. Use OSI seed roots only as a fallback when the change documents do not identify a root, and mark that inferred scope in the report. Do not audit unrelated nested repositories just because they exist under the project root. Normalize inventory paths to workspace-relative POSIX paths before comparing them with seeds and history.

### Build a complete per-root change inventory

For each in-scope Git root, union:

- committed branch changes from the selected base to `HEAD`;
- staged and unstaged tracked changes relative to `HEAD`;
- untracked, non-ignored paths.

Deduplicate paths while preserving rename source and destination information. Inspect changed paths absent from seeds and history; the evidence list is a comparison input, not a filter for the change inventory. Explicit out-of-scope boundaries in the change documents still apply.

### Select a base without mistaking an upstream for the target branch

Allow an explicit base override for each repository root. Without an override, use a uniquely discoverable remote default-branch symbolic ref; if unavailable, use a unique local `main` or `master` branch. Do not infer a base from the current branch's upstream alone, because a feature branch commonly tracks its own remote counterpart. If there is no unique base, continue auditing local staged, unstaged, and untracked changes, report committed branch coverage as incomplete, and do not claim no known omissions.

The command template will document an optional per-root override, for example:

```text
/osi-impact add-renewal-status --base qft-app=origin/main --base qft-all=origin/develop
```

The skill validates that each override resolves inside its corresponding Git root. An invalid or ambiguous override is reported as unresolved rather than silently replaced with another branch.

### Make completeness claims conservative

Reconcile every in-scope changed path with the requirement documents and the OSI evidence. A path absent from OSI evidence must be opened and reviewed before it is classified. Report unchecked explicit smoke or end-to-end tasks as unverified validation, not missing implementation. Preserve the current five report headings; place implementation gaps and unresolved coverage under `可能遗漏`, and state base or validation uncertainty under `上线注意`. The report may say “未见遗漏” only after every in-scope path, comparison base, and explicit validation task has been accounted for.

## Risks / Trade-offs

- [Risk] A workspace may contain many nested Git repositories and broad diffs → [Mitigation] Audit only roots declared in scope or inferred from cited in-scope paths, and review only changed paths not already covered by evidence.
- [Risk] A repository's default branch reference may be missing or ambiguous → [Mitigation] Accept an explicit per-root base and otherwise report the branch comparison as incomplete.
- [Risk] Natural-language change documents may not identify repository boundaries precisely → [Mitigation] Mark roots inferred from evidence and prevent a definitive completeness claim when relevant roots remain unresolved.
- [Risk] Installed projects keep older skill copies after a package update → [Mitigation] Preserve the existing `osi init` refresh flow and test that it copies the packaged templates.

## Migration Plan

No CLI migration is required. After upgrading the package, users run `osi init` in the OpenSpec project to refresh the installed Cursor skill and command. Existing YAML consumers remain compatible because `osi impact` output is unchanged.
