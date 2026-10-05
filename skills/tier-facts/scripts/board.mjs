#!/usr/bin/env node
// Draw a tier list as an image. Zero dependencies.
//   node board.mjs board.json                 -> tier-list.png in the current folder
//   node board.mjs board.json --out my.png    -> a path of your choice
//   node board.mjs board.json --svg           -> SVG instead of PNG
//   cat board.json | node board.mjs - --out x.png
// PNG is the default because it pastes anywhere. Making one needs a renderer, so this tries what the
// machine already has (Chrome, Edge, Chromium or Brave headless; then rsvg-convert or ImageMagick; then
// macOS Quick Look). If none works it writes the SVG next to where the PNG would have gone and says
// so. It never downloads anything. The last line printed is always the path of the file written.
// Input: { "title": "...", "subtitle": "...", "footer": "...", "theme": "dark" | "light",
//          "tiers": [ { "label": "S", "items": [ { "name": "...", "note": "..." } ] }, ... ] }
// `note` is optional (tier-facts uses it for "you said: ..." / "looked up: ..."); items may also be plain strings.
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const src = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const wantSvg = flag("--svg");

const input = JSON.parse(readFileSync(!src || src === "-" ? 0 : src, "utf8"));
const dark = (input.theme || "dark") !== "light";
const C = dark
  ? { bg: "#000000", fg: "#f5f5f7", muted: "#86868b", row: "#1a1a1a", tile: "#000000", edge: "#3a3a3c", gap: "#000000" }
  : { bg: "#f5f5f7", fg: "#1d1d1f", muted: "#6e6e73", row: "#e4e4e7", tile: "#ffffff", edge: "#c7c7cc", gap: "#f5f5f7" };
const RAMP = ["#ff7f7f", "#ffbf7f", "#ffdf7f", "#ffff7f", "#bfff7f", "#7fff7f", "#7fffff", "#7fbfff"];
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const W = 1200, PAD = 40, LABEL = 100, GAP = 8, TILE_W = 196, CHAR = 7.4;       // 12px mono ≈ 7.4px per char
const wrap = (text, max) => { const out = []; let line = "";
  for (const word of String(text).split(/\s+/)) { if ((line + " " + word).trim().length > max && line) { out.push(line); line = word; } else line = (line + " " + word).trim(); }
  if (line) out.push(line); return out; };
const perLine = Math.floor((TILE_W - 24) / CHAR);

const tiers = input.tiers.map(t => ({ label: t.label, items: (t.items || []).map(i => typeof i === "string" ? { name: i } : i) }));
const perRow = Math.floor((W - 2 * PAD - LABEL - GAP) / (TILE_W + GAP));
let y = PAD, body = "";

// header
const titleLines = wrap(input.title || "Tier list", 52);
for (const l of titleLines) { y += 30; body += `<text x="${PAD}" y="${y}" font-size="26" font-weight="700" fill="${C.fg}">${esc(l)}</text>`; }
if (input.subtitle) for (const l of wrap(input.subtitle, 110)) { y += 22; body += `<text x="${PAD}" y="${y}" font-size="13" fill="${C.muted}">${esc(l)}</text>`; }
y += 22;

// rows
tiers.forEach((t, ti) => {
  const tiles = t.items.map(it => { const name = wrap(it.name, perLine), note = it.note ? wrap(it.note, perLine + 4) : [];
    return { name, note, h: 22 + name.length * 17 + (note.length ? 6 + note.length * 14 : 0) + 10 }; });
  const lines = []; for (let i = 0; i < tiles.length; i += perRow) lines.push(tiles.slice(i, i + perRow));
  const rowH = Math.max(84, GAP + lines.reduce((s, l) => s + Math.max(...l.map(x => x.h)) + GAP, 0));
  body += `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${rowH}" fill="${C.row}"/>`;
  body += `<rect x="${PAD}" y="${y}" width="${LABEL}" height="${rowH}" fill="${RAMP[Math.min(ti, RAMP.length - 1)]}"/>`;
  const lab = String(t.label), fs = lab.length > 3 ? 14 : 24;
  body += `<text x="${PAD + LABEL / 2}" y="${y + rowH / 2 + fs / 3}" font-size="${fs}" font-weight="700" fill="#333" text-anchor="middle">${esc(lab)}</text>`;
  let ty = y + GAP;
  for (const line of lines) { const lh = Math.max(...line.map(x => x.h)); let tx = PAD + LABEL + GAP;
    for (const tile of line) {
      body += `<rect x="${tx}" y="${ty}" width="${TILE_W}" height="${lh}" rx="6" fill="${C.tile}" stroke="${C.edge}"/>`;
      let cy = ty + 24; for (const l of tile.name) { body += `<text x="${tx + 12}" y="${cy}" font-size="13" font-weight="700" fill="${C.fg}">${esc(l)}</text>`; cy += 17; }
      if (tile.note.length) { cy += 2; for (const l of tile.note) { body += `<text x="${tx + 12}" y="${cy}" font-size="11" fill="${C.muted}">${esc(l)}</text>`; cy += 14; } }
      tx += TILE_W + GAP; }
    ty += lh + GAP; }
  y += rowH + 2;
});

// footer
y += 26; const foot = wrap(input.footer || "", 130);
for (const l of foot) { body += `<text x="${PAD}" y="${y}" font-size="12" fill="${C.muted}">${esc(l)}</text>`; y += 18; }
body += `<text x="${W - PAD}" y="${y - (foot.length ? 18 : 0)}" font-size="12" fill="${C.muted}" text-anchor="end">ultratier.github.io</text>`;
const H = y + PAD - 10;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}"><rect width="${W}" height="${H}" fill="${C.bg}"/>${body}</svg>\n`;

// ---------- write it: PNG by default, SVG on request or when no renderer is available ----------
const out = resolve(opt("--out") || (wantSvg ? "tier-list.svg" : "tier-list.png"));
const svgPath = out.replace(/\.png$/i, "") .replace(/\.svg$/i, "") + ".svg";
const good = f => existsSync(f) && statSync(f).size > 500;
const run = (cmd, a) => { try { return spawnSync(cmd, a, { timeout: 30000, stdio: "ignore" }).status === 0; } catch { return false; } };

function toPng(svgFile, pngFile) {
  if (process.env.TIER_BOARD_RENDERERS === "none") return null;           // for testing the fallback
  // 1. a Chromium-family browser, headless. 2x for a crisp image.
  const browsers = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const b of browsers) {
    if (b.includes("/") || b.includes("\\") ? !existsSync(b) : false) continue;
    if (run(b, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${W},${H}`, `--screenshot=${pngFile}`, "file://" + svgFile]) && good(pngFile)) return "browser";
  }
  // 2. command-line converters
  if (run("rsvg-convert", ["-w", String(W * 2), svgFile, "-o", pngFile]) && good(pngFile)) return "rsvg-convert";
  if (run("magick", ["-background", "none", "-density", "192", svgFile, pngFile]) && good(pngFile)) return "ImageMagick";
  // 3. macOS Quick Look (rougher, but always there on a Mac)
  if (process.platform === "darwin") { const d = mkdtempSync(join(tmpdir(), "tier-"));
    if (run("qlmanage", ["-t", "-s", String(W * 2), "-o", d, svgFile])) { const f = join(d, basename(svgFile) + ".png"); if (good(f)) { renameSync(f, pngFile); rmSync(d, { recursive: true, force: true }); return "Quick Look"; } }
    rmSync(d, { recursive: true, force: true }); }
  return null;
}

if (wantSvg || /\.svg$/i.test(out)) { writeFileSync(svgPath, svg); console.log(svgPath); }
else {
  const tmp = join(mkdtempSync(join(tmpdir(), "tier-")), "board.svg"); writeFileSync(tmp, svg);
  const how = toPng(tmp, out); rmSync(dirname(tmp), { recursive: true, force: true });
  if (how) console.log(out);
  else { writeFileSync(svgPath, svg); console.log("No PNG renderer found on this machine (tried Chrome, Edge, Chromium, Brave, rsvg-convert, ImageMagick, Quick Look). Wrote an SVG instead."); console.log(svgPath); }
}
