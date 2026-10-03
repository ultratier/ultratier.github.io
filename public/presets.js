// Starter lists. Each is a thing people compare but rarely know well (where a ranking on facts
// beats a ranking on reputation), and every item has a Wikipedia page so the facts arrive without a
// paid search key. `chips` are the criteria offered for that category; `on` lists the ones that start
// selected (default: the first chip). `facts` (optional, per item) are curated spec lines that replace
// the lookup, for things Wikipedia only covers at series level.
export const PRESETS = [
  { label: "compact cameras", category: "compact cameras",
    items: ["Ricoh GR IV", "Fujifilm X100VI", "Panasonic Lumix S9", "Sony RX1R III", "Canon PowerShot G7 X Mark III", "Leica Q3"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "Ricoh GR IV": "https://ricoh-imaging.eu/cdn/shop/files/002_front_on_47e65fb0-c6e9-48f9-8d29-65ebcc60325e.jpg?v=1765901145&width=1200",
      "Fujifilm X100VI": "https://fujifilm-x.b-cdn.net/wp-content/uploads/2024/02/stjw_x100vi_thum.jpg",
      "Panasonic Lumix S9": "https://shop.panasonic.com/cdn/shop/files/S9_N-KIT_front_K_030db3ad-4022-4739-b99c-f5cfd3622504.jpg?v=1779314505&width=1200",
      "Sony RX1R III": "https://sony.scene7.com/is/image/sonyglobalsolutions/DSC-RX1RM3_product_01?$productIntroPlateImageDesktop$",
      "Canon PowerShot G7 X Mark III": "https://asia.canon/media/image/2019/07/08/8d0db401031e4decbdf0d82dce54c796_G7+X+mkIII+BK+Front.png",
      "Leica Q3": "https://leica-camera.com/sites/default/files/styles/meta_tag_product_image/public/pm-19548-19080_Leica_Q3_front_1920x1440.png?itok=Qru2Se13"
    },
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
    chips: ["image quality", "travel friendly", "value for money", "JPEG look", "video", "beginner friendly"],
    on: ["image quality", "travel friendly", "JPEG look"] },
  { label: "phones", category: "smartphones",
    items: ["iPhone 18 Pro Max", "iPhone 17 Pro", "Samsung Galaxy S25 Ultra", "Huawei Mate 70 Pro", "LG Wing", "Nothing Phone 3"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "iPhone 18 Pro Max": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-18-pro-max-finish-select-burgundy-202609?wid=940&hei=1112&fmt=jpeg&qlt=90",
      "iPhone 17 Pro": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-pro-finish-select-cosmicorange-202509?wid=940&hei=1112&fmt=jpeg&qlt=90",
      "Samsung Galaxy S25 Ultra": "https://images.samsung.com/au/smartphones/galaxy-s25-ultra/images/galaxy-s25-ultra-features-colors-titanium-silverblue.jpg",
      "Huawei Mate 70 Pro": "https://consumer.huawei.com/content/dam/huawei-cbg-site/cn/mkt/pdp/phones/mate70-pro/list/green.png",
      "LG Wing": "https://media.us.lg.com/transform/ecomm-PDPGallery-1100x730/4fa5b964-fd39-40aa-905d-3abe357a1e5b/md07518569-zoom-09-jpg?io=transform:fill,width:1200",
      "Nothing Phone 3": "https://cdn.shopify.com/s/files/1/0376/5420/0459/files/0000s_0011_Phone-3-white.png?v=1753434595&width=1200"
    },
    chips: ["camera", "battery life", "value for money", "software support", "size and weight"],
    on: ["camera", "battery life"] },
  { label: "laptops", category: "laptops",
    items: ["MacBook Air M4", "Dell XPS 13", "ThinkPad X1 Carbon", "Microsoft Surface Laptop 7", "Framework Laptop 13"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "MacBook Air M4": "https://www.apple.com/newsroom/images/2025/03/apple-introduces-the-new-macbook-air-with-the-m4-chip-and-a-sky-blue-color/article/Apple-MacBook-Air-hero-250305_big.jpg.large.jpg",
      "Dell XPS 13": "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/9345/media-gallery/touch/silver/notebook-xps-13-9345-t-silver-gallery-4.psd?fmt=jpg&wid=1200&hei=800&bgc=255,255,255",
      "ThinkPad X1 Carbon": "https://p2-ofp.static.pub/ShareResource/optimized/pdp/thinkpad/thinkpad-x1-series/len101t0108/lenovo-thinkpad-x1-carbon-gen-13-14-intel-gallery-1.png?width=1200",
      "Microsoft Surface Laptop 7": "https://cdn-dynmedia-1.microsoft.com/is/image/microsoftcorp/13-8-laptop-platinum-right-render-fy25:VP4-1260x795",
      "Framework Laptop 13": "https://images.frame.work/frameworkmarketplace/Z4g0s5bqstJ99gnC_5A-FW13-prebuilt-edition.jpg?auto=compress&fm=jpg&w=1280"
    },
    chips: ["battery life", "value for money", "repairability", "performance", "portability"],
    on: ["battery life", "portability"] },
  { label: "small EVs", category: "electric cars",
    items: ["Tesla Model 3", "Mini Electric", "MG4 EV", "Hyundai Kona Electric", "Kia EV3"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "Tesla Model 3": "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png",
      "MG4 EV": "https://www.mg.co.uk/sites/default/files/2026-01/MG4%20MCE_Premium%20Trim_Long%20Range_LHD_Ealing%20Green_cut%20out_559x279px.png",
      "Hyundai Kona Electric": "https://s7d1.scene7.com/is/image/hyundai/2025-kona-ev-limited-fwd-meta-blue-pearl-vehicle-browse-hero?wid=1200&fmt=png-alpha",
      "Kia EV3": "https://www.kia.com/content/dam/kwcms/au/en/images/showroom/ev3/360vr/clear-white/Kia-ev3-GT-clear-white_00003.png"
    },
    chips: ["range", "value for money", "charging speed", "practicality", "safety"],
    on: ["range", "value for money"] },
  { label: "game consoles", category: "game consoles",
    items: ["PlayStation 5", "Xbox Series X", "Nintendo Switch 2", "Steam Deck", "Nintendo Switch"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "PlayStation 5": "https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-edition-left-image-block-01-en-24jun24?fmt=jpg&wid=1200",
      "Xbox Series X": "https://cms-assets.xboxservices.com/assets/bc/40/bc40fdf3-85a6-4c36-af92-dca2d36fc7e5.png?n=642227_Hero-Gallery-0_A1_857x676.png",
      "Nintendo Switch 2": "https://assets.nintendo.com/image/upload/b_white,c_pad,w_1200,h_1200/f_jpg/q_auto/ncom/My%20Nintendo%20Store/EN-US/Nintendo%20Switch%202/Hardware/123669-nintendo-switch-2-tabletop-2000x2000",
      "Steam Deck": "https://cdn.akamai.steamstatic.com/steamdeck/images/press/renderings/press_oled_front_thumb_english.jpg",
      "Nintendo Switch": "https://assets.nintendo.com/image/upload/b_white,c_pad,w_1200,h_675/f_jpg/q_auto/ncom/en_US/products/hardware/nintendo-switch-oled-model-white-set/115461-switch-oled-white-console-front-1200x675"
    },
    chips: ["for families", "value for money", "game library", "portability", "performance"],
    on: ["game library", "for families"] },
  { label: "board games", category: "board games",
    items: ["Catan", "Ticket to Ride", "Wingspan", "Azul", "Pandemic", "Carcassonne"],
    // Each maker's own product shot, linked directly from the maker's site. Nothing is stored here;
    // an item without an entry falls back to the Wikipedia lead image.
    images: {
      "Catan": "https://www.catan.com/sites/default/files/2025-04/3DBox_CATAN_BaseGame_NE.png",
      "Ticket to Ride": "https://store.asmodee.com/cdn/shop/files/DOW7201N-image0_2000.jpg?v=1749737534&width=1200",
      "Wingspan": "https://stonemaiergames.com/wp-content/uploads/2026/04/3d-wingspan-860x1024.webp",
      "Azul": "https://store.asmodee.com/cdn/shop/products/NM6010-1.jpg?v=1690217148",
      "Pandemic": "https://store.asmodee.com/cdn/shop/products/ZM7101-1.jpg?v=1690222944",
      "Carcassonne": "https://store.asmodee.com/cdn/shop/products/ZM7810-1.jpg?v=1690217588"
    },
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
