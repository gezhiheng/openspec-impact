## Why

`osi impact` intentionally returns bounded lexical and Git-history evidence, but `/osi-impact` currently uses that evidence set as the boundary for reviewing diffs. A relevant changed file that was not selected as a seed or history neighbor can therefore remain unread while the report says no omissions. The review needs an independent, repository-aware change inventory so bounded candidate search stays efficient without being mistaken for a completeness check.

## What Changes

- Add a change-driven completeness pass to `/osi-impact` that inventories committed branch changes, staged and unstaged edits, and untracked files in each Git root covered by the OpenSpec change.
- Select a comparison base per Git root from an explicit override or a deterministically discovered default branch. Do not treat the current feature branch's tracking branch as its base; if no base can be established, report the branch comparison as incomplete.
- Compare the full in-scope change inventory with `osi` seeds and history. Review changed paths that are not already covered by the evidence set, without raising the lexical search caps or hard-coding repository names and file patterns.
- Report implementation gaps separately from scenarios that remain unverified. Claim no known omissions only when all in-scope changes and explicit validation tasks have been accounted for.
- Keep the `osi impact` YAML contract and its bounded candidate-generation behavior unchanged.

## Capabilities

### New Capabilities

- `osi-impact-review`: completeness review for an OpenSpec change across one or more Git roots, including branch-base status, uncovered changed files, and separate implementation and validation findings.

### Modified Capabilities

None.

## Impact

- `templates/osi-impact/SKILL.md`: add the independent changed-file pass, per-repository base handling, uncovered-change review, and report confidence rules.
- `templates/cursor/osi-impact.md`: document an optional base override when automatic per-repository base discovery is unavailable.
- `tests/init.test.ts`: verify `osi init` continues to install the updated skill and command templates.
- `osi impact` output and search behavior remain unchanged.
