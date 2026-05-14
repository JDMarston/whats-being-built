param(
  [int]$Port = 5173,
  [string]$HostName = "0.0.0.0"
)

$env:WBB_PORT = $Port
$env:WBB_HOST = $HostName

node -e @'
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = Number(process.env.WBB_PORT || 5173);
const host = process.env.WBB_HOST || '0.0.0.0';
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, 'Not found');
      return;
    }

    send(res, 200, data, types[path.extname(filePath)] || 'application/octet-stream');
  });
}).listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`Local:   http://127.0.0.1:${port}`);
  console.log(`Network: http://YOUR_PC_IP:${port}`);
  console.log('Press Ctrl+C to stop.');
});
'@
