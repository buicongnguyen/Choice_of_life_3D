import { test } from "node:test";
import assert from "node:assert/strict";
import { KiteGame } from "./kite-game";

test("kite pauses on blur/hidden, clears held input, and resumes without charging away time", () => {
  const win = new EventTarget();
  let focused = true;
  const doc = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => focused });
  let rafId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const globals = {
    window: win, document: doc, devicePixelRatio: 1,
    requestAnimationFrame: (cb: FrameRequestCallback) => { frames.set(++rafId, cb); return rafId; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
  };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) } as Record<string, unknown>, {
    get: (target, key: string) => target[key] ?? (() => {}),
  });
  const canvas = Object.assign(new EventTarget(), { clientWidth: 320, clientHeight: 240, width: 320, height: 240, getContext: () => ctx });
  const progress: { tension: number; left: number }[] = [];
  let completed = false;
  let game: KiteGame | undefined;
  const frame = (ms: number) => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((cb) => cb(ms));
  };
  try {
    game = new KiteGame(canvas as unknown as HTMLCanvasElement, {
      colour: "#ffffff", wind: 0, assist: false, reduced: true,
      onProgress: (p) => progress.push(p), onDone: () => { completed = true; },
    });
    frame(0);
    game.hold(true);
    frame(50);
    const before = progress.at(-1)!;
    const count = progress.length;
    focused = false;
    win.dispatchEvent(new Event("blur"));
    game.hold(true); // A stale pointer/key event cannot re-latch the control.
    for (let ms = 100; ms <= 21000; ms += 50) frame(ms);
    assert.equal(progress.length, count);
    assert.equal(completed, false);
    focused = true;
    win.dispatchEvent(new Event("focus"));
    frame(22000);
    assert.equal(progress.at(-1)!.left, before.left);
    frame(22050);
    assert.ok(progress.at(-1)!.tension < before.tension, "returning releases the pull control");
    assert.ok(Math.abs(progress.at(-1)!.left - (before.left - 0.05)) < 1e-8);

    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    const hiddenCount = progress.length;
    win.dispatchEvent(new Event("focus")); // Focus must not resume a still-hidden page.
    frame(60000);
    assert.equal(progress.length, hiddenCount);
    doc.hidden = false;
    focused = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    frame(65000);
    assert.equal(progress.length, hiddenCount);
    focused = true;
    win.dispatchEvent(new Event("focus"));
    const left = progress.at(-1)!.left;
    frame(70000);
    assert.equal(progress.at(-1)!.left, left);
    game.dispose();
    assert.equal(frames.size, 0, "disposing cancels the scheduled frame");
  } finally {
    game?.dispose();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
