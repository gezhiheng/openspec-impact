## MODIFIED Requirements

### Requirement: Init command installs Cursor skill and command

The CLI SHALL provide `osi init` with no change identifier. In an interactive terminal, it MUST detect project-level configuration for supported coding agents, report the detected paths, and let the operator choose one or more integrations from the complete supported list. Detected integrations MUST be selected by default; when none are detected, none MUST be selected by default. The operator MUST be able to select integrations that were not detected.

The initial supported agent ids MUST include `cursor`, `claude`, `codex`, `windsurf`, `cline`, `roo`, `opencode`, `github-copilot`, and `pi`. For each selected agent, the CLI MUST install the packaged osi-impact skill in that agent's project-level skill location and any tool-specific command or prompt adapter provided for that agent. Cursor MUST continue to receive `.cursor/skills/osi-impact/SKILL.md` and `.cursor/commands/osi-impact.md`; its skill MUST contain YAML frontmatter `name: osi-impact` and `disable-model-invocation: true`, and its command MUST tell the agent to follow that skill with the invocation argument as a live OpenSpec change id or path.

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
- **THEN** `.cursor/skills/osi-impact/SKILL.md` exists and contains `name: osi-impact`
- **AND** `.cursor/commands/osi-impact.md` exists

### Requirement: Init overwrites existing install files

For each selected integration, if a destination file already exists, the CLI MUST replace its contents with the packaged template. Missing selected files MUST still be created. Files belonging to unselected integrations MUST remain unchanged. The CLI MUST NOT delete unrelated files under agent configuration directories.

#### Scenario: Selected existing skill is refreshed

- **WHEN** a selected agent's osi-impact skill file already exists with different contents
- **AND** the operator completes `osi init`
- **THEN** that file's contents match the packaged template
- **AND** the process exits 0

#### Scenario: Unselected integration is left alone

- **WHEN** an integration has an existing osi-impact file but is not selected
- **AND** the operator completes `osi init` for other agents
- **THEN** the unselected file remains unchanged

### Requirement: Init locates the install root

The CLI MUST walk upward from the current working directory to find an OpenSpec project root (a directory that contains `openspec/`), using the same nearest-root rule as `osi scope`. If found, that directory is the install root for every selected integration. If none is found, the current working directory is the install root.

#### Scenario: Subdirectory still installs selected integrations at the OpenSpec root

- **WHEN** a project contains `openspec/` at its root
- **AND** the operator runs `osi init` from a subdirectory and selects an integration
- **THEN** that integration's files are written under the OpenSpec project root, not under the subdirectory

#### Scenario: No OpenSpec root uses cwd

- **WHEN** no ancestor directory contains `openspec/`
- **AND** the operator runs `osi init` and selects an integration
- **THEN** that integration's files are written under the current working directory
