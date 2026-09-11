import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
let sha = process.env.GITHUB_SHA || "local";
if (sha === "local") {
  try {
    sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {}
}
writeFileSync(
  "dist/release.json",
  JSON.stringify({ version, sha, builtAt: new Date().toISOString() }, null, 2),
);
