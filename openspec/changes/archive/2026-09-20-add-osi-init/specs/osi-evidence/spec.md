## MODIFIED Requirements

### Requirement: Default invocation runs the evidence pipeline

When the first positional argument is not a reserved command (`scope`, `history`, `init`), the CLI SHALL treat it as a change identifier or path and run the evidence pipeline: locate the same live OpenSpec change as `osi scope`, produce scope internally (typed search), then the history layer from that result. Locate failure MUST exit non-zero, explain on stderr, and MUST NOT print YAML on stdout. `osi scope <change>` and `osi history <change>` MUST remain available. `osi init` MUST remain available and MUST NOT run the evidence pipeline. `osi scope` MUST keep its existing top-level YAML shape (`concepts`, `candidates`, `tests`). `osi history` MUST keep `version`, `change`, `seeds`, `history`. A live change whose id is `init` is reachable only as a path (`openspec/changes/init`).

#### Scenario: Change id runs the pipeline

- **WHEN** the operator runs `osi add-renewal-status` from a project that contains `openspec/changes/add-renewal-status/`
- **THEN** the CLI locates that change
- **AND** stdout is the history-shaped YAML (not the `osi scope` document)

#### Scenario: Reserved word still selects the layer command

- **WHEN** the operator runs `osi scope add-renewal-status`
- **THEN** stdout is the existing scope YAML (`concepts`, `candidates`, `tests` at the top level)

#### Scenario: Unknown identifier

- **WHEN** the operator runs `osi does-not-exist` and no live change directory matches
- **THEN** the CLI exits non-zero
- **AND** stdout is not a YAML document

#### Scenario: Init does not run the pipeline

- **WHEN** the operator runs `osi init` from a project that contains `openspec/changes/init/`
- **THEN** the CLI does not treat `init` as that change
- **AND** stdout is not the history-shaped YAML
