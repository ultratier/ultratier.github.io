// Freeze the presets for the static showcase (GitHub Pages): facts for every item, and Jev's tiers
// for every criterion chip, both with facts and names only. Needs the local server running
// (node server.js) because that is what holds the key. Output: docs/data/presets.json.
// Re-run whenever presets.js changes. Each ranking is one Jev call of a few thousand tokens.
import { PRESETS, applyPresetFacts } from "../public/presets.js";
import { rank, setEndpoint } from "../public/jev.js";
import { writeFile, mkdir } from "node:fs/promises";
const BASE = process.env.JEVIT_URL || "http://localhost:3456";
setEndpoint(BASE + "/api/jev");
const out = { generated: new Date().toISOString(), model: null, presets: {} };
for (const p of PRESETS) {
  process.stdout.write(`${p.label}: facts… `);
  const r = await fetch(BASE + "/api/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: p.items, category: p.category }) });
  if (!r.ok) throw new Error(`enrich ${r.status}`);
  const items = applyPresetFacts(await r.json(), p.category).map(({ name, line, facts, source, summary, curated, image }) => ({ name, line, facts, source, summary, image: image || null, curated: !!curated }));
  const results = { facts: {}, names: {} };
  // every single chip, plus the preset's default selection (which may be several chips at 1x).
  // Keys are the page's criteria string ("image quality 1, for travel 1"), so lookups are exact.
  const combos = p.chips.map(c => [c]); const on = p.on || [p.chips[0]]; if (on.length > 1) combos.push(on);
  for (const combo of combos) {
    const crit = combo.map(c => `${c} 1`).join(", ");
    for (const [mode, list] of [["facts", items.map(i => i.line)], ["names", items.map(i => i.name)]]) {
      const d = await rank(list, { criteria: crit, category: p.category });
      out.model ||= d.model;
      results[mode][crit] = { criteria: d.criteria, tiers: d.tiers, model: d.model, usage: d.usage, results: d.results };
      process.stdout.write(".");
    }
  }
  console.log(" ok");
  out.presets[p.category] = { label: p.label, category: p.category, chips: p.chips, on: p.on || [p.chips[0]], items, results };
}
await mkdir("docs/data", { recursive: true });
await writeFile("docs/data/presets.json", JSON.stringify(out));
console.log(`wrote docs/data/presets.json (${Object.keys(out.presets).length} presets, ${Object.values(out.presets).reduce((n, p) => n + Object.keys(p.results.facts).length * 2, 0)} rankings)`);
