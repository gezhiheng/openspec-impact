## MODIFIED Requirements

### Requirement: Init command installs Cursor skill and command

The CLI SHALL provide `osi init` with no change identifier. In an interactive terminal, it MUST detect project-level configuration for supported coding agents, report the detected paths, and let the operator choose one or more integrations from the complete supported list. Detected integrations MUST be selected by default; when none are detected, none MUST be selected by default. The operator MUST be able to select integrations that were not detected.

The initial supported agent ids MUST include `cursor`, `claude`, `codex`, `windsurf`, `cline`, `roo`, `opencode`, `github-copilot`, and `pi`. For each selected agent, the CLI MUST install the packaged opsx-impact skill in that agent's project-level skill location and any tool-specific command or prompt adapter provided for that agent. Every installed skill file MUST contain YAML frontmatter `name: opsx-impact` and `disable-model-invocation: true`. Cursor MUST receive `.cursor/skills/opsx-impact/SKILL.md` and `.cursor/commands/opsx-impact.md`. The Cursor command MUST tell the agent to follow the `opsx-impact` skill, with the invocation `/opsx-impact` and the argument as a live OpenSpec change id or path.

The CLI MUST support `osi init --agent <id[,id...]>` for non-interactive use. This option MUST validate the complete selection before writing and MUST install only the listed integrations without prompting. If stdin is not interactive and no agent selection is provided, the CLI MUST exit non-zero with usage guidance and MUST NOT write files. Invalid agent ids MUST also fail before writing files.

On success, `osi init` MUST exit 0, MUST NOT print a YAML document on stdout, and MUST NOT create an `openspec/` directory.

#### Scenario: Detected integrations are preselected before installation

- **WHEN** the operator runs `osi init` in an interactive terminal and the project contains configuration markers for Cursor and Codex
- **THEN** the CLI reports the detected marker paths before presenting the multi-select
- **AND** Cursor and Codex are selected by default
- **AND** the operator can add or remove selections before installation

#### Scenario: No detected integrations still allows manual selection

- **WHEN** the operator runs `osi init` in an interactive terminal and no supported agent configuration is detected
- **THEN** the CLI reports that no integrations were detected
- **AND** presents the complete supported agent list with no integrations selected by default
- **AND** installs only the integrations selected by the operator

#### Scenario: Explicit agent list installs without prompting

- **WHEN** the operator runs `osi init --agent cursor,codex`
- **THEN** the CLI installs the Cursor and Codex integrations without opening the selector
- **AND** does not install integrations omitted from the list
- **AND** stdout is not a YAML document

#### Scenario: Non-interactive init requires an explicit selection

- **WHEN** the operator runs `osi init` without an interactive stdin and without `--agent`
- **THEN** the CLI exits non-zero with guidance to provide `--agent`
- **AND** no integration files are written

#### Scenario: Invalid agent selection writes nothing

- **WHEN** the operator runs `osi init --agent cursor,unknown-agent`
- **THEN** the CLI exits non-zero with a usage error
- **AND** no integration files are written

#### Scenario: Fresh project gets the Cursor integration

- **WHEN** the operator selects Cursor in `osi init`
- **THEN** `.cursor/skills/opsx-impact/SKILL.md` exists and contains `name: opsx-impact`
- **AND** `.cursor/commands/opsx-impact.md` exists and contains `/opsx-impact`
- **AND** `.cursor/skills/osi-impact/SKILL.md` does not exist
- **AND** `.cursor/commands/osi-impact.md` does not exist

## ADDED Requirements

### Requirement: Init removes the previous osi-impact install for selected agents

When `osi init` installs an agent, it MUST remove that agent's previous skill file and command or prompt file whose path contains the `osi-impact` skill name, if those files exist. It MUST NOT remove `osi-impact` files for an agent that was not selected. It MUST NOT remove any other file.

#### Scenario: Re-init drops the old Cursor command

- **WHEN** the project already contains `.cursor/skills/osi-impact/SKILL.md` and `.cursor/commands/osi-impact.md`
- **AND** the operator runs `osi init --agent cursor`
- **THEN** those two files no longer exist
- **AND** `.cursor/skills/opsx-impact/SKILL.md` and `.cursor/commands/opsx-impact.md` exist

#### Scenario: Unselected agent's old skill remains

- **WHEN** `.claude/skills/osi-impact/SKILL.md` exists
- **AND** the operator runs `osi init --agent cursor`
- **THEN** `.claude/skills/osi-impact/SKILL.md` remains unchanged
