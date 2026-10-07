#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LocateError, UsageError } from './models/evidence.js'
import { runEvidence } from './commands/evidence.js'
import { runHistory } from './commands/history.js'
import { agentIds, parseAgentList, promptInit, refreshInstalled, runInit } from './commands/init.js'
import { runScope } from './commands/scope.js'
import { toEvidenceYaml, toHistoryYaml, toYaml } from './output/yaml.js'

const pkgVersion = createRequire(import.meta.url)('../../package.json').version as string

export const USAGE = `Usage: osi | openspec-impact impact [--no-search] [--include-low] <change-id|path>
       osi | openspec-impact scope [--no-search] [--include-low] <change-id|path>
       osi | openspec-impact history <change-id|path>
       osi | openspec-impact init [--agent <id[,id...]>]
       osi | openspec-impact upgrade
       osi | openspec-impact -v | --version

impact prints seeds + refs + history YAML for a live OpenSpec change.
scope, history, impact, init, and upgrade are reserved commands.
Agents: ${agentIds()}
`

const LAYERS = new Set(['scope', 'history', 'impact'])

export type ParsedArgs =
  | { ok: true; command: 'version' }
  | { ok: true; command: 'upgrade' }
  | {
      ok: true
      command: 'init'
      includeLow: boolean
      search: boolean
      agents?: string[]
    }
  | {
      ok: true
      command: 'scope' | 'history' | 'impact'
      includeLow: boolean
      search: boolean
      change: string
    }
  | { ok: false; message: string }

export function parseArgv(argv: string[]): ParsedArgs {
  if (argv.length === 1 && (argv[0] === '-v' || argv[0] === '--version')) {
    return { ok: true, command: 'version' }
  }
  let includeLow = false
  let search = true
  let agents: string[] | undefined
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (arg === '--include-low') {
      includeLow = true
    } else if (arg === '--no-search') {
      search = false
    } else if (arg === '--agent' || arg.startsWith('--agent=')) {
      const inline = arg.startsWith('--agent=')
      const value = inline ? arg.slice('--agent='.length) : argv[i + 1]
      if (!inline) {
        i++
      }
      if (!value || value.startsWith('-')) {
        return { ok: false, message: `Missing --agent value\n${USAGE}` }
      }
      try {
        agents = [...new Set([...(agents ?? []), ...parseAgentList(value)])]
      } catch (err) {
        if (err instanceof UsageError) {
          return { ok: false, message: `${err.message}\n${USAGE}` }
        }
        throw err
      }
    } else if (arg.startsWith('-')) {
      return { ok: false, message: `Unknown flag: ${arg}\n${USAGE}` }
    } else {
      positional.push(arg)
    }
  }
  const first = positional[0]
  if (agents && first !== 'init') {
    return { ok: false, message: USAGE }
  }
  if (!first) {
    return { ok: false, message: USAGE }
  }
  if (first === 'upgrade') {
    if (positional.length !== 1 || includeLow || !search) {
      return { ok: false, message: USAGE }
    }
    return { ok: true, command: 'upgrade' }
  }
  if (first === 'init') {
    if (positional.length !== 1) {
      return { ok: false, message: USAGE }
    }
    return { ok: true, command: 'init', includeLow, search, agents }
  }
  if (LAYERS.has(first)) {
    const change = positional[1]
    if (!change || positional.length > 2) {
      return { ok: false, message: USAGE }
    }
    return {
      ok: true,
      command: first as 'scope' | 'history' | 'impact',
      includeLow,
      search,
      change,
    }
  }
  return { ok: false, message: USAGE }
}

export async function main(argv = process.argv.slice(2), cwd = process.cwd()): Promise<number> {
  const parsed = parseArgv(argv)
  if (!parsed.ok) {
    process.stderr.write(parsed.message.endsWith('\n') ? parsed.message : `${parsed.message}\n`)
    return 1
  }
  if (parsed.command === 'version') {
    process.stdout.write(`${pkgVersion}\n`)
    return 0
  }
  try {
    if (parsed.command === 'upgrade') {
      return runUpgrade(cwd)
    }
    if (parsed.command === 'init') {
      if (!parsed.agents && !process.stdin.isTTY) {
        process.stderr.write(
          `osi init requires --agent <id[,id...]> when stdin is not a terminal.\n${USAGE}`,
        )
        return 1
      }
      const agents = parsed.agents ?? (await promptInit(cwd))
      if (agents.length === 0) {
        process.stdout.write('No integrations selected.\n')
        return 0
      }
      const { wrote } = runInit({ cwd, agents })
      for (const rel of wrote) {
        process.stdout.write(`Wrote ${rel}\n`)
      }
      return 0
    }
    if (parsed.command === 'history') {
      process.stdout.write(toHistoryYaml(runHistory({ cwd, change: parsed.change })))
      return 0
    }
    if (parsed.command === 'scope') {
      const doc = runScope({
        cwd,
        change: parsed.change,
        includeLow: parsed.includeLow,
        search: parsed.search,
      })
      process.stdout.write(toYaml(doc))
      return 0
    }
    process.stdout.write(
      toEvidenceYaml(
        runEvidence({
          cwd,
          change: parsed.change,
          includeLow: parsed.includeLow,
          search: parsed.search,
        }),
      ),
    )
    return 0
  } catch (err) {
    if (err instanceof LocateError || err instanceof UsageError) {
      process.stderr.write(`${err.message}\n`)
      return 1
    }
    throw err
  }
}

export function runUpgrade(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  install: () => number = installLatest,
  relaunch: (cwd: string) => number = relaunchUpgrade,
): number {
  if (env.OSI_UPGRADE_REFRESH) {
    const { wrote } = refreshInstalled(cwd)
    for (const rel of wrote) {
      process.stdout.write(`Wrote ${rel}\n`)
    }
    return 0
  }
  const code = install()
  if (code !== 0) {
    return code
  }
  return relaunch(cwd)
}

function installLatest(): number {
  const child = spawnSync('npm', ['install', '-g', 'openspec-impact@latest'], { stdio: 'inherit' })
  return child.status ?? 1
}

function relaunchUpgrade(cwd: string): number {
  const root = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' })
  if ((root.status ?? 1) !== 0) {
    return root.status ?? 1
  }
  const cli = join(root.stdout.trim(), 'openspec-impact', 'dist', 'src', 'cli.js')
  const child = spawnSync(process.execPath, [cli, 'upgrade'], {
    cwd,
    env: { ...process.env, OSI_UPGRADE_REFRESH: '1' },
    stdio: 'inherit',
  })
  return child.status ?? 1
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) {
    return false
  }
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url)
  } catch {
    return (
      entry.replaceAll('\\', '/').endsWith('/cli.js')
      || entry.replaceAll('\\', '/').endsWith('/cli.ts')
    )
  }
}

if (isDirectRun()) {
  Promise.resolve(main()).then((code) => {
    process.exitCode = code
  })
}
