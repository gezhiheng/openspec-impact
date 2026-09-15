import type { Concept, HarvestedConcept, TermRole } from "../models/evidence.js";
import type { ChangeDocument } from "../openspec/parser.js";

export const NEVER_SEARCH = new Set([
  "should",
  "must",
  "shall",
  "may",
  "system",
  "user",
  "when",
  "then",
  "given",
  "and",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "by",
  "from",
  "this",
  "that",
  "support",
  "display",
  "add",
  "added",
  "change",
  "changes",
  "requirement",
  "scenario",
  "purpose",
  "why",
  "what",
]);

export const PATH_ONLY = new Set([
  "filter",
  "export",
  "search",
  "create",
  "update",
  "renew",
  "list",
  "detail",
  "page",
  "status",
  "form",
  "view",
  "modal",
  "dialog",
  "table",
  "button",
]);

const TOKEN_RE = /[A-Za-z][A-Za-z0-9]*|[\u4e00-\u9fff]+/g;

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

function cap(word: string): string {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
}

export function camelCase(words: string[]): string {
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w.toLowerCase()))).join("");
}

export function pascalCase(words: string[]): string {
  return words.map((w) => cap(w.toLowerCase())).join("");
}

export function expandPhrase(words: string[]): string[] {
  const lower = words.map((w) => w.toLowerCase());
  return unique([camelCase(lower), pascalCase(lower), lower.join("_"), lower.join("-")]);
}

export function expandUnigram(word: string): string[] {
  return unique([word, cap(word)]);
}

function unique(xs: string[]): string[] {
  return [...new Set(xs.filter(Boolean))];
}

function isNever(word: string): boolean {
  return NEVER_SEARCH.has(word.toLowerCase());
}

function isPathOnly(word: string): boolean {
  return PATH_ONLY.has(word.toLowerCase());
}

type Bucket = { text: string; terms: string[]; role: TermRole };

function add(map: Map<string, Bucket>, text: string, terms: string[], role: TermRole): void {
  const key = text.toLowerCase();
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { text, terms: unique(terms), role });
    return;
  }
  existing.terms = unique([...existing.terms, ...terms]);
  if (role === "strong") existing.role = "strong";
  else if (role === "domain" && existing.role === "path-only") existing.role = "domain";
}

function phrasesFromTokens(tokens: string[], map: Map<string, Bucket>): void {
  const kept: string[] = [];
  const flush = (): void => {
    if (kept.length >= 2) {
      for (let n = Math.min(3, kept.length); n >= 2; n--) {
        for (let i = 0; i + n <= kept.length; i++) {
          const slice = kept.slice(i, i + n);
          add(map, slice.join(" "), expandPhrase(slice), "strong");
        }
      }
    }
    for (const w of kept) {
      if (isNever(w)) continue;
      if (isPathOnly(w)) add(map, w.toLowerCase(), expandUnigram(w.toLowerCase()), "path-only");
      else add(map, w.toLowerCase(), expandUnigram(w), "domain");
    }
    kept.length = 0;
  };
  for (const raw of tokens) {
    if (isNever(raw)) flush();
    else kept.push(raw);
  }
  flush();
}

function markdownSection(md: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "im");
  const match = re.exec(md);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return next < 0 ? rest : rest.slice(0, next);
}

function headingLines(md: string): string[] {
  const lines: string[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    lines.push(m[2].replace(/^Requirement:\s*/i, ""));
  }
  return lines;
}

function harvestMarked(md: string, map: Map<string, Bucket>): void {
  for (const m of md.matchAll(/`([^`]+)`/g)) {
    const token = m[1].trim();
    if (!token) continue;
    add(map, token, [token], "strong");
  }
  for (const m of md.matchAll(/\*\*([^*]+)\*\*/g)) {
    const token = m[1].trim();
    if (!token) continue;
    add(map, token, [token], "strong");
  }
  for (const m of md.matchAll(/(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/g)) {
    add(map, m[0], [m[0]], "strong");
  }
}

function kebabPieces(name: string, map: Map<string, Bucket>): void {
  phrasesFromTokens(
    name.split("-").filter(Boolean),
    map,
  );
}

export function harvestConcepts(
  changeName: string,
  specDirs: string[],
  documents: ChangeDocument[],
): HarvestedConcept[] {
  const map = new Map<string, Bucket>();
  kebabPieces(changeName, map);
  for (const dir of specDirs) kebabPieces(dir, map);

  for (const doc of documents) {
    harvestMarked(doc.content, map);
    for (const heading of headingLines(doc.content)) {
      phrasesFromTokens(tokenize(heading), map);
    }
    if (doc.relativePath === "proposal.md" || doc.relativePath.endsWith("/proposal.md")) {
      phrasesFromTokens(tokenize(markdownSection(doc.content, "What Changes")), map);
      phrasesFromTokens(tokenize(markdownSection(doc.content, "Impact")), map);
    }
  }

  return [...map.values()]
    .filter((b) => b.terms.length > 0)
    .map((b) => ({ text: b.text, search_terms: b.terms, role: b.role }));
}

export function publicConcepts(harvested: HarvestedConcept[]): Concept[] {
  return harvested.map(({ text }) => ({ text }));
}

export function isPathOnlyTerm(term: string): boolean {
  return isPathOnly(term);
}

export function conceptRoleForTerm(concept: HarvestedConcept, term: string): TermRole {
  if (concept.role === "strong") return "strong";
  if (PATH_ONLY.has(term.toLowerCase())) return "path-only";
  return concept.role;
}
