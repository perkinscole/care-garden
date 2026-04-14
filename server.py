#!/usr/bin/env python3
"""
Simple HTTP server for CARE Garden that serves static files
and provides GET/POST /api/stats to persist smile data to stats.json.
"""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

STATS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stats.json')

class CareGardenHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/stats':
            self.send_stats()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/stats':
            self.save_stats()
        else:
            self.send_error(404)

    def send_stats(self):
        try:
            with open(STATS_FILE, 'r') as f:
                data = f.read()
        except FileNotFoundError:
            data = '{}'
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data.encode())

    def save_stats(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            # Validate it's proper JSON before saving
            parsed = json.loads(body)
            with open(STATS_FILE, 'w') as f:
                json.dump(parsed, f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except json.JSONDecodeError:
            self.send_error(400, 'Invalid JSON')

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('', 8000), CareGardenHandler)
    print('CARE Garden server running at http://localhost:8000')
    server.serve_forever()
