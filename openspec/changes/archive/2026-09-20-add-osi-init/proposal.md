## Why

`osi-impact` Skill 是给用户看影响面的入口，但正文只活在被 gitignore 的 `.cursor/skills/` 里，发版和协作都带不上。用户项目也没有安装步骤；OpenSpec 用 `openspec init` 把 skill/command 拷进编辑器目录，OSI 缺对等命令。

## What Changes

- 把 Cursor 用的 `osi-impact` Skill 和 `/osi-impact` command 模板放进本仓库并随 npm 包发布，作为唯一正文。
- 新增 `osi init`：在当前项目写入 `.cursor/skills/osi-impact/SKILL.md` 和 `.cursor/commands/osi-impact.md`。已存在则覆盖。
- **BREAKING（仅对 change 名为 `init`）**: 第一位置参数 `init` 成为保留字，不再当 change id。该 change 用路径传入。
- 本仓继续 ignore `.cursor/`；本地用 `osi init` 生成狗食拷贝，不维护第二份正文。

## Capabilities

### New Capabilities

- `osi-init`: `osi init` copies the versioned osi-impact skill and Cursor command into the project so `/osi-impact {spec name}` works.

### Modified Capabilities

- `osi-evidence`: Reserved first-token commands include `init` alongside `scope` and `history`. `osi init` does not run the evidence pipeline or print YAML.

## Impact

- **In scope**: tracked templates, `osi init` copy/overwrite, argv reserved word, USAGE, tests in a temp dir.
- **Out of scope**: `osi update`, `--tools` / Claude / Codex, interactive picker, creating `openspec/`, editing the user's `.gitignore`, `npm i -g`, changing impact YAML or harvest.
- **Compatibility**: `osi scope` / `osi history` / `osi <change>` unchanged except a live change named `init`.
- **Deps**: none.
