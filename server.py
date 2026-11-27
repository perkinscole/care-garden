#!/usr/bin/env python3
"""
Simple HTTP server for CARE Garden that serves static files
and provides GET/POST /api/stats to persist smile data to stats.json.
"""

import json
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

STATS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stats.json')

MAX_BODY = 64 * 1024   # the stats are a few hundred bytes; refuse anything silly

class CareGardenHandler(SimpleHTTPRequestHandler):
    timeout = 10       # a client that stalls mid-request is dropped, not waited on
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
        self.end_headers()
        self.wfile.write(data.encode())

    def save_stats(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            return self.send_error(400, 'Bad Content-Length')
        if length <= 0 or length > MAX_BODY:
            return self.send_error(413 if length > MAX_BODY else 400, 'Bad body size')
        body = self.rfile.read(length)
        try:
            parsed = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self.send_error(400, 'Invalid JSON')
        # Only accept something shaped like the stats, so a truncated or
        # stray request can never wipe the counts
        if not isinstance(parsed, dict) or not isinstance(parsed.get('dailyCounts'), dict):
            return self.send_error(400, 'Not a stats object')
        # Write to a temporary file and swap it in, so a crash mid-write
        # cannot leave a half-written stats.json
        tmp = STATS_FILE + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(parsed, f)
        os.replace(tmp, STATS_FILE)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

if __name__ == '__main__':
    import sys
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000   # python3 server.py [port]
    # Local only: the kiosk's own browser is the one client
    server = ThreadingHTTPServer(('127.0.0.1', port), CareGardenHandler)
    print(f'CARE Garden server running at http://localhost:{port}')
    server.serve_forever()
