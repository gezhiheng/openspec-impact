## Purpose

Lets an operator run `osi init` in a project to install the versioned osi-impact Cursor skill and slash command so `/osi-impact {spec name}` works.

## ADDED Requirements

### Requirement: Init command installs Cursor skill and command

The CLI SHALL provide `osi init` with no change identifier. On success it MUST write these two files under the install root, creating parent directories as needed, and MUST exit 0:

- `.cursor/skills/osi-impact/SKILL.md`
- `.cursor/commands/osi-impact.md`

The skill file MUST be the packaged osi-impact template (YAML frontmatter `name: osi-impact` and `disable-model-invocation: true`). The command file MUST tell the agent to follow that skill, with the invocation argument as the live OpenSpec change id or path. The CLI MUST NOT print a YAML document on stdout. The CLI MUST NOT create an `openspec/` directory.

#### Scenario: Fresh project gets both files

- **WHEN** the operator runs `osi init` from a directory with no `.cursor/` tree
- **THEN** the process exits 0
- **AND** `.cursor/skills/osi-impact/SKILL.md` exists and contains `name: osi-impact`
- **AND** `.cursor/commands/osi-impact.md` exists
- **AND** stdout is not a YAML document

#### Scenario: Extra arguments are usage errors

- **WHEN** the operator runs `osi init add-renewal-status`
- **THEN** the CLI exits non-zero
- **AND** neither skill nor command file is written
- **AND** stdout is not a YAML document

### Requirement: Init locates the install root

The CLI MUST walk upward from the current working directory to find an OpenSpec project root (a directory that contains `openspec/`), using the same nearest-root rule as `osi scope`. If found, that directory is the install root. If none is found, the current working directory is the install root.

#### Scenario: Subdirectory still installs at the OpenSpec root

- **WHEN** a project contains `openspec/` at its root
- **AND** the operator runs `osi init` from a subdirectory
- **THEN** the skill and command files are written under that OpenSpec project root, not under the subdirectory

#### Scenario: No OpenSpec root uses cwd

- **WHEN** no ancestor directory contains `openspec/`
- **AND** the operator runs `osi init`
- **THEN** the skill and command files are written under the current working directory

### Requirement: Init overwrites existing install files

If either destination file already exists, the CLI MUST replace its contents with the packaged template. Missing files MUST still be created. The CLI MUST NOT delete other files under `.cursor/`.

#### Scenario: Existing skill is replaced

- **WHEN** `.cursor/skills/osi-impact/SKILL.md` already exists with different contents
- **AND** the operator runs `osi init`
- **THEN** that file's contents match the packaged template
- **AND** the process exits 0
