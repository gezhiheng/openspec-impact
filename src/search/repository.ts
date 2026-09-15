import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import type { Confidence, HarvestedConcept, Reason, ReasonType, TermRole } from "../models/evidence.js";
import { conceptRoleForTerm, PATH_ONLY } from "./terms.js";

export const SEARCH_EXCLUDES = [
  "openspec",
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "vendor",
];

function posixRel(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

function excluded(rel: string): boolean {
  return rel.split("/").some((p) => SEARCH_EXCLUDES.includes(p));
}

function walkFiles(root: string, dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SEARCH_EXCLUDES.includes(ent.name)) continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(root, abs, out);
    else if (ent.isFile()) out.push(posixRel(root, abs));
  }
}

function rgAvailable(): boolean {
  const r = spawnSync("rg", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function listWithRg(root: string): string[] | undefined {
  if (!rgAvailable()) return undefined;
  const args = ["--files", "--hidden", "--glob", "!.git/**"];
  for (const dir of SEARCH_EXCLUDES) {
    if (dir === ".git") continue;
    args.push("--glob", `!${dir}/**`);
  }
  const r = spawnSync("rg", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0 && r.status !== 1) return undefined;
  return r.stdout.split(/\r?\n/).filter(Boolean).filter((p) => !excluded(p.split(sep).join("/")));
}

function listWithGit(root: string): string[] | undefined {
  if (!existsSync(join(root, ".git"))) return undefined;
  const r = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) return undefined;
  return r.stdout.split("\0").filter(Boolean).filter((p) => !excluded(p.split(sep).join("/")));
}

export function listSourceFiles(root: string): string[] {
  return listWithRg(root) ?? listWithGit(root) ?? collectWalk(root);
}

function collectWalk(root: string): string[] {
  const out: string[] = [];
  walkFiles(root, root, out);
  return out.filter((p) => !excluded(p));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pathMatches(relPath: string, term: string): boolean {
  return relPath.toLowerCase().includes(term.toLowerCase());
}

export function symbolMatches(content: string, term: string): boolean {
  const id = escapeRegExp(term);
  const decl = new RegExp(String.raw`\b(?:function|class|type|const|interface|let|var|enum)\s+${id}\b`);
  if (decl.test(content)) return true;
  return new RegExp(String.raw`\b${id}\b`).test(content);
}

export function contentMatches(content: string, term: string): boolean {
  return content.includes(term) || content.toLowerCase().includes(term.toLowerCase());
}

export type FileHit = {
  path: string;
  reasons: Reason[];
  roles: TermRole[];
};

function matchTypes(relPath: string, content: string, term: string, pathOnly: boolean): ReasonType[] {
  const types: ReasonType[] = [];
  if (pathMatches(relPath, term)) types.push("path_match");
  if (pathOnly) return types;
  if (symbolMatches(content, term)) types.push("symbol_match");
  else if (contentMatches(content, term)) types.push("content_match");
  return types;
}

export function searchConcepts(root: string, concepts: HarvestedConcept[]): FileHit[] {
  const files = listSourceFiles(root);
  const hits = new Map<string, FileHit>();
  const contents = new Map<string, string>();

  const read = (rel: string): string => {
    const cached = contents.get(rel);
    if (cached !== undefined) return cached;
    const abs = join(root, rel.split("/").join(sep));
    let text = "";
    try {
      if (existsSync(abs) && statSync(abs).isFile()) text = readFileSync(abs, "utf8");
    } catch {
      text = "";
    }
    contents.set(rel, text);
    return text;
  };

  for (const rel of files) {
    const posix = rel.split(sep).join("/");
    for (const concept of concepts) {
      for (const term of concept.search_terms) {
        const role = conceptRoleForTerm(concept, term);
        const pathOnly = role === "path-only" || PATH_ONLY.has(term.toLowerCase());
        const content = pathOnly ? "" : read(posix);
        const types = matchTypes(posix, content, term, pathOnly);
        if (types.length === 0) continue;
        let hit = hits.get(posix);
        if (!hit) {
          hit = { path: posix, reasons: [], roles: [] };
          hits.set(posix, hit);
        }
        for (const type of types) {
          if (!hit.reasons.some((r) => r.type === type && r.term === term)) {
            hit.reasons.push({ type, term });
            hit.roles.push(role);
          }
        }
      }
    }
  }
  return [...hits.values()];
}

const CONF_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

export function confidenceFor(reasons: Reason[], roles: TermRole[]): Confidence {
  let best: Confidence = "low";
  for (let i = 0; i < reasons.length; i++) {
    const r = reasons[i];
    const role = roles[i] ?? "domain";
    let got: Confidence = "low";
    if (role === "strong" && (r.type === "path_match" || r.type === "symbol_match")) got = "high";
    else if (role === "domain" && (r.type === "path_match" || r.type === "symbol_match")) got = "medium";
    else if (role === "path-only" && r.type === "path_match") got = "medium";
    else got = "low";
    if (CONF_RANK[got] < CONF_RANK[best]) best = got;
  }
  return best;
}

export function sortCandidates<T extends { path: string; confidence: Confidence }>(xs: T[]): T[] {
  return [...xs].sort(
    (a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence] || a.path.localeCompare(b.path),
  );
}

export function limitLow<T extends { confidence: Confidence }>(xs: T[], includeLow: boolean, cap = 20): T[] {
  const kept: T[] = [];
  let lows = 0;
  for (const x of xs) {
    if (x.confidence !== "low") {
      kept.push(x);
      continue;
    }
    if (!includeLow) continue;
    if (lows >= cap) continue;
    kept.push(x);
    lows += 1;
  }
  return kept;
}

export function isTestPath(relPath: string): boolean {
  return (
    /\.test\.[^/]+$/.test(relPath) ||
    /\.spec\.[^/]+$/.test(relPath) ||
    /(^|\/)__tests__\//.test(relPath) ||
    /_test\.[^/]+$/.test(relPath)
  );
}

export function relatedSource(projectRoot: string, testPath: string): string | undefined {
  const parts = testPath.split("/");
  const base = parts.at(-1);
  if (!base) return undefined;
  let stripped = base.replace(/\.test(\.[^./]+)$/, "$1");
  stripped = stripped.replace(/\.spec(\.[^./]+)$/, "$1");
  stripped = stripped.replace(/_test(\.[^./]+)$/, "$1");
  if (stripped === base) return undefined;
  const src = [...parts.slice(0, -1), stripped].join("/");
  const abs = join(projectRoot, src.split("/").join(sep));
  return existsSync(abs) ? src : undefined;
}
