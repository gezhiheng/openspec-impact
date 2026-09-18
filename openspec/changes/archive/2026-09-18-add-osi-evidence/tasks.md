## 1. History from one scope pass

- [x] 1.1 Extract `historyFromScope(scopeDoc, projectRoot)` from `runHistory` (named seeds + co-change) and keep `runHistory` as `runScope` + that helper
- [x] 1.2 Confirm `osi history` tests still pass with the same YAML shape

## 2. Nested evidence YAML and command

- [x] 2.1 Add `EvidenceDocument` and `toEvidenceYaml` with top-level keys `version`, `change`, `scope`, `history` (no inner `version`; `scope` has concepts/candidates/tests; `history` has seeds/history)
- [x] 2.2 Add `runEvidence` that runs `runScope` once then `historyFromScope`, forwarding `--no-search` / `--include-low`
- [x] 2.3 Teach `parseArgv` that `scope`/`history` are reserved layer commands and any other single positional is a change id for the pipeline; update USAGE

## 3. Tests

- [x] 3.1 Pipeline CLI: `osi add-renewal-status` prints nested YAML; locate miss is non-zero with no YAML
- [x] 3.2 `osi --no-search <change>` empties `scope.candidates`, `history.seeds`, and `history.history`
- [x] 3.3 Git fixture: named seed + ≥2 co-change appear under `history`; `osi scope` stdout still has top-level `candidates:`
