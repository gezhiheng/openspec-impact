import { emitKeypressEvents } from 'node:readline'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { UsageError } from '../models/evidence.js'
import { findProjectRoot } from '../openspec/parser.js'

export const INIT_SKILL_REL = '.cursor/skills/osi-impact/SKILL.md'
export const INIT_COMMAND_REL = '.cursor/commands/osi-impact.md'

export type AgentAdapter = {
  id: string
  label: string
  markers: readonly string[]
  skill: string
  command?: string
  commandTemplate?: string
}

const OTHER_FRONT = [
  '---',
  'name: osi-impact',
  'description: Judge a live OpenSpec change from `osi` evidence. Usage: /osi-impact {change}',
  '---',
].join('\n')

const GENERATED_COMMAND = `Follow the \`osi-impact\` skill. Usage: \`/osi-impact {change}\`

\`{change}\` is a live OpenSpec change id or path (\`add-renewal-status\`, \`openspec/changes/add-renewal-status\`). Run \`osi impact {change}\` for YAML evidence.
`

export const AGENTS: readonly AgentAdapter[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    markers: ['.cursor'],
    skill: INIT_SKILL_REL,
    command: INIT_COMMAND_REL,
    commandTemplate: 'cursor/osi-impact.md',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    markers: ['.claude', 'CLAUDE.md'],
    skill: '.claude/skills/osi-impact/SKILL.md',
  },
  {
    id: 'codex',
    label: 'Codex',
    // .agents/ and AGENTS.md are shared; they must not select Codex.
    markers: ['.codex'],
    skill: '.agents/skills/osi-impact/SKILL.md',
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    markers: ['.windsurf', '.windsurfrules'],
    skill: '.windsurf/skills/osi-impact/SKILL.md',
    command: '.windsurf/workflows/osi-impact.md',
  },
  {
    id: 'cline',
    label: 'Cline',
    markers: ['.cline', '.clinerules'],
    skill: '.cline/skills/osi-impact/SKILL.md',
    command: '.clinerules/workflows/osi-impact.md',
  },
  {
    id: 'roo',
    label: 'Roo Code',
    markers: ['.roo', '.roorules', '.roomodes'],
    skill: '.roo/skills/osi-impact/SKILL.md',
    command: '.roo/commands/osi-impact.md',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    markers: ['.opencode', 'opencode.json'],
    skill: '.opencode/skills/osi-impact/SKILL.md',
    command: '.opencode/commands/osi-impact.md',
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    markers: [
      '.github/copilot-instructions.md',
      '.github/skills',
      '.github/prompts',
      '.github/agents',
      '.github/instructions',
    ],
    skill: '.github/skills/osi-impact/SKILL.md',
    command: '.github/prompts/osi-impact.prompt.md',
  },
  {
    id: 'pi',
    label: 'Pi',
    markers: ['.pi'],
    skill: '.pi/skills/osi-impact/SKILL.md',
    command: '.pi/prompts/osi-impact.md',
  },
]

export function agentIds(): string {
  return AGENTS.map((agent) => agent.id).join(', ')
}

export function packageRoot(from = import.meta.url): string {
  let dir = dirname(fileURLToPath(from))
  while (true) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new UsageError('osi package.json not found')
    }
    dir = parent
  }
}

function markerRels(agent: AgentAdapter): string[] {
  return [...agent.markers, agent.skill, agent.command].filter((rel): rel is string => Boolean(rel))
}

export type Detection = { id: string; paths: string[] }

export function detectAgents(root: string): Detection[] {
  const found: Detection[] = []
  for (const agent of AGENTS) {
    const paths = markerRels(agent).filter((rel) => existsSync(join(root, rel)))
    if (paths.length > 0) {
      found.push({ id: agent.id, paths })
    }
  }
  return found
}

export type MenuState = { index: number; selected: Set<string> }
export type MenuKey = { name?: string; ctrl?: boolean }

export function menuState(detectedIds: readonly string[]): MenuState {
  return { index: 0, selected: new Set(detectedIds) }
}

export function selectedIds(state: MenuState): string[] {
  return AGENTS.filter((agent) => state.selected.has(agent.id)).map((agent) => agent.id)
}

export function applyMenuKey(
  state: MenuState,
  key: MenuKey,
): 'submit' | 'cancel' | 'redraw' | 'ignore' {
  const last = AGENTS.length - 1
  if (key.ctrl && key.name === 'c') {
    return 'cancel'
  }
  if (key.name === 'up') {
    if (state.index === 0) {
      return 'ignore'
    }
    state.index -= 1
    return 'redraw'
  }
  if (key.name === 'down') {
    if (state.index === last) {
      return 'ignore'
    }
    state.index += 1
    return 'redraw'
  }
  if (key.name === 'space') {
    const id = AGENTS[state.index]?.id
    if (!id) {
      return 'ignore'
    }
    if (state.selected.has(id)) {
      state.selected.delete(id)
    } else {
      state.selected.add(id)
    }
    return 'redraw'
  }
  if (key.name === 'return') {
    return 'submit'
  }
  return 'ignore'
}

export function formatInitPrompt(
  detected: Detection[],
  state = menuState(detected.map((hit) => hit.id)),
): string {
  const lines: string[] = []
  if (detected.length === 0) {
    lines.push('No integrations detected.')
  } else {
    lines.push('Detected:')
    for (const hit of detected) {
      for (const rel of hit.paths) {
        lines.push(`  ${rel}`)
      }
    }
  }
  lines.push('', '↑/↓ move, space toggle, enter install')
  for (const [index, agent] of AGENTS.entries()) {
    const cursor = index === state.index ? '>' : ' '
    const mark = state.selected.has(agent.id) ? 'x' : ' '
    lines.push(`${cursor} [${mark}] ${agent.id} - ${agent.label}`)
  }
  return `${lines.join('\n')}\n`
}

function paint(text: string, previousLines: number): number {
  const lines = text.replace(/\n$/, '').split('\n')
  if (previousLines > 0) {
    process.stdout.write(`\x1b[${previousLines}A`)
  }
  process.stdout.write(`${lines.map((line) => `\x1b[2K${line}`).join('\n')}\n`)
  return lines.length
}

export function parseAgentList(value: string): string[] {
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length === 0 || parts.some((part) => part === '')) {
    throw new UsageError('Missing agent id')
  }
  const ids: string[] = []
  for (const part of parts) {
    if (!AGENTS.some((agent) => agent.id === part)) {
      throw new UsageError(`Unknown agent: ${part}`)
    }
    ids.push(part)
  }
  return [...new Set(ids)]
}

export async function promptInit(cwd: string): Promise<string[]> {
  const detected = detectAgents(findProjectRoot(cwd) ?? cwd)
  const state = menuState(detected.map((hit) => hit.id))
  const stdin = process.stdin
  emitKeypressEvents(stdin)
  stdin.setRawMode(true)
  stdin.resume()
  process.stdout.write('\x1b[?25l')
  let rows = paint(formatInitPrompt(detected, state), 0)
  return new Promise((resolve) => {
    const finish = (ids: string[]) => {
      stdin.off('keypress', onKey)
      stdin.setRawMode(false)
      stdin.pause()
      process.stdout.write('\x1b[?25h')
      resolve(ids)
    }
    const onKey = (_str: string, key: MenuKey | undefined) => {
      if (!key) {
        return
      }
      const action = applyMenuKey(state, key)
      if (action === 'cancel') {
        process.stdout.write('\n')
        finish([])
        return
      }
      if (action === 'submit') {
        finish(selectedIds(state))
        return
      }
      if (action === 'redraw') {
        rows = paint(formatInitPrompt(detected, state), rows)
      }
    }
    stdin.on('keypress', onKey)
  })
}

function renderSkill(id: string, raw: string): string {
  if (id === 'cursor') {
    return raw
  }
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/^\n/, '')
  return `${OTHER_FRONT}\n\n${body}`
}

function parentIsFile(root: string, rel: string): boolean {
  const parts = rel.split('/')
  for (let i = 1; i < parts.length; i++) {
    const abs = join(root, ...parts.slice(0, i))
    if (existsSync(abs) && !statSync(abs).isDirectory()) {
      return true
    }
  }
  return false
}

export function runInit(opts: { cwd: string; agents: string[] }): {
  root: string
  wrote: string[]
} {
  const root = findProjectRoot(opts.cwd) ?? opts.cwd
  const selected: AgentAdapter[] = []
  for (const id of opts.agents) {
    const agent = AGENTS.find((item) => item.id === id)
    if (!agent) {
      throw new UsageError(`Unknown agent: ${id}`)
    }
    if (!selected.includes(agent)) {
      selected.push(agent)
    }
  }
  if (selected.length === 0) {
    return { root, wrote: [] }
  }
  const pkg = packageRoot()
  const skillSrc = join(pkg, 'templates/osi-impact/SKILL.md')
  if (!existsSync(skillSrc)) {
    throw new UsageError('osi init templates not found')
  }
  const skillRaw = readFileSync(skillSrc, 'utf8')
  let cursorCommand = ''
  if (selected.some((agent) => agent.commandTemplate)) {
    const commandSrc = join(pkg, 'templates/cursor/osi-impact.md')
    if (!existsSync(commandSrc)) {
      throw new UsageError('osi init templates not found')
    }
    cursorCommand = readFileSync(commandSrc, 'utf8')
  }
  const planned: { rel: string; text: string }[] = []
  for (const agent of selected) {
    const files = [
      { rel: agent.skill, text: renderSkill(agent.id, skillRaw) },
      ...(agent.command
        ? [{ rel: agent.command, text: agent.commandTemplate ? cursorCommand : GENERATED_COMMAND }]
        : []),
    ]
    for (const file of files) {
      if (parentIsFile(root, file.rel)) {
        process.stderr.write(`Skipped ${file.rel} (parent path is a file)\n`)
        continue
      }
      planned.push(file)
    }
  }
  for (const file of planned) {
    const dest = join(root, file.rel)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, file.text)
  }
  return { root, wrote: planned.map((file) => file.rel) }
}
