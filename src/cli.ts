#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LocateError, UsageError } from './models/evidence.js'
import { runHistory } from './commands/history.js'
import { runScope } from './commands/scope.js'
import { toHistoryYaml, toYaml } from './output/yaml.js'

export const USAGE = `Usage: osi scope [--no-search] [--include-low] <change-id|path>
       osi history <change-id|path>

Parse an OpenSpec change into concepts and search terms, then scan the repository
for candidate files. Prints YAML to stdout. Pass --no-search to skip the scan.
osi history prints named seeds and same-repo co-change neighbors.
`

export type ParsedArgs =
  | {
      ok: true
      command: 'scope' | 'history'
      includeLow: boolean
      search: boolean
      change: string
    }
  | { ok: false; message: string }

export function parseArgv(argv: string[]): ParsedArgs {
  const rest = [...argv]
  let includeLow = false
  let search = true
  const positional: string[] = []
  for (const arg of rest) {
    if (arg === '--include-low') {
      includeLow = true
    } else if (arg === '--no-search') {
      search = false
    } else if (arg.startsWith('-')) {
      return { ok: false, message: `Unknown flag: ${arg}\n${USAGE}` }
    } else {
      positional.push(arg)
    }
  }
  const command = positional[0]
  if (!command) {
    return { ok: false, message: USAGE }
  }
  if (command !== 'scope' && command !== 'history') {
    return { ok: false, message: `Unknown command: ${command}\n${USAGE}` }
  }
  const change = positional[1]
  if (!change || positional.length > 2) {
    return { ok: false, message: USAGE }
  }
  return { ok: true, command, includeLow, search, change }
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()): number {
  const parsed = parseArgv(argv)
  if (!parsed.ok) {
    process.stderr.write(parsed.message.endsWith('\n') ? parsed.message : `${parsed.message}\n`)
    return 1
  }
  try {
    if (parsed.command === 'history') {
      process.stdout.write(toHistoryYaml(runHistory({ cwd, change: parsed.change })))
      return 0
    }
    const doc = runScope({
      cwd,
      change: parsed.change,
      includeLow: parsed.includeLow,
      search: parsed.search,
    })
    process.stdout.write(toYaml(doc))
    return 0
  } catch (err) {
    if (err instanceof LocateError || err instanceof UsageError) {
      process.stderr.write(`${err.message}\n`)
      return 1
    }
    throw err
  }
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
  process.exitCode = main()
}
