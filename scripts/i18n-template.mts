// Writes docs/i18n/template.json: every translatable path with its English text (or, for
// dynamic lines, the English function source), plus the interface dictionary.
import { writeFileSync, mkdirSync } from "node:fs";
import { contentPaths } from "../src/localize";
import { EN_UI } from "../src/i18n";
const entries = contentPaths().map((e) => {
  const v = e.get();
  return typeof v === "function" ? { path: e.path, kind: e.kind, function: v.toString() } : { path: e.path, kind: e.kind, text: v };
});
mkdirSync("docs/i18n", { recursive: true });
writeFileSync("docs/i18n/template.json", JSON.stringify({ story: entries, ui: EN_UI }, null, 1));
console.log(`story paths: ${entries.length} (${entries.filter((e) => "function" in e).length} functions), ui keys: ${Object.keys(EN_UI).length}`);
