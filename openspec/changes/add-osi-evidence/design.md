## Context

See proposal.md for motivation. `parseArgv` today requires first positional `scope` | `history`. `runHistory` always calls `runScope` with search on. Layer YAML helpers already exist (`toYaml`, `toHistoryYaml`).

## Goals / Non-Goals

**Goals:**

- Default argv = pipeline; reserved words keep layer commands.
- One `runScope` per pipeline invocation; history consumes that document.
- Nested YAML is a wrapper, not a merged candidate list.

**Non-Goals:**

- Do not change layer document shapes.
- Do not add `--only=` flags (layer commands cover that).
- Do not add a third evidence layer.

## Decisions

### 1. `osi <change>` not `osi evidence <change>`

- **Choice**: If positional[0] ∈ {`scope`,`history`} → layer (positional[1] is the change). Else positional[0] is the change, command = pipeline. Flags still parsed before positionals (`osi --no-search add-renewal-status`).
- **Why**: Matches the Skill path the operator asked for. One token after `osi`.
- **Alternative**: `osi evidence <change>` — extra word, no collision, but worse default. Rejected.
- **Collision**: a live change named `scope` is not reachable as `osi scope`; pass `openspec/changes/scope`. Frozen reserved set listed in USAGE.

### 2. Extract history-from-scope

- **Choice**: Split `historyFromScope(doc, projectRoot)` used by `runHistory` and the pipeline. `runHistory` stays `runScope` + `historyFromScope`. Pipeline: `runScope(opts)` then `historyFromScope`.
- **Why**: Spec forbids a second search; `--no-search` must empty both file layers.
- **Alternative**: Pipeline shell-out to `osi history` — second harvest/search. Rejected.

### 3. Nested YAML wrapper

- **Choice**: `EvidenceDocument = { version: 1, change, scope: { concepts, candidates, tests }, history: { seeds, history } }`. `toEvidenceYaml` reuses the same quoting as existing dumpers; indent `scope`/`history` maps. Do not emit layer `version` inside sections (outer `version` only).
- **Why**: Two layers, one parse. Inner `history.history` keeps the list key from the layer command so Skill can share parsers.
- **Alternative**: Two YAML docs separated by `---` — harder for naive parsers. Rejected.
- **Alternative**: Reuse `toYaml` at top level plus extra keys — would put `concepts` next to `history` and **BREAK** “exactly these keys”.

### 4. Tests

- **Choice**: Reuse the disposable git fixture pattern from `tests/history.test.ts`. Assert pipeline CLI stdout has `scope:` / `history:` and that `osi scope` stdout still has top-level `candidates:`. One `--no-search` pipeline case. Existing scope/history tests stay.

## Risks / Trade-offs

- [QFT pipeline always pays git log] → Layer `osi scope` remains; Skill can still skip history. No timeout flag in this change.
- [Change id collides with a future layer name] → Add the word to the reserved set in that later change; document current set in USAGE.
- [Inner key `history.history` is awkward] → Keep it so `osi history` and the nested block share item shape; do not rename the layer command in this change.

## Migration Plan

- Rebuild `osi`. Callers of `osi scope` / `osi history` unchanged.
- Scripts that treated any unknown first token as error will now run the pipeline if that token is a valid change.
- Rollback: revert the change; unknown command returns.
