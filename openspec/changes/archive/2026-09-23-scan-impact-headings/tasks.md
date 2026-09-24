## 1. Skill Shape

- [x] 1.1 Rewrite the paragraph above `## Steps` in `templates/osi-impact/SKILL.md`: five headings in order `## 一句话` → `## 影响范围` → `## 可能遗漏` → `## 故意没动` → `## 上线注意`. Drop `会变什么` / `可能漏了` / `收尾`
- [x] 1.2 Replace the numbered section list and the rules under it through the examples. Keep the Visualize box, Deliver's no-YAML line, Steps 1–7, and「Need another file」. New rules: ASCII under `影响范围`; one `入口  会变：一句（file）` line per surface; 公共 blast radius is the first of those lines (one `sample`, or 「多处共用」 when `wide`); gaps only under `可能遗漏` (`未见遗漏` if none); empty `故意没动` / `上线注意` is `无`
- [x] 1.3 Replace examples with PermButton + PermCheck. Planned and partial/done both use the five headings. Planned `一句话` starts with「若改」. Partial/done puts a two-line state machine and a two-cell 入口表 inside `影响范围`, plus one shared-place line (`TenantList`), one `可能遗漏` line (`PermCheck.java`), one `故意没动`, one `上线注意`. One forbidden shape: a paragraph marked only by the prefix `可能漏了：`. No product-domain nouns
- [x] 1.4 Diff Steps 1–7 and the「Need another file」line against the previous template: unchanged. Frontmatter still has `disable-model-invocation: true` and slash-only firing

## 2. Read-through

- [x] 2.1 Read only the example: it shows five headings, `影响范围` is a line list, `可能遗漏` is its own heading. If Shape is longer than Steps, cut bans before cutting headings or the example ASCII
