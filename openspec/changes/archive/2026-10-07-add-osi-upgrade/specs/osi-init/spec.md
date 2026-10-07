## ADDED Requirements

### Requirement: Upgrade refreshes skills only where init already installed them

`osi upgrade` and `openspec-impact upgrade` MUST do the same work. The command MUST update the global `openspec-impact` package to the registry `latest` dist-tag before it writes any project file. Files it writes MUST come from the package that is installed after that update succeeds. The command MUST NOT prompt, MUST NOT print YAML, and MUST exit 0 when the update succeeds.

The install root MUST use the same nearest OpenSpec project root rule as `osi init`.

An agent is already installed when that root contains the agent's `opsx-impact` skill file or the agent's previous `osi-impact` skill file. The command MUST refresh only those agents, using the same overwrite and old-name removal behavior as `osi init` for a selected agent. Every other agent MUST be left unchanged, and the command MUST NOT create that agent's skill or command files.

When no agent is already installed, a successful package update MUST leave the project unchanged and MUST exit 0. When the package update fails, the command MUST exit non-zero and MUST NOT modify project files.

The no-subcommand usage text MUST list `upgrade`.

#### Scenario: No prior init writes nothing

- **WHEN** the operator runs `osi upgrade` in a project that has no `opsx-impact` or `osi-impact` skill file
- **AND** the global package update succeeds
- **THEN** the process exits 0
- **AND** the project gains no skill or command file

#### Scenario: Only installed agents are refreshed

- **WHEN** the install root already contains Cursor's opsx-impact skill file and does not contain Claude's
- **AND** the operator runs `osi upgrade` and the global package update succeeds
- **THEN** Cursor's skill and command files match the updated package templates
- **AND** Claude's skill and command files are not created

#### Scenario: Previous skill name still counts as installed

- **WHEN** the install root contains `.cursor/skills/osi-impact/SKILL.md` and does not contain the opsx-impact skill
- **AND** the operator runs `osi upgrade` and the global package update succeeds
- **THEN** `.cursor/skills/osi-impact/SKILL.md` no longer exists
- **AND** `.cursor/skills/opsx-impact/SKILL.md` and `.cursor/commands/opsx-impact.md` match the updated package templates

#### Scenario: Package update failure preserves project files

- **WHEN** the operator runs `osi upgrade` and the global package update fails
- **THEN** the process exits non-zero
- **AND** existing skill files are unchanged
- **AND** no skill or command file is created

#### Scenario: Both command names upgrade

- **WHEN** the operator runs `openspec-impact upgrade` in a project that already has an installed skill
- **AND** the global package update succeeds
- **THEN** the result matches `osi upgrade` for that project
