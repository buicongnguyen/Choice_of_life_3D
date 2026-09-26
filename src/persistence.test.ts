import { test } from "node:test";
import assert from "node:assert/strict";
import { reloadAfterSaving } from "./persistence";

test("settings never reload or change when progress cannot be saved", () => {
  const calls: string[] = [];
  assert.equal(reloadAfterSaving(() => false, () => { calls.push("settings"); return true; }, () => calls.push("reload")), false);
  assert.deepEqual(calls, []);
});

test("failed settings persistence keeps the current game open", () => {
  let reloaded = false;
  assert.equal(reloadAfterSaving(() => true, () => false, () => { reloaded = true; }), false);
  assert.equal(reloaded, false);
});

test("successful changes save progress and settings before reloading", () => {
  const calls: string[] = [];
  assert.equal(reloadAfterSaving(() => { calls.push("life"); return true; }, () => { calls.push("settings"); return true; }, () => calls.push("reload")), true);
  assert.deepEqual(calls, ["life", "settings", "reload"]);
});
