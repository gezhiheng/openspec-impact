import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgv } from '../src/cli.js'
import { UsageError } from '../src/models/evidence.js'
import {
  AGENTS,
  INIT_COMMAND_REL,
  INIT_SKILL_REL,
  applyMenuKey,
  detectAgents,
  formatInitPrompt,
  menuState,
  parseAgentList,
  selectedIds,
  runInit,
} from '../src/commands/init.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const cli = join(repoRoot, 'dist/src/cli.js')
const skillTemplate = join(repoRoot, 'templates/osi-impact/SKILL.md')
const cursorCommand = join(repoRoot, 'templates/cursor/osi-impact.md')

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'osi-init-'))
}

function osi(cwd: string, args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' })
}

function notYaml(stdout: string): void {
  assert.equal(/^version:/m.test(stdout), false)
  assert.equal(/^seeds:/m.test(stdout), false)
  assert.equal(/^history:/m.test(stdout), false)
}

function writeRel(dir: string, rel: string, text = 'x\n'): void {
  const dest = join(dir, rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, text)
}

describe('osi init argv', () => {
  it('parses init, --agent lists, and rejects unknown ids', () => {
    const bare = parseArgv(['init'])
    assert.equal(bare.ok, true)
    if (bare.ok && bare.command === 'init') {
      assert.equal(bare.agents, undefined)
    }
    assert.equal(parseArgv(['init', 'add-renewal-status']).ok, false)
    const listed = parseArgv(['init', '--agent', 'cursor,codex'])
    assert.equal(listed.ok, true)
    if (listed.ok && listed.command === 'init') {
      assert.deepEqual(listed.agents, ['cursor', 'codex'])
    }
    const inline = parseArgv(['--agent=claude', 'init'])
    assert.equal(inline.ok, true)
    if (inline.ok && inline.command === 'init') {
      assert.deepEqual(inline.agents, ['claude'])
    }
    assert.equal(parseArgv(['init', '--agent']).ok, false)
    assert.equal(parseArgv(['init', '--agent', 'cursor,unknown-agent']).ok, false)
    assert.equal(parseArgv(['--agent', 'cursor', 'impact', 'add-renewal-status']).ok, false)
    assert.throws(() => parseAgentList('cursor,'), UsageError)
  })
})

describe('osi init detection', () => {
  it('reports zero, one, and multiple markers without shared agent files', () => {
    const none = tmp()
    const one = tmp()
    const many = tmp()
    const shared = tmp()
    const exact = tmp()
    try {
      assert.deepEqual(detectAgents(none), [])
      assert.match(formatInitPrompt([]), /No integrations detected/)
      assert.match(formatInitPrompt([]), /> \[ \] cursor/)

      mkdirSync(join(one, '.cursor'))
      const cursorOnly = detectAgents(one)
      assert.deepEqual(
        cursorOnly.map((hit) => hit.id),
        ['cursor'],
      )
      assert.deepEqual(cursorOnly[0]?.paths, ['.cursor'])
      const onePrompt = formatInitPrompt(cursorOnly)
      assert.match(onePrompt, /Detected:\n {2}\.cursor/)
      assert.match(onePrompt, /> \[x\] cursor/)
      assert.match(onePrompt, / {2}\[ \] claude/)

      mkdirSync(join(many, '.cursor'))
      mkdirSync(join(many, '.codex'))
      const both = detectAgents(many)
      assert.deepEqual(
        both.map((hit) => hit.id),
        ['cursor', 'codex'],
      )
      const state = menuState(['cursor', 'codex'])
      assert.deepEqual(selectedIds(state), ['cursor', 'codex'])
      assert.equal(applyMenuKey(state, { name: 'down' }), 'redraw')
      assert.equal(applyMenuKey(state, { name: 'down' }), 'redraw')
      assert.equal(applyMenuKey(state, { name: 'space' }), 'redraw')
      assert.equal(applyMenuKey(state, { name: 'up' }), 'redraw')
      assert.equal(applyMenuKey(state, { name: 'space' }), 'redraw')
      assert.deepEqual(selectedIds(state), ['cursor', 'claude'])
      assert.equal(applyMenuKey(state, { name: 'return' }), 'submit')
      assert.equal(applyMenuKey(state, { name: 'c', ctrl: true }), 'cancel')
      assert.equal(applyMenuKey(menuState([]), { name: 'up' }), 'ignore')

      writeFileSync(join(shared, 'AGENTS.md'), '# agents\n')
      writeRel(shared, '.agents/skills/other/SKILL.md', '---\nname: other\n---\n')
      assert.deepEqual(detectAgents(shared), [])

      writeRel(exact, '.agents/skills/osi-impact/SKILL.md', 'installed\n')
      const owned = detectAgents(exact)
      assert.deepEqual(
        owned.map((hit) => hit.id),
        ['codex'],
      )
      assert.equal(owned[0]?.paths.includes('.agents/skills/osi-impact/SKILL.md'), true)
    } finally {
      rmSync(none, { recursive: true, force: true })
      rmSync(one, { recursive: true, force: true })
      rmSync(many, { recursive: true, force: true })
      rmSync(shared, { recursive: true, force: true })
      rmSync(exact, { recursive: true, force: true })
    }
  })
})

describe('osi init', () => {
  it('installs only the requested agents and keeps the Cursor templates', () => {
    for (const agent of AGENTS) {
      const dir = tmp()
      try {
        const r = osi(dir, ['init', '--agent', agent.id])
        assert.equal(r.status, 0, `${agent.id}\n${r.stderr}`)
        notYaml(r.stdout)
        assert.equal(r.stdout.includes('Detected:'), false)
        assert.equal(existsSync(join(dir, 'openspec')), false)
        const skill = readFileSync(join(dir, agent.skill), 'utf8')
        assert.match(skill, /name: osi-impact/)
        assert.match(skill, /## 一句话/)
        if (agent.id === 'cursor') {
          assert.equal(skill, readFileSync(skillTemplate, 'utf8'))
          assert.equal(
            readFileSync(join(dir, INIT_COMMAND_REL), 'utf8'),
            readFileSync(cursorCommand, 'utf8'),
          )
        } else {
          assert.equal(skill.includes('disable-model-invocation'), false)
        }
        if (agent.command) {
          const command = readFileSync(join(dir, agent.command), 'utf8')
          assert.match(command, /osi-impact/)
          assert.match(command, /add-renewal-status/)
          assert.equal(r.stdout.includes(`Wrote ${agent.command}`), true)
        }
        assert.equal(r.stdout.includes(`Wrote ${agent.skill}`), true)
        const other = AGENTS.find((item) => item.id !== agent.id)
        if (other) {
          assert.equal(existsSync(join(dir, other.skill)), false)
        }
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }
  })

  it('refreshes the selection, leaves other files, and resolves the install root', () => {
    const dir = tmp()
    try {
      writeRel(dir, INIT_SKILL_REL, 'stale\n')
      writeRel(dir, '.claude/skills/osi-impact/SKILL.md', 'keep\n')
      writeRel(dir, '.cursor/rules/keep.md', 'rule\n')
      const refreshed = runInit({ cwd: dir, agents: ['cursor'] })
      assert.deepEqual(refreshed.wrote, [INIT_SKILL_REL, INIT_COMMAND_REL])
      const after = readFileSync(join(dir, INIT_SKILL_REL), 'utf8')
      assert.equal(after, readFileSync(skillTemplate, 'utf8'))
      assert.equal(readFileSync(join(dir, '.claude/skills/osi-impact/SKILL.md'), 'utf8'), 'keep\n')
      assert.equal(readFileSync(join(dir, '.cursor/rules/keep.md'), 'utf8'), 'rule\n')

      const project = tmp()
      mkdirSync(join(project, 'openspec'), { recursive: true })
      mkdirSync(join(project, 'src'), { recursive: true })
      try {
        const r = osi(join(project, 'src'), ['init', '--agent', 'cursor'])
        assert.equal(r.status, 0, r.stderr)
        assert.equal(existsSync(join(project, INIT_SKILL_REL)), true)
        assert.equal(existsSync(join(project, 'src', INIT_SKILL_REL)), false)
      } finally {
        rmSync(project, { recursive: true, force: true })
      }

      const empty = tmp()
      try {
        const extra = osi(empty, ['init', 'add-renewal-status'])
        assert.notEqual(extra.status, 0)
        notYaml(extra.stdout)
        assert.equal(existsSync(join(empty, INIT_SKILL_REL)), false)
      } finally {
        rmSync(empty, { recursive: true, force: true })
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects non-TTY init and invalid ids before writing', () => {
    const dir = tmp()
    try {
      mkdirSync(join(dir, '.cursor'))
      const bare = osi(dir, ['init'])
      assert.notEqual(bare.status, 0)
      assert.match(bare.stderr, /--agent/)
      notYaml(bare.stdout)
      assert.equal(existsSync(join(dir, INIT_SKILL_REL)), false)

      const bad = osi(dir, ['init', '--agent', 'cursor,unknown-agent'])
      assert.notEqual(bad.status, 0)
      assert.match(bad.stderr, /unknown-agent/)
      assert.equal(existsSync(join(dir, INIT_SKILL_REL)), false)
      assert.equal(existsSync(join(dir, '.agents/skills/osi-impact/SKILL.md')), false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('skips a command whose parent path is a file', () => {
    const dir = tmp()
    try {
      writeFileSync(join(dir, '.clinerules'), 'rules\n')
      const r = osi(dir, ['init', '--agent', 'cline'])
      assert.equal(r.status, 0, r.stderr)
      assert.match(r.stderr, /Skipped \.clinerules\/workflows\/osi-impact\.md/)
      assert.equal(readFileSync(join(dir, '.clinerules'), 'utf8'), 'rules\n')
      assert.equal(existsSync(join(dir, '.clinerules/workflows/osi-impact.md')), false)
      assert.match(
        readFileSync(join(dir, '.cline/skills/osi-impact/SKILL.md'), 'utf8'),
        /name: osi-impact/,
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not print history YAML when openspec/changes/init exists', () => {
    const dir = tmp()
    try {
      mkdirSync(join(dir, 'openspec/changes/init'), { recursive: true })
      writeFileSync(join(dir, 'openspec/changes/init/proposal.md'), '## Why\n\ninit change\n')
      const r = osi(dir, ['init', '--agent', 'cursor'])
      assert.equal(r.status, 0, r.stderr)
      notYaml(r.stdout)
      assert.equal(existsSync(join(dir, INIT_SKILL_REL)), true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
