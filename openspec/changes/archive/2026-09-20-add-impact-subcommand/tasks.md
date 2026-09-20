## 1. CLI

- [x] 1.1 Add `impact` to the arity-1 reserved set; `parseArgv` maps it to `command: 'impact'`; bare change ids and `osi impact` with no id are usage errors; update USAGE
- [x] 1.2 Dispatch `impact` to `runEvidence` with the same flags as today's pipeline

## 2. Templates

- [x] 2.1 In `templates/osi-impact/SKILL.md` and `templates/cursor/osi-impact.md`, use `{change}` and `osi impact {change}` (not `{spec name}` / bare `osi {change}`)

## 3. Tests

- [x] 3.1 `osi impact add-renewal-status` prints history YAML; `osi add-renewal-status` is non-zero with no YAML
- [x] 3.2 `osi --no-search impact add-renewal-status` empties seeds/history; `osi impact does-not-exist` is locate failure with no YAML
