## MODIFIED Requirements

### Requirement: Review all in-scope changed paths independently of OSI candidates

The `/opsx-impact` skill MUST identify the Git roots covered by the live change from its stated repository and path scope, then inventory changed paths in each root independently of `osi impact` seeds and history. The inventory MUST include committed changes relative to the selected base, staged and unstaged tracked changes, and untracked non-ignored files. The skill MUST reconcile every in-scope changed path with the OSI evidence and review any changed path that is absent from that evidence. Explicitly out-of-scope paths MAY be excluded when the change documents establish that boundary.

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
