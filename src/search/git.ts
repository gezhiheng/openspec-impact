import { existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { HistoryEntry } from '../models/evidence.js'
import { isTestPath } from './repository.js'

/** ponytail: frozen in osi-history spec; raise via a delta, not flags. */
const SINCE = '18.months'
const WIDE_FILES = 30
const MIN_COMMITS = 2
const PER_SEED_CAP = 10
const HASH_BATCH = 80

export type GitLoc = {
  gitRoot: string
  repoRel: string
}

export function enclosingGit(fileAbs: string): GitLoc | undefined {
  let dir = dirname(fileAbs)
  while (true) {
    if (existsSync(join(dir, '.git'))) {
      const repoRel = relative(dir, fileAbs).split(sep).join('/')
      if (!repoRel || repoRel.startsWith('..')) {
        return undefined
      }
      return { gitRoot: dir, repoRel }
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

function gitAvailable(): boolean {
  const r = spawnSync('git', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return r.status === 0
}

function git(cwd: string, args: string[]): string | undefined {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    return undefined
  }
  return r.stdout
}

function posixGit(line: string): string {
  return line.split(sep).join('/')
}

function parseNameOnlyLog(stdout: string): string[][] {
  const commits: string[][] = []
  let files: string[] | undefined
  for (const line of stdout.split(/\r?\n/)) {
    if (/^[0-9a-f]{40}$/.test(line)) {
      files = []
      commits.push(files)
    } else if (line && files) {
      files.push(posixGit(line))
    }
  }
  return commits
}

function workspacePath(projectRoot: string, gitRoot: string, gitRel: string): string | undefined {
  const abs = join(gitRoot, gitRel.split('/').join(sep))
  if (!existsSync(abs)) {
    return undefined
  }
  const ws = relative(projectRoot, abs).split(sep).join('/')
  if (!ws || ws.startsWith('..')) {
    return undefined
  }
  return ws
}

export function coChangeNeighbors(loc: GitLoc, projectRoot: string, via: string): HistoryEntry[] {
  if (!gitAvailable()) {
    return []
  }
  const hashOut = git(loc.gitRoot, [
    'log',
    '--follow',
    `--since=${SINCE}`,
    '--no-merges',
    '--pretty=format:%H',
    '--',
    loc.repoRel,
  ])
  if (!hashOut) {
    return []
  }
  const hashes = hashOut.split(/\r?\n/).filter((h) => /^[0-9a-f]{40}$/.test(h))
  if (hashes.length === 0) {
    return []
  }

  const counts = new Map<string, number>()
  for (let i = 0; i < hashes.length; i += HASH_BATCH) {
    const batch = hashes.slice(i, i + HASH_BATCH)
    const out = git(loc.gitRoot, [
      'log',
      '--no-walk',
      '--name-only',
      '--pretty=format:%H',
      ...batch,
    ])
    if (!out) {
      continue
    }
    for (const files of parseNameOnlyLog(out)) {
      if (files.length > WIDE_FILES) {
        continue
      }
      for (const gitRel of files) {
        if (gitRel === loc.repoRel) {
          continue
        }
        counts.set(gitRel, (counts.get(gitRel) ?? 0) + 1)
      }
    }
  }

  const rows: HistoryEntry[] = []
  for (const [gitRel, n] of counts) {
    if (n < MIN_COMMITS) {
      continue
    }
    const path = workspacePath(projectRoot, loc.gitRoot, gitRel)
    if (!path || path === via) {
      continue
    }
    if (isTestPath(path) || path.split('/').includes('openspec')) {
      continue
    }
    rows.push({ path, via, commits: n, reason: 'co_change' })
  }
  rows.sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
  return rows.slice(0, PER_SEED_CAP)
}
