import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { UsageError } from '../models/evidence.js'
import { findProjectRoot } from '../openspec/parser.js'

export const INIT_SKILL_REL = '.cursor/skills/osi-impact/SKILL.md'
export const INIT_COMMAND_REL = '.cursor/commands/osi-impact.md'

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

export function runInit(opts: { cwd: string }): { root: string } {
  const root = findProjectRoot(opts.cwd) ?? opts.cwd
  const pkg = packageRoot()
  const skillSrc = join(pkg, 'templates/osi-impact/SKILL.md')
  const commandSrc = join(pkg, 'templates/cursor/osi-impact.md')
  if (!existsSync(skillSrc) || !existsSync(commandSrc)) {
    throw new UsageError('osi init templates not found')
  }
  const skillDest = join(root, INIT_SKILL_REL)
  const commandDest = join(root, INIT_COMMAND_REL)
  mkdirSync(dirname(skillDest), { recursive: true })
  mkdirSync(dirname(commandDest), { recursive: true })
  copyFileSync(skillSrc, skillDest)
  copyFileSync(commandSrc, commandDest)
  return { root }
}
