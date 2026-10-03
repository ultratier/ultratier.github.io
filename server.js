// jevtier proxy — the ONLY thing this does with the key is add it to /api/jev calls.
// All ranking / parsing logic lives client-side in public/jev.js (shared with the Pages build and the monoproxy lab page).
const http = require("http"), fs = require("fs"), path = require("path");
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const JEV_KEY = process.env.JEV_API_KEY, PORT = process.env.PORT || 3456;
if (!JEV_KEY) { console.error("JEV_API_KEY missing in .env"); process.exit(1); }

// ---------- live enrichment: item name -> facts from Wikipedia (infobox, else summary) ----------
const https = require("https");
const getOnce = url => new Promise((res, rej) => https.get(url, { family: 4, headers: { "user-agent": "jevtier/0.1 (https://github.com/jevtier; enrichment bot)" } }, r => {
  let b = ""; r.on("data", c => b += c); r.on("end", () => r.statusCode < 400 ? res(b) : rej(Object.assign(new Error(`${r.statusCode} ${url}`), { status: r.statusCode, retryAfter: +r.headers["retry-after"] || 0 })));
}).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Wikipedia asks for serial requests from one client. One at a time with a short gap, and a 429 is
// honoured (Retry-After, else a growing wait) rather than hammered: a burst of 20 parallel lookups
// got this bot limited for a minute during testing.
let wikiQueue = Promise.resolve();
function get(url) {
  const run = async () => { for (let i = 0; ; i++) { try { return await getOnce(url); } catch (e) { if (e.status !== 429 || i >= 4) throw e; await sleep(Math.max(e.retryAfter * 1000, 2000 * (i + 1))); } } };
  const p = wikiQueue.then(run); wikiQueue = p.then(() => sleep(250), () => sleep(250)); return p;
}
async function mapLimit(xs, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]); } })); return out; }
const CACHE_FILE = path.join(__dirname, "enrich-cache.json");
let cache = {}; try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch {}
const saveCache = () => fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 1), () => {});
const dewiki = v => v.replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "").replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\{\{(?:convert|cvt)\|([^|}]+)\|([^|}]+)[^}]*\}\}/gi, "$1 $2").replace(/\{\{(?:nowrap|nobr)\|([^}]*)\}\}/gi, "$1")
  .replace(/\{\{(?:ubl|unbulleted list|plainlist|flatlist)\|([^}]*)\}\}/gi, (_, x) => x.replace(/\|/g, ", ")).replace(/\{\{[^}]*\}\}/g, "")
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/<[^>]+>/g, " ").replace(/'{2,}/g, "").replace(/&nbsp;/g, " ").replace(/[|{}]+/g, " ").replace(/\s+/g, " ").trim();
const SKIP = /^(image|img|logo|caption|photo|picture|map|flag|seal|signature|website|url|name|alt|module|bodystyle|footnotes|title|italic[ _]title|embed|child|label)/i; // keys that never carry a fact
// split a template body on pipes that are not inside nested {{ }} or [[ ]]
function splitTop(s) { const out = []; let d = 0, cur = ""; for (let i = 0; i < s.length; i++) {
  const two = s.slice(i, i + 2);
  if (two === "{{" || two === "[[") { d++; cur += two; i++; continue; }
  if (two === "}}" || two === "]]") { d--; cur += two; i++; continue; }
  if (s[i] === "|" && d === 0) { out.push(cur); cur = ""; continue; }
  cur += s[i]; } out.push(cur); return out; }
function infobox(wikitext) {
  const i = wikitext.search(/\{\{\s*Infobox/i); if (i < 0) return [];
  let depth = 0, j = i; for (; j < wikitext.length; j++) { if (wikitext.startsWith("{{", j)) { depth++; j++; } else if (wikitext.startsWith("}}", j)) { depth--; j++; if (!depth) break; } }
  const body = wikitext.slice(i + 2, j - 1).replace(/<!--[\s\S]*?-->/g, "");
  const facts = [];
  for (const part of splitTop(body).slice(1)) {
    const eq = part.indexOf("="); if (eq < 0) continue;
    const k = part.slice(0, eq).trim().replace(/_/g, " "), v = dewiki(part.slice(eq + 1));
    if (SKIP.test(k) || !v || v.length > 90 || /^\d+px$/.test(v) || /\.(jpe?g|png|svg|gif|webp)$/i.test(v) || !/[a-z0-9]{2}/i.test(v.replace(/[|{}\s]/g, ""))) continue;
    facts.push(`${k}: ${v}`); if (facts.length >= 12) break;
  }
  return facts;
}
// ---------- second source: web search (Serper or Brave), snippets filtered by Jev ----------
const SERPER = process.env.SERPER_API_KEY, BRAVE = process.env.BRAVE_API_KEY;
const postJSON = (url, headers, body) => new Promise((res, rej) => {
  const u = new URL(url), data = JSON.stringify(body);
  const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: "POST", family: 4, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data), ...headers } }, r => {
    let b = ""; r.on("data", c => b += c); r.on("end", () => r.statusCode < 400 ? res(b) : rej(new Error(`${r.statusCode} ${url}: ${b.slice(0, 120)}`)));
  }); r.on("error", rej); r.end(data);
});
async function webSearch(q) {
  if (SERPER) {
    const r = JSON.parse(await postJSON("https://google.serper.dev/search", { "x-api-key": SERPER }, { q, num: 6 }));
    return (r.organic || []).map(o => ({ title: o.title, snippet: o.snippet, url: o.link })).filter(o => o.snippet);
  }
  if (BRAVE) {
    const r = JSON.parse(await new Promise((res, rej) => https.get(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=6`, { family: 4, headers: { accept: "application/json", "x-subscription-token": BRAVE } }, x => { let b = ""; x.on("data", c => b += c); x.on("end", () => x.statusCode < 400 ? res(b) : rej(new Error(`${x.statusCode} brave: ${b.slice(0, 120)}`))); }).on("error", rej)));
    return (r.web?.results || []).map(o => ({ title: o.title, snippet: o.description, url: o.url })).filter(o => o.snippet);
  }
  return null;
}
async function jevAsk(state, questions) {
  const r = await fetch("https://api.typesafe.ai/v1/systemone", { method: "POST", headers: { authorization: `Bearer ${JEV_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ state, model: "jev-latest", questions }) });
  if (!r.ok) throw new Error(`jev ${r.status}`); return r.json();
}
async function searchFacts(name, category) {
  const hits = await webSearch(`${name} ${category}`.trim()); if (!hits || !hits.length) return null;
  const questions = {};
  hits.forEach((h, i) => { questions[`s${i}`] = { type: "choice", instructions: `Is this search result specifically about "${name}" (the ${category || "item"} itself, not just the brand or a different product)? Result: ${h.title} — ${h.snippet}`, criteria: { yes: "it describes this exact product/item", no: "different product, brand-level page, listing of many things, or unrelated" } }; });
  const { answers } = await jevAsk(`Deciding which web search results describe one specific ${category || "item"}: ${name}.`, questions);
  const keep = hits.filter((h, i) => answers[`s${i}`]?.choice === "yes" && (answers[`s${i}`]?.confidence ?? 1) > 0.3).slice(0, 3);
  if (!keep.length) return null;
  return { facts: keep.map(h => h.snippet.replace(/\s+/g, " ").slice(0, 220)), source: keep[0].url, via: SERPER ? "serper" : "brave" };
}
async function enrichOne(name, category) {
  const key = `${category}|${name}`.toLowerCase();
  if (cache[key]) return cache[key];
  const q = encodeURIComponent(`${name} ${category}`.trim());
  let out = { name, source: null, facts: [], summary: "", image: null };
  try {
    // Candidates: a full-text search WITH the category first ("Wingspan board games" finds
    // "Wingspan (board game)", where the bare name lands on a disambiguation page), then the
    // bare-name title match. Each must share tokens with the name and not be a "may refer to" page.
    const tok = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 1 || /\d/.test(w));
    const nameToks = tok(name);
    const nums = nameToks.filter(t => /^\d+$/.test(t));
    const fits = title => { const tt = tok(title); const tnums = tt.filter(t => /^\d+$/.test(t));
      if (tnums.length && nums.length && !nums.every(n => tnums.includes(n))) return false; // "17 Pro" is not "18 Pro"
      return nameToks.filter(a => tt.some(b => a === b || (a.length > 2 && b.length > 2 && (a.startsWith(b) || b.startsWith(a))))).length >= Math.min(2, nameToks.length); };
    const candidates = [];
    { const sr = JSON.parse(await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=3&format=json`)); for (const h of sr.query?.search || []) candidates.push(h.title); }
    { const [, titles] = JSON.parse(await get(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=2&namespace=0&format=json`)); candidates.push(...titles); }
    // titles carrying the name's model number first: "PlayStation 5" before "PlayStation (console)"
    const hasNums = t => nums.every(n => tok(t).includes(n));
    for (const title of [...new Set(candidates)].sort((a, b) => (nums.length ? hasNums(b) - hasNums(a) : 0))) {
      if (!fits(title)) { out.rejected ||= title; continue; }
      const r = JSON.parse(await get(`https://en.wikipedia.org/w/api.php?action=query&prop=revisions|extracts|pageimages&piprop=thumbnail&pithumbsize=320&pilicense=any&rvprop=content&rvslots=main&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&formatversion=2&redirects=1`));
      const page = r.query?.pages?.[0] || {};
      const extract = (page.extract || "").replace(/\s+/g, " ");
      const wikitext = page.revisions?.[0]?.slots?.main?.content || "";
      if (/may refer to:?$/i.test(extract.slice(0, 160)) || /\{\{\s*(disambiguation|disambig|dab)\b/i.test(wikitext)) { out.rejected ||= title; continue; }
      out.source = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || title)}`;
      out.facts = infobox(wikitext);
      out.summary = extract.slice(0, 400);
      out.image = page.thumbnail?.source || null;   // the page's lead image, hotlinked from upload.wikimedia.org
      break;
    }
  } catch (e) { out.error = String(e.message || e); }
  if (out.facts.length < 3) { try { const sf = await searchFacts(name, category); if (sf) { out.facts = out.facts.concat(sf.facts); out.source ||= sf.source; out.via = sf.via; } } catch (e) { out.searchError = String(e.message || e); } }
  out.line =[name, ...(out.facts.length ? out.facts : [out.summary])].filter(Boolean).join(" · ");
  if (!out.error) { cache[key] = out; saveCache(); }
  return out;
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST" };

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.method === "POST" && req.url === "/api/enrich") {
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", async () => {
      try {
        const { items, category = "" } = JSON.parse(body || "{}");
        if (!Array.isArray(items) || items.length > 60) throw new Error("expected {items:[...≤60], category}");
        const out = (await mapLimit(items, 2, n => enrichOne(String(n).trim().slice(0, 120), String(category).slice(0, 60))))
          .map(o => process.env.AMAZON_TAG ? { ...o, buy: `https://www.amazon.com.au/s?k=${encodeURIComponent(o.name)}&tag=${process.env.AMAZON_TAG}` } : o);
        res.writeHead(200, { "content-type": "application/json", ...CORS }); res.end(JSON.stringify(out));
      } catch (e) { res.writeHead(400, { "content-type": "application/json", ...CORS }); res.end(JSON.stringify({ error: String(e.message || e) })); }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/jev") {
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      try {
        const { state, questions } = JSON.parse(body || "{}");
        if (typeof state !== "string" || !questions || typeof questions !== "object") throw new Error("expected {state, questions}");
        const r = await fetch("https://api.typesafe.ai/v1/systemone", {
          method: "POST", headers: { authorization: `Bearer ${JEV_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ state, model: "jev-latest", questions }),
        });
        res.writeHead(r.status, { "content-type": "application/json", ...CORS }); res.end(await r.text());
      } catch (e) { res.writeHead(400, { "content-type": "application/json", ...CORS }); res.end(JSON.stringify({ error: String(e.message || e) })); }
    });
    return;
  }
  const map = { "/": "public/index.html", "/compare": "public/compare.html", "/jev.js": "public/jev.js", "/tierboard.js": "public/tierboard.js", "/presets.js": "public/presets.js" };
  const u = req.url.split("?")[0];
  const rel = map[u] || (/^\/fonts\/[\w.-]+\.(woff2|txt)$/.test(u) || /^\/img\/[\w./-]+\.(jpg|png|webp)$/.test(u) && !u.includes("..") ? "public" + u : null);
  if (!rel) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": rel.endsWith(".js") ? "text/javascript" : rel.endsWith(".woff2") ? "font/woff2" : rel.endsWith(".jpg") ? "image/jpeg" : rel.endsWith(".png") ? "image/png" : rel.endsWith(".txt") ? "text/plain" : "text/html", ...(rel.endsWith(".woff2") ? { "cache-control": "public, max-age=14400" } : {}) });
  fs.createReadStream(path.join(__dirname, rel)).pipe(res);
}).listen(PORT, () => console.log(`jevtier proxy → http://localhost:${PORT}`));
