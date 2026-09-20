import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgv } from '../src/cli.js'
import { INIT_COMMAND_REL, INIT_SKILL_REL, runInit } from '../src/commands/init.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const cli = join(repoRoot, 'dist/src/cli.js')

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

describe('osi init argv', () => {
  it('treats lone init as setup and extra args as usage', () => {
    const ok = parseArgv(['init'])
    assert.equal(ok.ok, true)
    if (ok.ok) {
      assert.equal(ok.command, 'init')
    }
    assert.equal(parseArgv(['init', 'add-renewal-status']).ok, false)
  })
})

describe('osi init', () => {
  it('writes skill and command without YAML', () => {
    const dir = tmp()
    try {
      const r = osi(dir, ['init'])
      assert.equal(r.status, 0, r.stderr)
      notYaml(r.stdout)
      const skill = readFileSync(join(dir, INIT_SKILL_REL), 'utf8')
      assert.match(skill, /name: osi-impact/)
      assert.match(skill, /disable-model-invocation: true/)
      assert.equal(existsSync(join(dir, INIT_COMMAND_REL)), true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('overwrites, installs at OpenSpec root from a subdirectory, and rejects extra args', () => {
    const dir = tmp()
    try {
      mkdirSync(join(dir, '.cursor/skills/osi-impact'), { recursive: true })
      writeFileSync(join(dir, INIT_SKILL_REL), 'stale\n')
      runInit({ cwd: dir })
      const after = readFileSync(join(dir, INIT_SKILL_REL), 'utf8')
      assert.match(after, /name: osi-impact/)
      assert.equal(after.includes('stale'), false)

      const project = tmp()
      mkdirSync(join(project, 'openspec'), { recursive: true })
      mkdirSync(join(project, 'src'), { recursive: true })
      try {
        const r = osi(join(project, 'src'), ['init'])
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
        assert.equal(existsSync(join(empty, INIT_COMMAND_REL)), false)
      } finally {
        rmSync(empty, { recursive: true, force: true })
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not print history YAML when openspec/changes/init exists', () => {
    const dir = tmp()
    try {
      mkdirSync(join(dir, 'openspec/changes/init'), { recursive: true })
      writeFileSync(join(dir, 'openspec/changes/init/proposal.md'), '## Why\n\ninit change\n')
      const r = osi(dir, ['init'])
      assert.equal(r.status, 0, r.stderr)
      notYaml(r.stdout)
      assert.equal(existsSync(join(dir, INIT_SKILL_REL)), true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
