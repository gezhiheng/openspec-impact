## ADDED Requirements

### Requirement: History YAML does not include usage refs

The history command MUST NOT print a `refs` key. Successful `osi history` stdout MUST still have exactly these top-level keys: `version`, `change`, `seeds`, `history`.

#### Scenario: History stdout has no refs

- **WHEN** the operator runs `osi history add-renewal-status` against the fixture
- **THEN** stdout YAML has top-level keys `version`, `change`, `seeds`, `history`
- **AND** stdout does not contain a top-level `refs:` key
