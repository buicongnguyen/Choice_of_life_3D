import { test } from "node:test";
import assert from "node:assert/strict";
import overlay from "./lang/ko";
import { checkLanguage } from "./lang-check";

test("Korean: every line is translated and renders in every kind of life", () => {
  const seen = checkLanguage(overlay, (s) => /[\uAC00-\uD7A3]/.test(s));
  assert.ok(seen > 600, `only ${seen} distinct lines rendered`);
});
