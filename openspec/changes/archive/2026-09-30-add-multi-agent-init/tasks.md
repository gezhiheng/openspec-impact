## 1. Agent integrations

- [x] 1.1 Define the initial eight agent adapters with stable ids, labels, detection markers, project skill destinations, and optional native command/prompt outputs
- [x] 1.2 Keep the osi-impact workflow body shared and add any per-agent frontmatter or wrapper templates required by the adapters
- [x] 1.3 Verify the packaged templates include the current Cursor skill and command unchanged in behavior

## 2. Detection and selection

- [x] 2.1 Detect supported project markers under the resolved install root and report the paths that matched
- [x] 2.2 Add a standard-library multi-select prompt that preselects detected adapters, shows all adapters when none are detected, and validates the final selection before writing
- [x] 2.3 Add `osi init --agent <id[,id...]>` parsing and deterministic non-interactive installation; reject missing non-TTY selection and invalid ids before writes
- [x] 2.4 Install and refresh files for selected adapters only, preserving nearest-root behavior and reporting the paths written

## 3. Verification and documentation

- [x] 3.1 Extend init tests for zero/one/multiple detections, preselection and manual selection, explicit lists, invalid ids, non-TTY behavior, selected-only writes, overwrite behavior, and root resolution
- [x] 3.2 Update English and Chinese README usage and the product overview with detected multi-select behavior, supported agents, and the `--agent` script form
- [x] 3.3 Verify the npm package includes all runtime templates and run the full test suite plus OpenSpec validation
