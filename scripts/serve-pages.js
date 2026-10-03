// Serve docs/ exactly as GitHub Pages would (static files, nothing else) for a local look.
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "docs"), port = process.env.PORT || 8008;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".txt": "text/plain", ".png": "image/png" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`pages preview http://localhost:${port}`));
