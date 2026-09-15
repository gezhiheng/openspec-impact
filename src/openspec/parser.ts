import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { LocateError } from '../models/evidence.js'

export type LocatedChange = {
  projectRoot: string
  name: string
  changeDir: string
  path: string
}

export type ChangeDocument = {
  relativePath: string
  content: string
}

export function findProjectRoot(cwd: string): string | undefined {
  let dir = resolve(cwd)
  while (true) {
    if (existsSync(join(dir, 'openspec')) && statSync(join(dir, 'openspec')).isDirectory()) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

function posixRel(from: string, to: string): string {
  return relative(from, to).split(sep).join('/')
}

export function resolveChange(projectRoot: string, input: string): LocatedChange {
  const trimmed = input.replace(/\/+$/, '')
  const liveDir = join(projectRoot, 'openspec', 'changes', trimmed)

  const looksLikePath = trimmed.includes('/') || trimmed.includes('\\') || isAbsolute(trimmed)
  if (!looksLikePath) {
    if (existsSync(liveDir) && statSync(liveDir).isDirectory()) {
      return {
        projectRoot,
        name: trimmed,
        changeDir: liveDir,
        path: `openspec/changes/${trimmed}`,
      }
    }
    throw new LocateError(`OpenSpec change not found: ${trimmed}`)
  }

  const abs = isAbsolute(trimmed) ? trimmed : resolve(projectRoot, trimmed)
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    throw new LocateError(`OpenSpec change not found: ${trimmed}`)
  }
  const rel = posixRel(projectRoot, abs)
  if (!rel.startsWith('openspec/changes/')) {
    throw new LocateError(`OpenSpec change not found: ${trimmed}`)
  }
  return {
    projectRoot,
    name: abs.split(sep).filter(Boolean).at(-1) ?? trimmed,
    changeDir: abs,
    path: rel,
  }
}

function readIfExists(file: string): string | undefined {
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

function walkMarkdown(dir: string, base: string, out: ChangeDocument[]): void {
  if (!existsSync(dir)) {
    return
  }
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) {
      walkMarkdown(abs, base, out)
    } else if (ent.name.endsWith('.md')) {
      out.push({
        relativePath: posixRel(base, abs),
        content: readFileSync(abs, 'utf8'),
      })
    }
  }
}

export function readChangeDocuments(changeDir: string): ChangeDocument[] {
  const docs: ChangeDocument[] = []
  for (const name of ['proposal.md', 'tasks.md', 'design.md'] as const) {
    const content = readIfExists(join(changeDir, name))
    if (content !== undefined) {
      docs.push({ relativePath: name, content })
    }
  }
  walkMarkdown(join(changeDir, 'specs'), changeDir, docs)
  return docs
}

export function specDirNames(changeDir: string): string[] {
  const specs = join(changeDir, 'specs')
  if (!existsSync(specs)) {
    return []
  }
  return readdirSync(specs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}
