// Shared, dependency-free Jev logic. Works in the browser (the page, the Pages build, monoproxy's lab) and in node (precompute).
// The client never holds the Jev key. It posts {state, questions} to a tiny proxy that adds the key.
export let ENDPOINT = "http://localhost:3456/api/jev";
export const setEndpoint = url => { ENDPOINT = url; };

export async function jev(state, questions) {
  const r = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ state, model: "jev-latest", questions }) });
  if (!r.ok) throw new Error(`Jev ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// ---------------- defaults (all user-overridable) ----------------
export const DEFAULT_TIERS = [
  { label: "S", desc: "the best or near-best of the list" },
  { label: "A", desc: "above average for the list" },
  { label: "B", desc: "below average for the list" },
  { label: "C", desc: "among the worst of the list" },
];

// "protein 60, price 40"  |  "healthiness"  |  "taste:2, value:1"  -> [{keyword, weight}]
export function parseCriteria(text) {
  const parts = String(text || "").split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const out = parts.map(p => { const m = p.match(/^(.*?)[\s:]+(\d+(?:\.\d+)?)\s*%?$/); return m ? { keyword: m[1].trim(), weight: +m[2] } : { keyword: p, weight: 1 }; });
  const total = out.reduce((s, c) => s + c.weight, 0) || 1;
  return out.map(c => ({ ...c, weight: c.weight / total })).slice(0, 4);
}

// "S,A,B,C" or "keep, maybe, skip" (best first); optional rubric lines "S = best value" override desc
export function parseTiers(labels, rubric = "") {
  const ls = String(labels || "").split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  if (ls.length < 2) return DEFAULT_TIERS;
  const n = ls.length;
  const auto = i => i === 0 ? "the best or near-best of the list" : i === n - 1 ? "among the worst of the list" : i < n / 2 ? "above average for the list" : "below average for the list";
  const tiers = ls.slice(0, 10).map((label, i) => ({ label, desc: auto(i) }));
  for (const line of String(rubric || "").split("\n")) {
    const m = line.match(/^\s*([^=:]+?)\s*[=:]\s*(.+)$/); if (!m) continue;
    const t = tiers.find(t => t.label.toLowerCase() === m[1].trim().toLowerCase()); if (t) t.desc = m[2].trim();
  }
  return tiers;
}

// ---------------- messy page text -> clean product lines ----------------
// Cheap regex pre-filter for obviously numeric lines, then ONE Jev call classifies every remaining
// line (name / price / unit price / rating / noise) so the clean-up is not tied to any one site.
const MONEY = /(?:[$€£¥₹]|\b(?:AUD|USD|EUR|GBP|NZD)\b)\s*\d|\d\s*(?:[$€£¥]|\b(?:AUD|USD|EUR|GBP|NZD)\b)/i;
const PER_UNIT = /\/\s*\d*\s*(?:g|kg|ml|l|oz|lb|ea|each|unit|100\s?g|100\s?ml)\b|\bper\s+(?:100\s?g|kg|l|litre|each)\b/i;
const RATING = /^\d(?:[.,]\d)?(?:\s*\/\s*5)?$|^\d(?:[.,]\d)?\s*(?:stars?|★+)$|^★+☆*$/i;
const INT = /^\(?\d{1,3}(?:[,.]\d{3})*\)?$|^\(?\d{1,6}\)?$/;
const LINE_KINDS = { name: "the name/title of one specific product or item listing", price: "a price (money amount)", unit: "a unit price such as per 100g / per kg / per each", rating: "a star rating or review score", noise: "anything else: button labels, promos, headings, categories, slogans, navigation, counts" };

export async function parseBlob(text) {
  const raw = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const kind = new Map();
  const ask = [];
  for (const l of new Set(raw)) {
    if (MONEY.test(l) && PER_UNIT.test(l)) kind.set(l, "unit");
    else if (MONEY.test(l) && l.length < 20) kind.set(l, "price");
    else if (RATING.test(l)) kind.set(l, "rating");
    else if (INT.test(l)) kind.set(l, "count");
    else if (l.length < 3 || l.length > 160) kind.set(l, "noise");
    else ask.push(l);
  }
  if (ask.length) {
    const questions = {};
    ask.slice(0, 250).forEach((l, i) => { questions[`l${i}`] = { type: "choice", instructions: `Classify this line copied from a web page: "${l}"`, criteria: LINE_KINDS }; });
    const { answers } = await jev("Lines of text copied from a shopping / listing web page. Product names look like brand + product + size or variant.", questions);
    ask.forEach((l, i) => kind.set(l, answers[`l${i}`]?.choice || "noise"));
  }

  const items = []; const seen = new Set(); let cur = null;
  const sameProduct = (a, b) => { const ta = new Set(a.split(" ")), tb = new Set(b.split(" ")); const [s, b2] = ta.size <= tb.size ? [ta, tb] : [tb, ta]; return [...s].every(t => b2.has(t)); };
  for (const l of raw) {
    const k = kind.get(l);
    if (k === "name") {
      const key = l.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) { cur = items.find(it => it.key === key); continue; }
      if (cur && sameProduct(cur.key, key)) { if (key.length > cur.key.length) cur.name = l; continue; }
      seen.add(key); cur = { key, name: l }; items.push(cur); continue;
    }
    if (!cur) continue;
    if (k === "price" && !cur.price) cur.price = l;
    else if (k === "unit" && !cur.unit) cur.unit = l.replace(/\s+/g, " ");
    else if (k === "rating" && !cur.rating) cur.rating = l;
    else if (k === "count" && !cur.reviews) cur.reviews = l.replace(/[()]/g, "");
  }
  return items.map(it => ({ ...it, line: [it.name, it.price, it.unit && (/^\(.*\)$/.test(it.unit) ? it.unit : `(${it.unit})`), it.rating && `rated ${it.rating}${/\/|star|★/.test(it.rating) ? "" : "/5"}${it.reviews ? ` from ${it.reviews} reviews` : ""}`].filter(Boolean).join(" · ") }));
}

// ---------------- clean lines -> tiers (multi-criteria, one Jev call) ----------------
export async function rank(items, { criteria = "", category = "", tiers = DEFAULT_TIERS } = {}) {
  const crits = parseCriteria(criteria);
  if (!crits.length) crits.push({ keyword: "overall quality / which is best", weight: 1 });
  const cat = category.trim() || "items";
  const levels = tiers.slice().reverse(); // Jev score level 0 = worst tier
  const rubric = levels.map(t => `${t.label} tier: ${t.desc}`);
  const state =
    `You are ranking a list of ${cat}. Criteria: ${crits.map(c => c.keyword).join("; ")}.\n` +
    `Compare every item against the others in this list only. It is a relative ranking: the best item of this list ` +
    `belongs in the top tier and the worst in the bottom tier, even if the whole list is strong or weak.\n\n` +
    items.map((it, i) => `### Item ${i + 1}: ${it}`).join("\n");
  const questions = {};
  items.forEach((it, i) => crits.forEach((c, j) => {
    questions[`i${i}_c${j}`] = { type: "score", instructions: `Where does Item ${i + 1} (${it.slice(0, 80)}) rank relative to all other items on: ${c.keyword}?`, criteria: rubric };
  }));
  const data = await jev(state, questions);
  const max = levels.length - 1;
  const results = items.map((label, i) => {
    const per = crits.map((c, j) => { const a = data.answers[`i${i}_c${j}`]; return { keyword: c.keyword, weight: c.weight, score: a.score, confidence: a.confidence, probabilities: a.probabilities }; });
    const score = per.reduce((s, p) => s + p.score * p.weight, 0);
    const confidence = per.reduce((s, p) => s + p.confidence * p.weight, 0);
    const idx = Math.max(0, Math.min(max, Math.round(score)));
    // blended distribution over tiers, best tier first (for the bar)
    const probabilities = tiers.map((t, k) => [t.label, +per.reduce((s, p) => s + (p.probabilities[String(max - k)] ?? 0) * p.weight, 0).toFixed(2)]);
    return { label, tier: levels[idx].label, score: +score.toFixed(2), confidence: +confidence.toFixed(2), probabilities,
      breakdown: per.map(p => ({ keyword: p.keyword, tier: levels[Math.max(0, Math.min(max, Math.round(p.score)))].label, score: +p.score.toFixed(2) })) };
  }).sort((x, y) => y.score - x.score);
  // Anchor the top. Jev scores each item on its own, so a cautious model can leave the top tier empty,
  // which is no ranking at all: the best of the list is S by definition. The top scorer goes there,
  // with anything within 0.1 of it. The bottom is NOT forced: a list can be all decent.
  if (results.length >= 2) {
    const top = tiers[0].label;
    if (!results.some(r => r.tier === top)) for (const r of results) if (r.score >= results[0].score - 0.1) { r.anchored = true; r.tier = top; }
  }
  return { criteria: crits, category: cat, tiers, model: data.model, usage: data.usage, results };
}
