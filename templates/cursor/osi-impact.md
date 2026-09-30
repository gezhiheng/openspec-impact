---
name: '/osi-impact'
id: 'osi-impact'
---

Follow the `osi-impact` skill. Usage: `/osi-impact {change} [--base <name>=<ref> ...]`

`{change}` is a live OpenSpec change id or path (`add-renewal-status`, `openspec/changes/add-renewal-status`). Run `osi impact {change}` for YAML evidence.

Optional per-repository base when automatic default-branch discovery is unavailable. `<name>` is that Git root's basename or workspace-relative path. Repeat `--base` once per root:

`/osi-impact add-renewal-status --base qft-app=origin/main --base qft-all=origin/develop`
