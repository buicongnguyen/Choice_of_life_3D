import { test } from "node:test";
import assert from "node:assert/strict";
import overlay from "./lang/vi";
import { checkLanguage } from "./lang-check";

test("Vietnamese: every line is translated and renders in every kind of life", () => {
  const seen = checkLanguage(overlay, (s) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s));
  assert.ok(seen > 600, `only ${seen} distinct lines rendered`);
});
