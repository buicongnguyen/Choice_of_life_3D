/**
 * The picture card: "who came to the last festival", drawn on a canvas at 1080×1350 so it
 * can be saved or shared from the ending screen.
 */
import { people, kiteName } from "./content";
import { ending, presentAtEnd, COLOURS, type Life } from "./core";
import { u, lang } from "./i18n";
import { paintKite, kiteLook } from "./kite-art";
import { portraits } from "./portraits";

const W = 1080,
  H = 1350;
export const SITE = "buicongnguyen.github.io/Choice_of_life_3D";

function wrap(g: CanvasRenderingContext2D, text: string, maxWidth: number) {
  // Korean and Vietnamese both use spaces between words, so a word wrap works for all three.
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

export async function lifeCard(l: Life) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  await document.fonts?.ready;
  const sans = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const serif = lang === "en" ? `"Libre Caslon Display", Georgia, serif` : sans;
  const e = ending(l);

  // dusk sky, sun and the sea
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1b2690");
  sky.addColorStop(0.45, "#7e46b0");
  sky.addColorStop(0.72, "#ff9d52");
  sky.addColorStop(0.73, "#0f2a66");
  sky.addColorStop(1, "#06112e");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.5, H * 0.72, 10, W * 0.5, H * 0.72, 420);
  sun.addColorStop(0, "rgba(255,226,150,0.95)");
  sun.addColorStop(0.25, "rgba(255,170,90,0.55)");
  sun.addColorStop(1, "rgba(255,150,80,0)");
  g.fillStyle = sun;
  g.fillRect(0, H * 0.4, W, H * 0.6);
  let seed = l.log.length + 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
  g.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 70; i++) {
    // stars stay clear of the words on the left
    const x = rnd() * W,
      y = rnd() * H * 0.45;
    if (x < 760 && y > 70) continue;
    g.globalAlpha = 0.3 + rnd() * 0.6;
    g.beginPath();
    g.arc(x, y, 1 + rnd() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // sparkles on the water
  g.fillStyle = "rgba(255,210,140,0.55)";
  for (let i = 0; i < 40; i++) g.fillRect(W * 0.5 + (rnd() - 0.5) * (80 + i * 14), H * 0.74 + i * 8.5, 18 + rnd() * 40, 3);

  // your kite, high on the right, with its string down to the bottom
  const look = kiteLook(l);
  const kc = document.createElement("canvas");
  kc.width = kc.height = 300;
  paintKite(kc.getContext("2d")!, 300, look.pattern, look.main, look.trim);
  g.save();
  g.translate(W - 250, 250);
  g.rotate(0.22);
  g.shadowColor = "rgba(0,0,0,0.35)";
  g.shadowBlur = 30;
  g.drawImage(kc, -150, -150);
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(W - 220, 390);
  g.bezierCurveTo(W - 150, 640, W - 60, 840, W - 40, H - 96);
  g.stroke();
  const bows = ["#ffc234", "#2f7de1", "#ff5f8f", "#5fe0b7", "#ffffff"];
  g.strokeStyle = "#ffffff";
  g.beginPath();
  g.moveTo(W - 214, 398);
  for (let i = 1; i <= 5; i++) g.lineTo(W - 214 - Math.sin(i) * 26, 398 + i * 44);
  g.stroke();
  for (let i = 1; i <= 5; i++) {
    g.fillStyle = bows[i - 1];
    g.beginPath();
    g.ellipse(W - 214 - Math.sin(i) * 26, 398 + i * 44, 16, 9, 0.3, 0, Math.PI * 2);
    g.fill();
  }

  // words
  const left = 84;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#ffd98a";
  g.font = `700 30px ${sans}`;
  g.fillText(u("end.kicker").toUpperCase(), left, 130);
  g.fillStyle = "#ffffff";
  g.font = `${lang === "en" ? "400" : "800"} 84px ${serif}`;
  let y = 230;
  for (const line of wrap(g, e.title, 700)) {
    g.fillText(line, left, y);
    y += 92;
  }
  g.font = `500 36px ${sans}`;
  g.fillStyle = "rgba(255,255,255,0.92)";
  for (const line of wrap(g, e.line, 640)) {
    y += 8;
    g.fillText(line, left, y);
    y += 44;
  }
  const name = l.identity.name && l.identity.name !== "You" ? u("end.namedStory", { name: l.identity.name }) : u("end.yourStory");
  y += 22;
  g.font = `700 32px ${sans}`;
  g.fillStyle = "#ffd98a";
  g.fillText(`${name} · ${u("end.kite", { colour: kiteName(l) })}`, left, y);

  // who came to the last festival
  const present = presentAtEnd(l);
  const top = Math.max(y + 90, 700);
  g.font = `800 40px ${sans}`;
  g.fillStyle = "#ffffff";
  g.fillText(u("card.at"), left, top);
  if (!present.length) {
    g.font = `500 34px ${sans}`;
    g.fillStyle = "rgba(255,255,255,0.9)";
    wrap(g, u("end.alone"), 820).forEach((line, i) => g.fillText(line, left, top + 70 + i * 44));
  } else {
    const size = present.length > 4 ? 150 : 180;
    const gap = 26;
    const perRow = Math.floor((W - left * 2 + gap) / (size + gap));
    for (let i = 0; i < present.length; i++) {
      const who = present[i];
      const x = left + (i % perRow) * (size + gap);
      const py = top + 40 + Math.floor(i / perRow) * (size + 80);
      const colour = `#${people[who]?.color ?? COLOURS[1]}`;
      g.save();
      g.beginPath();
      g.arc(x + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
      g.fillStyle = colour;
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = "#ffffff";
      g.stroke();
      g.clip();
      const src = portraits.get(who);
      const img = src ? await loadImage(src) : null;
      if (img) g.drawImage(img, x, py, size, size);
      else {
        g.fillStyle = "#ffffff";
        g.font = `800 ${size * 0.45}px ${sans}`;
        g.textAlign = "center";
        g.fillText([...(people[who]?.name ?? "?")][0], x + size / 2, py + size * 0.64);
      }
      g.restore();
      g.textAlign = "center";
      g.font = `700 28px ${sans}`;
      g.fillStyle = "#ffffff";
      g.fillText(people[who]?.name ?? who, x + size / 2, py + size + 42, size + gap);
      g.textAlign = "left";
    }
  }

  // footer
  g.fillStyle = "rgba(6,17,46,0.75)";
  g.fillRect(0, H - 96, W, 96);
  g.font = `800 30px ${sans}`;
  g.fillStyle = "#ffffff";
  g.fillText(u("card.footer"), left, H - 38);
  g.font = `500 24px ${sans}`;
  g.fillStyle = "#ffd98a";
  g.textAlign = "right";
  g.fillText(SITE, W - left, H - 40);
  g.textAlign = "left";
  return c;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));

export async function saveCard(l: Life) {
  const blob = await toBlob(await lifeCard(l));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kitehaven-life.png";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export const canShareFiles = () => typeof navigator.share === "function" && typeof navigator.canShare === "function";

export async function shareCard(l: Life) {
  const blob = await toBlob(await lifeCard(l));
  if (!blob) return false;
  const file = new File([blob], "kitehaven-life.png", { type: "image/png" });
  const data = { files: [file], title: u("card.footer"), text: `${ending(l).title} · https://${SITE}/` };
  try {
    if (navigator.canShare?.(data)) await navigator.share(data);
    else await navigator.share({ title: data.title, text: data.text, url: `https://${SITE}/` });
    return true;
  } catch {
    return false;
  }
}
