import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { harvestConcepts } from "../src/search/terms.js";
import { expandPhrase } from "../src/search/terms.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const changeDir = join(repoRoot, "tests/fixtures/mini-repo/openspec/changes/add-renewal-status");

describe("harvest + expansion", () => {
  const documents = [
    { relativePath: "proposal.md", content: readFileSync(join(changeDir, "proposal.md"), "utf8") },
    { relativePath: "design.md", content: readFileSync(join(changeDir, "design.md"), "utf8") },
  ];
  const concepts = harvestConcepts("add-renewal-status", ["tenant"], documents);

  it("expands renewal status phrase", () => {
    const hit = concepts.find((c) => c.text.toLowerCase() === "renewal status");
    assert.ok(hit, "expected renewal status concept");
    for (const term of ["renewalStatus", "RenewalStatus", "renewal_status", "renewal-status"]) {
      assert.ok(hit.search_terms.includes(term), `missing ${term}`);
    }
    assert.equal(hit.search_terms.includes("RENEWALSTATUS"), false);
    assert.equal(hit.search_terms.includes("Renewal_Status"), false);
  });

  it("does not re-case harvested TenantList identifier", () => {
    const hit = concepts.find((c) => c.text === "TenantList");
    assert.ok(hit);
    assert.deepEqual(hit.search_terms, ["TenantList"]);
  });

  it("does not emit should as a search term", () => {
    assert.equal(
      concepts.some((c) => c.search_terms.some((t) => t.toLowerCase() === "should")),
      false,
    );
  });

  it("expands tenant list into TenantList", () => {
    const hit = concepts.find((c) => c.text.toLowerCase() === "tenant list");
    assert.ok(hit);
    assert.ok(hit.search_terms.includes("TenantList"));
    assert.deepEqual(expandPhrase(["renewal", "status"]), [
      "renewalStatus",
      "RenewalStatus",
      "renewal_status",
      "renewal-status",
    ]);
  });
});
