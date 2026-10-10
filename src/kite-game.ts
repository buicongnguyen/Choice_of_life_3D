import type { KiteGrade } from "./content";

/**
 * A short, forgiving kite-flying game. Hold (pointer, Space or the button) to pull the
 * line in; let go to let it out. Gusts push the tension around; keep it in the bright
 * band and the kite climbs. "Steady hands" halves the gusts and widens the band.
 */
export class KiteGame {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last: number | null = null;
  private paused = false;
  private t = 0;
  private tension = 0.5;
  private height = 0.35;
  private inBand = 0;
  private holding = false;
  private finished = false;
  private disposed = false;
  private gust = 0;
  private gustTarget = 0;
  private sparkles: { x: number; y: number; life: number }[] = [];
  readonly duration: number;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: {
      colour: string;
      face?: HTMLCanvasElement;
      wind: number;
      assist: boolean;
      reduced: boolean;
      onProgress: (p: { tension: number; score: number; left: number }) => void;
      onDone: (g: KiteGrade) => void;
    },
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.duration = 20;
    canvas.addEventListener("pointerdown", this.down);
    window.addEventListener("pointerup", this.up);
    window.addEventListener("pointercancel", this.up);
    window.addEventListener("keydown", this.key);
    window.addEventListener("keyup", this.key);
    window.addEventListener("blur", this.pause);
window.addEventListener('pagehide', this.pause);
window.addEventListener('mobile-game-interruption', this.pause);
    window.addEventListener("focus", this.resume);
    document.addEventListener("visibilitychange", this.visibility);
    if (document.hidden || !document.hasFocus()) this.pause();
    this.raf = requestAnimationFrame(this.frame);
  }

  hold(on: boolean) {
    this.holding = on && !this.paused && !this.finished && !this.disposed;
  }
  pause = () => {
    this.paused = true;
    this.holding = false;
    this.last = null;
  };
  private resume = () => {
    if (this.disposed || document.hidden || !document.hasFocus()) return;
    this.paused = false;
    this.last = null;
  };
  private visibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };
  private down = (e: PointerEvent) => {
    e.preventDefault();
    this.hold(true);
  };
  private up = () => {
    this.holding = false;
  };
  private key = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      this.hold(e.type === "keydown");
    }
  };
  private band() {
    return this.opts.assist ? [0.3, 0.78] : [0.38, 0.7];
  }

  private frame = (ms: number) => {
    if (this.disposed) return;
    const dt = this.last === null ? 0 : Math.max(0, Math.min(0.05, (ms - this.last) / 1000));
    this.last = ms;
    if (!this.paused) {
      if (!this.finished) this.simulate(dt);
      // onDone may dispose the game and remove its canvas.
      if (this.disposed) return;
      this.draw();
    }
    if (!this.disposed && (!this.finished || this.sparkles.length))
      this.raf = requestAnimationFrame(this.frame);
  };

  private simulate(dt: number) {
    this.t += dt;
    const w =
      this.opts.wind *
      (this.opts.assist ? 0.5 : 1) *
      (this.opts.reduced ? 0.7 : 1);
    if (Math.random() < dt * 0.55)
      this.gustTarget = (Math.random() - 0.35) * 0.9 * w;
    this.gust += (this.gustTarget - this.gust) * Math.min(1, dt * 2.2);
    this.gustTarget *= 1 - dt * 0.5;
    const drift =
      Math.sin(this.t * 1.3) * 0.12 * w + Math.sin(this.t * 0.47 + 1) * 0.1 * w;
    this.tension += ((this.holding ? 0.5 : -0.42) + this.gust + drift) * dt;
    this.tension = Math.max(0, Math.min(1, this.tension));
    const [lo, hi] = this.band();
    const ok = this.tension >= lo && this.tension <= hi;
    if (ok) {
      this.inBand += dt;
      this.height = Math.min(1, this.height + dt * 0.05);
      if (Math.random() < dt * 6) this.sparkles.push({ x: 0, y: 0, life: 1 });
    } else this.height = Math.max(0.12, this.height - dt * 0.06);
    const score = this.inBand / Math.max(0.001, this.t);
    this.opts.onProgress({
      tension: this.tension,
      score,
      left: Math.max(0, this.duration - this.t),
    });
    if (this.t >= this.duration) {
      this.finished = true;
      const ratio = this.inBand / this.duration;
      this.opts.onDone(
        ratio >= 0.68 ? "soar" : ratio >= 0.4 ? "steady" : "wobbly",
      );
    }
  }

  private draw() {
    const c = this.canvas;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = c.clientWidth,
      H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1f8fff");
    sky.addColorStop(0.7, "#8fd4ff");
    sky.addColorStop(1, "#fff1cf");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // clouds
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 173 + this.t * (12 + i * 4)) % (W + 160)) - 80;
      const y = 30 + ((i * 53) % (H * 0.45));
      for (const [dx, dy, r] of [
        [0, 0, 22],
        [22, 4, 17],
        [-20, 6, 15],
        [8, -10, 16],
      ]) {
        g.beginPath();
        g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    // sea and pier
    g.fillStyle = "#159ad6";
    g.fillRect(0, H - 34, W, 34);
    g.fillStyle = "#d98f4e";
    g.fillRect(W * 0.35, H - 40, W * 0.3, 10);
    // kite
    const sway =
      Math.sin(this.t * 2.1) * (1 - this.height) * 40 + this.gust * 60;
    const kx = W * 0.5 + sway;
    const ky = H - 40 - this.height * (H - 110);
    const ax = W * 0.5,
      ay = H - 40;
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo(
      ax + (kx - ax) * 0.3 + (1 - this.tension) * 60,
      (ay + ky) / 2 + (1 - this.tension) * 40,
      kx,
      ky + 26,
    );
    g.stroke();
    g.save();
    g.translate(kx, ky);
    g.rotate(Math.sin(this.t * 3) * 0.15 + this.gust * 0.6);
    if (this.opts.face) g.drawImage(this.opts.face, -32, -30, 64, 60);
    else {
      g.fillStyle = this.opts.colour;
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(22, -4);
      g.lineTo(0, 30);
      g.lineTo(-22, -4);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(22, -4);
      g.lineTo(0, -4);
      g.closePath();
      g.fill();
      g.strokeStyle = "#7f4524";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(0, 30);
      g.moveTo(-22, -4);
      g.lineTo(22, -4);
      g.stroke();
    }
    const bows = ["#ffc234", "#2f7de1", "#ff5f8f", "#5fe0b7"];
    for (let i = 0; i < 4; i++) {
      const tx = Math.sin(this.t * 4 + i) * 8,
        ty = 38 + i * 13;
      g.fillStyle = bows[i];
      g.beginPath();
      g.ellipse(tx, ty, 7, 4, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // sparkles
    for (const s of this.sparkles) {
      if (s.life === 1) {
        s.x = kx + (Math.random() - 0.5) * 50;
        s.y = ky + (Math.random() - 0.5) * 50;
      }
      s.life -= 0.03;
      s.y -= 0.6;
      g.fillStyle = `rgba(255,236,160,${Math.max(0, s.life)})`;
      g.beginPath();
      g.arc(s.x, s.y, 3 * s.life + 1, 0, Math.PI * 2);
      g.fill();
    }
    this.sparkles = this.sparkles.filter((s) => s.life > 0);
    // tension gauge
    const gx = W - 44,
      gy = 22,
      gh = H - 80;
    g.fillStyle = "rgba(29,35,64,0.55)";
    g.beginPath();
    g.roundRect(gx - 4, gy - 4, 26, gh + 8, 13);
    g.fill();
    const [lo, hi] = this.band();
    g.fillStyle = "#ffe066";
    g.fillRect(gx, gy + gh * (1 - hi), 18, gh * (hi - lo));
    const ty = gy + gh * (1 - this.tension);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.roundRect(gx - 8, ty - 5, 34, 10, 5);
    g.fill();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointerdown", this.down);
    window.removeEventListener("pointerup", this.up);
    window.removeEventListener("pointercancel", this.up);
    window.removeEventListener("keydown", this.key);
    window.removeEventListener("keyup", this.key);
    window.removeEventListener("blur", this.pause);
    window.removeEventListener('pagehide', this.pause);
    window.removeEventListener('mobile-game-interruption', this.pause);
    window.removeEventListener("focus", this.resume);
    document.removeEventListener("visibilitychange", this.visibility);
  }
}
