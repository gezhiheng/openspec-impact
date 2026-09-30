## Context

See proposal.md for motivation. `src/commands/init.ts` currently copies one shared skill and one Cursor command into fixed paths. `src/cli.ts` accepts only bare `init` and writes two hard-coded success lines. The package uses Node.js standard-library APIs and hand-parsed argv. The changed behavior is specified in `specs/osi-init/spec.md` and `specs/osi-distribution/spec.md`.

## Goals / Non-Goals

**Goals:**

- Keep one maintained osi-impact skill body while installing it through tool-specific adapters.
- Detect project-level agent configuration before presenting a multi-select.
- Make the same selection model usable in scripts with an explicit agent list.
- Preserve nearest OpenSpec root resolution and refresh only selected integration files.

**Non-Goals:**

- Detect globally installed applications, running editor processes, or the user's active agent.
- Install user-level/global skills or alter project settings beyond selected integration files.
- Guarantee a shared slash-command syntax across tools.
- Add an `osi update` command or a runtime prompt dependency.

## Decisions

### 1. Use a small adapter registry

- **Choice**: Model each supported agent as registry data with a stable id, display name, project detection markers, skill destination, optional command/prompt destination, and template/frontmatter rules. The initial ids are `cursor`, `claude`, `codex`, `windsurf`, `cline`, `roo`, `opencode`, `github-copilot`, and `pi`.
- **Why**: Detection and installation need the same source of truth. A registry keeps the initial adapters small and makes adding another tool a local change.
- **Alternatives**: Branching on agent names throughout `runInit` was rejected because it duplicates detection and output-path knowledge. Copying the entire skill body into each tool template was rejected because behavior changes would drift.

### 2. Share the skill body and render tool-specific metadata

- **Choice**: Keep the body in `templates/osi-impact/SKILL.md`; have each adapter produce the tool-appropriate `SKILL.md` metadata and any native command/prompt wrapper. Preserve Cursor's `disable-model-invocation: true` in its output only. Keep wrappers short and make them direct the agent to the skill and pass the live change id/path.
- **Why**: The report workflow stays identical while differences such as paths, frontmatter, invocation placeholders, or wrapper availability remain explicit.
- **Alternatives**: Treating all tools as if they shared Cursor's command format was rejected. Writing a permanent full skill copy per tool was rejected.

### 3. Detect project markers, then select from the whole supported list

- **Choice**: Resolve the install root first, then check only known project-level markers from the registry. Print the matching marker paths, preselect matching agent ids, and display every supported option in a checkmarked terminal selector. Up and down move the cursor, space toggles the current row, and enter installs the marked rows. When there are no matches, show the full list with no default selection. Validate the final selection before any writes. Do not infer Codex or another specific tool from a generic `AGENTS.md` or shared `.agents/` directory alone; shared conventions are ambiguous. Exact existing osi-impact output paths may count as markers for the adapter that owns them.
- **Why**: A repository footprint is useful evidence for a default but is not proof of an installed or currently active application. Offering all options lets users select tools whose configuration has not been committed yet.
- **Alternatives**: Scanning installed applications/processes was rejected because it is machine-specific and does not reliably describe the target project. Auto-installing every detected tool without a user choice was rejected by the desired flow.

### 4. Keep non-interactive selection explicit

- **Choice**: Add `--agent <id[,id...]>`. When present, validate all ids, skip the selector, and install exactly that selection. When stdin is not a TTY and no `--agent` is present, return a usage error before creating directories or files. Use Node's built-in stdin raw mode and keypress events for the TTY selector; an empty or cancelled selection writes nothing.
- **Why**: Scripts remain deterministic and avoid a new dependency, while a non-TTY invocation cannot accidentally install based on defaults the caller did not see.
- **Alternatives**: Silently using detected defaults in CI was rejected because it does not honor the user's choice requirement. Adding a menu library was rejected because a raw-mode checklist is sufficient.

### 5. Preserve destination and overwrite boundaries

- **Choice**: Reuse `findProjectRoot(cwd) ?? cwd`. Build the complete set of destination files for the selected adapters before writing, then create parent directories and overwrite those packaged outputs. Never touch unselected integration files or unrelated files. Report the paths actually written, and keep stdout non-YAML.
- **Why**: This keeps existing root behavior and refresh semantics while making partial selection predictable.
- **Alternatives**: Writing a shared fallback file such as root `AGENTS.md` was rejected because it can change behavior for tools the user did not select and may conflict with project instructions.

### 6. Test detection, selection, and package templates independently

- **Choice**: Extend `tests/init.test.ts` with temporary project markers for none, one, and multiple agents; test selection parsing and defaults; cover explicit agent lists, unknown ids, no-TTY refusal, selected-only overwrites, root resolution, and packaged template availability. Keep filesystem tests isolated in temporary directories.
- **Why**: The observable risks are choosing the wrong defaults, writing unselected integrations, or publishing missing templates.
- **Alternatives**: Testing only that template files exist was rejected because it would not exercise detection or selection behavior.

## Risks / Trade-offs

- [Agent configuration paths and metadata conventions change over time] → Keep detection markers, destination paths, and frontmatter rules in the adapter registry and test each supported destination.
- [Generic markers can falsely identify a tool] → Use tool-specific markers; report the actual paths and let the operator change every preselected choice.
- [Some agents do not expose a native slash command] → Install the supported skill format and describe its native invocation in documentation rather than inventing a shared command.
- [Bare `osi init` no longer works unattended] → Fail clearly without writes and document `--agent` for scripts.
- [A partial selection can leave old files for other agents] → Do not clean up unselected files; report only files refreshed by this run.

## Migration Plan

Interactive users run `osi init`, review the detected defaults, and confirm or change the selection. Scripts that previously ran bare `osi init` add `--agent` with their intended targets. After upgrading the package, rerun `osi init` to refresh the selected integrations. Rollback is to revert the package; generated files remain in project configuration directories and can be removed or refreshed by the operator.
