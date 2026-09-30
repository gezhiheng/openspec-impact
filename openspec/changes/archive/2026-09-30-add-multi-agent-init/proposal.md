## Why

`osi init` only installs a Cursor skill and command, which leaves users of other coding agents without the guided impact workflow. Projects may use more than one agent, so setup should detect project configuration and let the operator choose which integrations to install.

## What Changes

- Add project-level adapters for mainstream coding agents, sharing the existing `osi-impact` skill content and adding tool-specific wrappers only where supported.
- Make `osi init` detect known agent configuration, report the detected paths, and open a multi-select with detected agents selected by default. The operator may change the selection, including choosing agents that were not detected.
- Add an explicit agent-list option for non-interactive use; when stdin is not interactive and no agents are specified, fail with usage guidance before writing files.
- Keep install-root discovery and refresh behavior, applying writes only to selected integrations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `osi-init`: detect agent project configuration, allow multi-select installation, and support explicit non-interactive selection while retaining root discovery and selected-file refresh behavior.
- `osi-distribution`: include the supported agent templates/adapters in the published package and install them through `osi init`.

## Impact

- `src/commands/init.ts` and `src/cli.ts` for detection, selection, argv, and reporting.
- `templates/` for shared skill content and agent-specific skill/command adapters.
- `tests/init.test.ts`, README usage, and product documentation.
- No new runtime dependency is intended; the existing Node.js standard-library stack remains sufficient.
- Bare `osi init` becomes interactive in a TTY. Scripts must provide an explicit agent selection.
