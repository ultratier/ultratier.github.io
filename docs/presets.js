// Starter lists. Each is a thing people compare but rarely know well (where a ranking on facts
// beats a ranking on reputation), and every item has a Wikipedia page so the facts arrive without a
// paid search key. `chips` are the criteria offered for that category; `on` lists the ones that start
// selected (default: the first chip). `facts` (optional, per item) are curated spec lines that replace
// the lookup, for things Wikipedia only covers at series level.
export const PRESETS = [
  { label: "compact cameras", category: "compact cameras",
    items: ["Ricoh GR IV", "Fujifilm X100VI", "Panasonic Lumix S9", "Sony RX1R III", "Canon PowerShot G7 X Mark III", "Leica Q3"],
    // Wikipedia only has series-level pages for most of these, so the facts Jev sees would be a decade
    // stale. Curated spec lines win over the lookup when present. Keep them factual and comparable.
    facts: {
      "Ricoh GR IV": ["released 2025", "25.7MP APS-C sensor, no low-pass filter", "28mm-equivalent f/2.8 fixed lens, new optical design, the GR lens is renowned for sharpness", "5-axis in-body stabilisation", "53GB internal storage", "Image Control profiles (Positive Film, Negative Film and more) with a cult following for straight-out-of-camera JPEGs", "Snap focus", "the benchmark pocket camera, about 262g", "video: Full HD only, a stills camera"],
      "Fujifilm X100VI": ["released 2024", "40MP APS-C X-Trans sensor", "23mm f/2 fixed lens (35mm-equivalent)", "in-body stabilisation", "hybrid optical/electronic viewfinder", "20 Film Simulations for straight-out-of-camera JPEGs", "video: 6.2K on paper but rarely used for video, fixed 35mm lens, treated as a stills camera", "about 521g"],
      "Panasonic Lumix S9": ["released 2024", "24MP full-frame sensor", "interchangeable L-mount lenses", "no viewfinder", "Real Time LUT colour profiles", "video: built for it, V-Log, 6K open gate, 4K 60p, in-body stabilisation, Panasonic's log and colour profiles are the reference in this class", "about 403g body only"],
      "Sony RX1R III": ["released 2025", "61MP full-frame sensor", "35mm f/2 Zeiss fixed lens", "Creative Look colour profiles", "fixed rear screen", "video: secondary, no in-body stabilisation, a stills camera", "about 498g"],
      "Canon PowerShot G7 X Mark III": ["released 2019", "20MP 1-inch sensor", "24-100mm-equivalent f/1.8-2.8 zoom", "video: 4K 30p with a crop, microphone input, flip-up screen, popular with vloggers", "Picture Style colour profiles", "about 304g"],
      "Leica Q3": ["released 2023", "60MP full-frame sensor", "28mm f/1.7 Summilux fixed lens", "video: 8K on paper but poor in practice, heavy rolling shutter from the slow sensor readout, no microphone input, not stabilised for video, a stills camera", "Leica Looks colour profiles", "tilting screen", "about 743g"]
    },
    // Official product shots where the maker's site had a clean one; copies live in docs/img so they
    // cannot vanish. The rest fall back to the Wikipedia lead image.
    images: {
      "Ricoh GR IV": "https://ultratier.github.io/img/cameras/ricoh-gr-iv.jpg",
      "Sony RX1R III": "https://ultratier.github.io/img/cameras/sony-rx1r-iii.jpg",
      "Canon PowerShot G7 X Mark III": "https://ultratier.github.io/img/cameras/canon-g7x-iii.jpg"
    },
    chips: ["image quality", "travel friendly", "value for money", "JPEG look", "video", "beginner friendly"],
    on: ["image quality", "travel friendly", "JPEG look"] },
  { label: "phones", category: "smartphones",
    items: ["iPhone 18 Pro Max", "iPhone 17 Pro", "Samsung Galaxy S25 Ultra", "Huawei Mate 70 Pro", "LG Wing", "Nothing Phone 3"],
    chips: ["camera", "battery life", "value for money", "software support", "size and weight"],
    on: ["camera", "battery life"] },
  { label: "laptops", category: "laptops",
    items: ["MacBook Air M4", "Dell XPS 13", "ThinkPad X1 Carbon", "Microsoft Surface Laptop 7", "Framework Laptop 13"],
    chips: ["battery life", "value for money", "repairability", "performance", "portability"],
    on: ["battery life", "portability"] },
  { label: "small EVs", category: "electric cars",
    items: ["Tesla Model 3", "Mini Electric", "MG4 EV", "Hyundai Kona Electric", "Kia EV3"],
    chips: ["range", "value for money", "charging speed", "practicality", "safety"],
    on: ["range", "value for money"] },
  { label: "game consoles", category: "game consoles",
    items: ["PlayStation 5", "Xbox Series X", "Nintendo Switch 2", "Steam Deck", "Nintendo Switch"],
    chips: ["for families", "value for money", "game library", "portability", "performance"],
    on: ["game library", "for families"] },
  { label: "board games", category: "board games",
    items: ["Catan", "Ticket to Ride", "Wingspan", "Azul", "Pandemic", "Carcassonne"],
    chips: ["for families", "strategy depth", "replayability", "for two players", "easy to learn"],
    on: ["for families", "easy to learn"] },
];

// Curated facts and images from a preset replace what the lookup found (series-level pages are stale).
export function applyPresetFacts(items, category) {
  const p = PRESETS.find(p => p.category === category); if (!p || (!p.facts && !p.images)) return items;
  return items.map(it => { const f = p.facts?.[it.name], img = p.images?.[it.name];
    const out = img ? { ...it, image: img } : it;
    return f ? { ...out, facts: f, summary: "", curated: true, line: [it.name, ...f].join(" · ") } : out; });
}
