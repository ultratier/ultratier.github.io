#!/usr/bin/env bash
# Assemble docs/ for GitHub Pages: the compare page, the shared modules, the fonts, and the frozen
# presets. The page is marked static (a meta tag) so it reads docs/data/presets.json instead of
# calling a server; JEVIT_API (default https://monoproxy.com.au/api) is the live backend it may use
# for a visitor's own list. Run scripts/precompute.js first (needs `node server.js` running) to refresh data.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/fonts docs/data
cp public/jev.js public/tierboard.js public/presets.js docs/
cp public/fonts/*.woff2 public/fonts/OFL-ProxyMono.txt docs/fonts/
# absolute module/font paths -> relative, and the static flag
sed -e 's|from "/jev.js"|from "./jev.js"|; s|from "/tierboard.js"|from "./tierboard.js"|; s|from "/presets.js"|from "./presets.js"|' \
    -e 's|/fonts/proxymono-|./fonts/proxymono-|g' \
    -e "s|<meta name=\"theme-color\" content=\"#000000\">|<meta name=\"theme-color\" content=\"#000000\">\n<meta name=\"jevit-static\" content=\"1\">\n<meta name=\"jevit-api\" content=\"${JEVIT_API:-https://monoproxy.com.au/api}\">|" \
    public/compare.html > docs/index.html
touch docs/.nojekyll
echo "docs/ ready: $(ls docs | tr '\n' ' ')"
