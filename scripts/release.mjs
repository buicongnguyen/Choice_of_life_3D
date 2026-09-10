import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
let sha = process.env.GITHUB_SHA || "local";
if (sha === "local") {
  try {
    sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {}
}
writeFileSync(
  "dist/release.json",
  JSON.stringify(
    { version: "0.1.0", sha, builtAt: new Date().toISOString() },
    null,
    2,
  ),
);
