// Tier-list interaction shared by index.html and compare.html.
// The board is plain HTML: .tier[data-tier] > .items > .card[data-id]. This module makes the cards
// movable (HTML5 drag-and-drop, plus tap a card then tap a row for touch/keyboard) and reports moves.
export function enableTierBoard(board, { onMove } = {}) {
  if (board.dataset.tb) return; board.dataset.tb = "1";
  let sel = null, dragging = null;
  const cardOf = e => e.target.closest?.(".card");
  const tierOf = e => e.target.closest?.(".tier");
  const prep = () => board.querySelectorAll(".card").forEach(c => { c.draggable = true; c.tabIndex = 0; });
  new MutationObserver(prep).observe(board, { childList: true, subtree: true }); prep();

  function place(card, tier, x) {
    const items = tier.querySelector(".items");
    const cards = [...items.querySelectorAll(".card")].filter(c => c !== card);
    const before = x == null ? null : cards.find(c => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2 && Math.abs(r.top + r.height / 2 - place.y) < r.height; });
    items.insertBefore(card, before || null);
  }
  function move(card, tier, e) {
    const from = card.closest(".tier")?.dataset.tier;
    place.y = e?.clientY; place(card, tier, e?.clientX);
    clearSel();
    if (from !== tier.dataset.tier) onMove?.(card.dataset.id, tier.dataset.tier, from);
  }
  function clearSel() { sel?.classList.remove("sel"); sel = null; board.classList.remove("picking"); }

  board.addEventListener("dragstart", e => { const c = cardOf(e); if (!c) return; dragging = c; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", c.dataset.id); } catch {} });
  board.addEventListener("dragend", () => { dragging?.classList.remove("dragging"); dragging = null; board.querySelectorAll(".tier.over").forEach(t => t.classList.remove("over")); });
  board.addEventListener("dragover", e => { const t = tierOf(e); if (!t || !dragging) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; board.querySelectorAll(".tier.over").forEach(x => x !== t && x.classList.remove("over")); t.classList.add("over"); });
  board.addEventListener("dragleave", e => { const t = tierOf(e); if (t && !t.contains(e.relatedTarget)) t.classList.remove("over"); });
  board.addEventListener("drop", e => { const t = tierOf(e); if (!t || !dragging) return; e.preventDefault(); t.classList.remove("over"); move(dragging, t, e); });

  // tap / keyboard: select a card, then choose a row (its label) — works on phones where DnD doesn't
  board.addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const c = cardOf(e);
    if (c) { if (sel === c) return clearSel(); clearSel(); sel = c; c.classList.add("sel"); board.classList.add("picking"); return; }
    const t = tierOf(e); if (t && sel) move(sel, t);
  });
  board.addEventListener("keydown", e => {
    const c = cardOf(e); if (!c) return;
    const tiers = [...board.querySelectorAll(".tier")], i = tiers.indexOf(c.closest(".tier"));
    if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); move(c, tiers[i - 1]); c.focus(); }
    if (e.key === "ArrowDown" && i < tiers.length - 1) { e.preventDefault(); move(c, tiers[i + 1]); c.focus(); }
    if (e.key === "Escape") clearSel();
  });
  document.addEventListener("keydown", e => e.key === "Escape" && clearSel());
}

// CSS that both pages share for the interaction states
export const TIERBOARD_CSS = `
.tier[data-tier]{transition:box-shadow .15s}
.tier .lbl{cursor:default}
.card{cursor:grab;transition:transform .12s,box-shadow .12s;user-select:none}
.card:active{cursor:grabbing}
.card.dragging{opacity:.4}
.card.sel{outline:2px solid var(--accent);outline-offset:2px}
.card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tier.over{box-shadow:inset 0 0 0 2px var(--accent)}
.picking .tier{cursor:pointer}
.picking .tier .lbl{cursor:pointer;box-shadow:inset 0 0 0 3px rgba(0,0,0,.35)}
.card.edited b::after{content:" ✎";font-weight:400;color:var(--muted);font-size:12px}
.tbhint{color:var(--muted);font-size:12px;margin:6px 0 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.tbhint button{margin:0;padding:4px 10px;font-size:12px}
`;

// helpers for keeping "what Jev said" separate from "what the user moved"
export function applyOverrides(results, overrides) {
  return results.map(r => overrides[r.label] && overrides[r.label] !== r.tier ? { ...r, tier: overrides[r.label], edited: true, jevTier: r.tier } : r);
}
// compact, URL-safe encoding of shareable state
export const encodeState = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const decodeState = s => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))); } catch { return null; } };
