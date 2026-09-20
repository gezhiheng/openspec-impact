## 1. Templates

- [x] 1.1 Add `templates/osi-impact/SKILL.md` with the current osi-impact skill body (`name: osi-impact`, `disable-model-invocation: true`)
- [x] 1.2 Add `templates/cursor/osi-impact.md` command stub for `/osi-impact {spec name}` that points at that skill

## 2. Init command

- [x] 2.1 Add `runInit({ cwd })`: resolve package root via `package.json`, copy both templates under the install root (`findProjectRoot` or cwd), mkdir + overwrite
- [x] 2.2 Teach `parseArgv` that lone `init` is a setup command; extra positionals are usage errors; update USAGE; `main` dispatches without YAML

## 3. Tests

- [x] 3.1 Temp dir: `osi init` writes both files, skill contains `name: osi-impact`, stdout is not YAML, exit 0
- [x] 3.2 Overwrite existing skill; install from a subdirectory of a fake `openspec/` root; `osi init extra` is non-zero and writes nothing
- [x] 3.3 `osi init` in a dir that has `openspec/changes/init/` still does not print history YAML
