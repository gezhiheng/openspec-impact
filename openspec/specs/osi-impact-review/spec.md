# osi-impact-review Specification

## Purpose

The `/osi-impact` report reviews an OpenSpec change using both bounded OSI evidence and the actual changes in each repository covered by that change. It helps identify uncovered edits and unverified requirements without presenting a limited candidate search as a completeness guarantee.

## Requirements

### Requirement: Review all in-scope changed paths independently of OSI candidates

The `/osi-impact` skill MUST identify the Git roots covered by the live change from its stated repository and path scope, then inventory changed paths in each root independently of `osi impact` seeds and history. The inventory MUST include committed changes relative to the selected base, staged and unstaged tracked changes, and untracked non-ignored files. The skill MUST reconcile every in-scope changed path with the OSI evidence and review any changed path that is absent from that evidence. Explicitly out-of-scope paths MAY be excluded when the change documents establish that boundary.

#### Scenario: In-scope changed path is absent from OSI evidence

- **WHEN** a changed file belongs to a repository or path declared in scope by the OpenSpec change
- **AND** the file is absent from `osi impact` seeds and history
- **THEN** the skill reviews the changed file's relevant diff and accounts for it in the report
- **AND** the file is not dismissed only because it was outside the bounded evidence set

#### Scenario: Untracked implementation file is in scope

- **WHEN** an untracked, non-ignored file is under a repository or path declared in scope
- **THEN** the skill includes that path in the change inventory
- **AND** checks its contents against the change requirements before making a completeness claim

#### Scenario: Explicitly out-of-scope change is excluded

- **WHEN** a changed path is outside the documented in-scope boundary and is explicitly listed as out of scope
- **THEN** the skill does not report it as a possible omission for the current change

### Requirement: Establish a comparison base for each Git root

The skill MUST establish the committed-change comparison base independently for each in-scope Git root. It MUST use an explicit operator override when provided, otherwise use a deterministically identified repository default branch. It MUST NOT assume that the current feature branch's tracking branch is a suitable base merely because an upstream exists. If no suitable base can be established, the skill MUST report that branch comparison as incomplete and MUST NOT claim that no omissions were found. The skill MUST still report any staged, unstaged, and untracked changes it can inventory.

#### Scenario: Repository default branch is discoverable

- **WHEN** a repository has a deterministically discoverable default branch
- **THEN** the skill compares the current branch with that base
- **AND** includes staged, unstaged, and untracked changes in the inventory

#### Scenario: Feature branch tracks its remote counterpart

- **WHEN** the current feature branch tracks a remote branch with the same feature history
- **THEN** the skill does not use that tracking branch as the comparison base solely because it is the upstream
- **AND** uses the discovered default branch or an explicit override

#### Scenario: No comparison base can be established

- **WHEN** the repository has no explicit override and no deterministically discoverable default branch
- **THEN** the skill reports the branch comparison as incomplete
- **AND** does not report “no known omissions” for that repository

### Requirement: Distinguish implementation findings from validation status

The skill MUST distinguish a possible implementation gap from a requirement that has not been validated. It MUST identify unchecked explicit validation tasks as unverified evidence, not as proof that implementation is missing. It MUST NOT report that no known omissions remain while any in-scope changed path is unreviewed, any required comparison base is unresolved, or any explicit validation task remains incomplete.

#### Scenario: Smoke task remains unchecked

- **WHEN** an explicit smoke or end-to-end task in `tasks.md` remains unchecked
- **THEN** the skill reports that scenario as unverified
- **AND** does not state that the implementation is missing solely because the task is unchecked

#### Scenario: Changed path suggests a requirement gap

- **WHEN** review of an in-scope changed path shows that an explicit requirement has no corresponding implementation evidence
- **THEN** the skill reports a possible implementation gap separately from test or smoke coverage status

#### Scenario: Completeness claim has unresolved evidence

- **WHEN** an in-scope changed path is unreviewed, a comparison base is unresolved, or an explicit validation task is incomplete
- **THEN** the report states which evidence remains unresolved
- **AND** does not claim that no known omissions remain

#### Scenario: All evidence and validation tasks are accounted for

- **WHEN** every in-scope changed path has been reviewed against the change requirements
- **AND** every required comparison base is established
- **AND** all explicit validation tasks are complete or documented as intentionally skipped
- **THEN** the skill MAY report that it found no known omissions
