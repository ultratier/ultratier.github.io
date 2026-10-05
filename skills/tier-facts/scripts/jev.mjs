#!/usr/bin/env node
// Rank a list through Jev (typesafe.ai) instead of the agent's own model. Zero dependencies.
//   node jev.mjs status                 -> {"ranker":"jev"|"llm"|null,"key":true|false}   (null = never chosen)
//   node jev.mjs use jev|llm            -> remember which ranker /tier and /tier-facts use by default
//   node jev.mjs set-key                -> hidden prompt for the Jev key; run by the USER in their own terminal
//   node jev.mjs set-key --clipboard    -> take the key from the clipboard; safe for the agent to run
//   node jev.mjs forget-key             -> delete the stored key
//   node jev.mjs rank input.json        -> one Jev call, prints the ranking as JSON   (- reads stdin)
//   node jev.mjs rank input.json --text --board board.json
//                                       -> prints the finished text board, ready to show, and writes the
//                                          input for board.mjs, so the answer can be shown before the picture
//   ... rank input.json --default       -> only ranks when Jev is the saved default and a key is set;
//                                          otherwise prints the same line as `status` and does nothing
// The key is never printed, logged or passed on a command line. It lives in JEV_API_KEY if that is set,
// otherwise in ~/.config/ultratier/jev.key (owner-only). The choice of ranker lives beside it in config.json.
// rank input:  { "category": "compact cameras", "criteria": [ { "keyword": "video", "weight": 1 } ],
//                "items": [ "Leica Q3", { "name": "Lumix S9", "facts": "V-Log, open gate, stabilised" } ],
//                "tiers": ["S","A","B","C","D"], "compare": true }
// `facts` go into the state Jev ranks on. `compare` adds a second, names-only call and reports which items
// moved a tier or more once the facts were in (`moved`), which is the "Changed from names only" line.
// Items may also carry `note` (the evidence line, e.g. "looked up: 4K, mic input") and `image`; both are
// passed through to the text board and the picture. `title` overrides the generated title.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const API = "https://api.typesafe.ai/v1/systemone";
const HOME = process.env.ULTRATIER_HOME || join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "ultratier");
const KEY_FILE = join(HOME, "jev.key"), CONFIG_FILE = join(HOME, "config.json");
const [cmd, ...args] = process.argv.slice(2);
const die = msg => { console.error(msg); process.exit(1); };

const readConfig = () => { try { return JSON.parse(readFileSync(CONFIG_FILE, "utf8")); } catch { return {}; } };
const getKey = () => (process.env.JEV_API_KEY || (existsSync(KEY_FILE) ? readFileSync(KEY_FILE, "utf8") : "")).trim();

async function jev(key, state, questions) {
  const r = await fetch(API, { method: "POST", signal: AbortSignal.timeout(60000),
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ state, model: "jev-latest", questions }) });
  if (!r.ok) { const e = new Error(`Jev answered ${r.status}`); e.status = r.status; throw e; }
  return r.json();
}

// ---------------- the key ----------------
const hiddenPrompt = label => new Promise(res => {
  const { stdin, stderr } = process;
  stderr.write(label); stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
  let buf = "";
  stdin.on("data", d => { for (const ch of d) {
    if (ch === "\r" || ch === "\n" || ch === "\u0004") { stdin.setRawMode(false); stdin.pause(); stderr.write("\n"); return res(buf); }
    if (ch === "\u0003") { stdin.setRawMode(false); stderr.write("\n"); process.exit(130); }
    if (ch === "\u007f" || ch === "\b") buf = buf.slice(0, -1); else buf += ch;
  } });
});

function fromClipboard() {
  const tries = { darwin: [["pbpaste"]], win32: [["powershell", "-NoProfile", "-Command", "Get-Clipboard"]] }[platform()]
    || [["wl-paste", "-n"], ["xclip", "-o", "-selection", "clipboard"], ["xsel", "-b"]];
  for (const [bin, ...a] of tries) { const r = spawnSync(bin, a, { encoding: "utf8" }); if (r.status === 0 && r.stdout.trim()) return r.stdout; }
  die("Could not read the clipboard. Run `node jev.mjs set-key` in your own terminal instead.");
}

async function setKey() {
  const clip = args.includes("--clipboard");
  if (!clip && !process.stdin.isTTY) die("No terminal to type into. Run this in your own terminal, or copy the key and use --clipboard.");
  const key = (clip ? fromClipboard() : await hiddenPrompt("Paste your Jev API key (it will not be shown): ")).trim();
  // Never echo what was read: if the clipboard held something else, it stays private too.
  if (key.length < 16 || /\s/.test(key)) die(clip ? "The clipboard does not hold something that looks like a key. Copy the key and try again." : "That does not look like a key. Nothing was saved.");
  let checked = true;
  try { await jev(key, "A connection check.", { ok: { type: "choice", instructions: "Reply yes.", criteria: { yes: "yes", no: "no" } } }); }
  catch (e) { if (e.status === 401 || e.status === 403) die("Jev rejected that key. Nothing was saved."); checked = false; }
  mkdirSync(HOME, { recursive: true, mode: 0o700 });
  writeFileSync(KEY_FILE, key + "\n", { mode: 0o600 }); chmodSync(KEY_FILE, 0o600);
  if (clip && platform() === "darwin") spawnSync("pbcopy", [], { input: "" }); // do not leave the key on the clipboard
  console.log(checked ? `Key saved to ${KEY_FILE} and accepted by Jev.` : `Key saved to ${KEY_FILE}. Jev could not be reached to check it.`);
}

// ---------------- the ranking (same shape as the site's rank() in public/jev.js) ----------------
const DESCS = n => i => i === 0 ? "the best or near-best of the list" : i === n - 1 ? "among the worst of the list"
  : (n % 2 && i === (n - 1) / 2) ? "about average for the list" : i < n / 2 ? "above average for the list" : "below average for the list";

async function rankOnce(key, { category, crits, items, tiers }, withFacts) {
  const levels = tiers.slice().reverse(); // Jev score level 0 = worst tier
  const rubric = levels.map(t => `${t.label} tier: ${t.desc}`);
  const state =
    `You are ranking a list of ${category}. Criteria: ${crits.map(c => c.keyword).join("; ")}.\n` +
    `Compare every item against the others in this list only. It is a relative ranking: the best item of this list ` +
    `belongs in the top tier and the worst in the bottom tier, even if the whole list is strong or weak.\n` +
    (withFacts ? `Where facts are given for an item, rank on those facts rather than on its reputation.\n` : "") + "\n" +
    items.map((it, i) => `### Item ${i + 1}: ${it.name}${withFacts && it.facts ? `\nFacts: ${it.facts}` : ""}`).join("\n");
  const questions = {};
  items.forEach((it, i) => crits.forEach((c, j) => {
    questions[`i${i}_c${j}`] = { type: "score", instructions: `Where does Item ${i + 1} (${it.name.slice(0, 80)}) rank relative to all other items on: ${c.keyword}?`, criteria: rubric };
  }));
  const data = await jev(key, state, questions);
  const max = levels.length - 1;
  const results = items.map((it, i) => {
    const per = crits.map((c, j) => ({ ...c, ...data.answers[`i${i}_c${j}`] }));
    const score = per.reduce((s, p) => s + p.score * p.weight, 0), confidence = per.reduce((s, p) => s + p.confidence * p.weight, 0);
    return { name: it.name, tier: levels[Math.max(0, Math.min(max, Math.round(score)))].label, score: +score.toFixed(2), confidence: +confidence.toFixed(2) };
  }).sort((x, y) => y.score - x.score);
  // Anchor the top: the best of the list is in the top tier by definition. The bottom is not forced.
  const top = tiers[0].label;
  if (results.length >= 2 && !results.some(r => r.tier === top)) for (const r of results) if (r.score >= results[0].score - 0.1) r.tier = top;
  return { results, model: data.model, usage: data.usage };
}

async function rank() {
  if (args.includes("--default") && (readConfig().ranker !== "jev" || !getKey()))
    return console.log(JSON.stringify({ ranker: readConfig().ranker || null, key: !!getKey() }));
  const key = getKey(); if (!key) die("No Jev key. Set one up first (see set-key).");
  const boardOut = args.includes("--board") ? args[args.indexOf("--board") + 1] : null;
  const src = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--board");
  const input = JSON.parse(readFileSync(!src || src === "-" ? 0 : src, "utf8"));
  const items = (input.items || []).map(it => typeof it === "string" ? { name: it } : it).filter(it => it.name);
  if (items.length < 2) die("Need two or more items.");
  const asked = (input.criteria || []).map(c => typeof c === "string" ? { keyword: c, weight: 1 } : { keyword: c.keyword, weight: c.weight || 1 }).slice(0, 4);
  let crits = asked.length ? asked : [{ keyword: "overall quality / which is best", weight: 1 }];
  const total = crits.reduce((s, c) => s + c.weight, 0);
  crits = crits.map(c => ({ keyword: c.keyword, weight: c.weight / total }));
  const labels = input.tiers?.length >= 2 ? input.tiers.slice(0, 10) : ["S", "A", "B", "C", "D"];
  const tiers = labels.map((label, i) => ({ label, desc: DESCS(labels.length)(i) }));
  const job = { category: (input.category || "items").trim(), crits, items, tiers };
  const withFacts = items.some(it => it.facts || it.note); // tier-facts sends these, tier sends bare names
  const [main, bare] = await Promise.all([rankOnce(key, job, true), (input.compare ?? withFacts) && items.some(it => it.facts) ? rankOnce(key, job, false) : null]);
  const mean = main.results.reduce((s, r) => s + r.confidence, 0) / main.results.length;
  const extra = Object.fromEntries(items.map(it => [it.name, it]));
  const out = { ranker: "jev", model: main.model, category: job.category, criteria: crits,
    tiers: tiers.map(t => ({ label: t.label, items: main.results.filter(r => r.tier === t.label) })),
    confidence: { mean: +mean.toFixed(2), level: mean >= 0.75 ? "high" : mean >= 0.5 ? "medium" : "low" } };
  if (bare) {
    const at = l => labels.indexOf(l), before = Object.fromEntries(bare.results.map(r => [r.name, r.tier]));
    out.moved = main.results.filter(r => before[r.name] !== r.tier).map(r => ({ name: r.name, from: before[r.name], to: r.tier }))
      .sort((a, b) => Math.abs(at(b.from) - at(b.to)) - Math.abs(at(a.from) - at(a.to)));
  }

  // ---- the finished board, as text and as input for board.mjs ----
  const cat = job.category[0].toUpperCase() + job.category.slice(1);
  const title = input.title || `${cat}, ranked for ${asked.length ? asked.map(c => c.keyword + (c.weight !== 1 ? ` (×${c.weight})` : "")).join(", ") : "overall quality"}`;
  const pad = Math.max(...labels.map(l => l.length)) + 2;
  let text, board;
  if (withFacts) {
    const wide = Math.max(...items.map(it => it.name.length)) + 3;
    const rows = out.tiers.flatMap(t => t.items.length
      ? t.items.map((r, i) => `${(i ? "" : t.label).padEnd(pad)}${r.name.padEnd(wide)}${extra[r.name].note || "guessed: no facts found"}`.trimEnd())
      : [t.label]);
    const n = w => items.filter(it => (it.note || "guessed").toLowerCase().startsWith(w)).length;
    const changed = `Changed from names only: ${out.moved?.length ? out.moved.map(m => `${m.name} ${m.from} → ${m.to}`).join(", ") : "nothing moved."}`;
    const based = `Based on: ${n("you said")} from you, ${n("looked up")} looked up, ${n("guessed")} guessed`;
    const by = `Ranked by: Jev (confidence ${out.confidence.level})`;
    text = [title, "", ...rows, "", changed, based, by].join("\n");
    board = { title, tiers: out.tiers.map(t => ({ label: t.label, items: t.items.map(r => { const e = extra[r.name]; return { name: r.name, note: e.note || "guessed: no facts found", ...(e.image ? { image: e.image } : {}) }; }) })),
      footer: `${changed.replace(/\.$/, "")}.  ${based}.  ${by}` };
  } else {
    const sub = "Names only, ranked by Jev. No facts were looked up, so this is a prior.";
    const rows = out.tiers.map(t => `${t.label.padEnd(pad)}${t.items.map(r => r.name).join(" · ")}`.trimEnd());
    text = [title, sub, "", ...rows, "", `Confidence: ${out.confidence.level}. Jev's own confidence in these placements.`, "Run /tier-facts on the same list to check this against real facts."].join("\n");
    board = { title, subtitle: sub, tiers: out.tiers.map(t => ({ label: t.label, items: t.items.map(r => r.name) })),
      footer: `Confidence: ${out.confidence.level}. Run /tier-facts on the same list to check this against real facts.` };
  }
  if (input.theme) board.theme = input.theme;
  if (boardOut) writeFileSync(boardOut, JSON.stringify(board));
  console.log(args.includes("--text") ? text : JSON.stringify(out));
}

// ---------------- commands ----------------
if (cmd === "status") console.log(JSON.stringify({ ranker: readConfig().ranker || null, key: !!getKey() }));
else if (cmd === "use") {
  if (!["jev", "llm"].includes(args[0])) die("use jev | use llm");
  mkdirSync(HOME, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...readConfig(), ranker: args[0] }, null, 1) + "\n");
  console.log(`Default ranker: ${args[0]}`);
}
else if (cmd === "set-key") await setKey();
else if (cmd === "forget-key") { rmSync(KEY_FILE, { force: true }); console.log("Stored key removed."); }
else if (cmd === "rank") await rank().catch(e => die(e.status === 401 || e.status === 403 ? "Jev rejected the key. Set it up again (see set-key)." : `Jev call failed: ${e.message}`));
else die("Commands: status | use jev|llm | set-key [--clipboard] | forget-key | rank input.json [--text] [--board out.json] [--default]");
