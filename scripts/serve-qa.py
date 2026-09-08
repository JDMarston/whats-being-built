"""Serve the production build with the same CSP/headers as Netlify, for local QA."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tomllib

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--port', type=int, default=5181)
args = parser.parse_args()
headers = tomllib.loads((args.root / 'netlify.toml').read_text())['headers'][0]['values']

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in headers.items():
            self.send_header(name, value)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] in ('/review', '/review/'):
            self.path = '/index.html'
        super().do_GET()

ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(args.root / 'dist'))).serve_forever()
