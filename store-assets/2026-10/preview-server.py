from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

EXPORT = Path('/private/tmp/registerbox-store-export')
ASSETS = Path('/Users/bhavnaosthwal/Desktop/registerbox/store-assets/2026-10')
ROOT = Path('/Users/bhavnaosthwal/Desktop/registerbox')
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        name = urlsplit(path).path
        special = {'/gallery.html': ASSETS/'gallery.html', '/campaign-background.png': ASSETS/'campaign-background.png', '/brand.png': ROOT/'assets/images/registerbox-app-icon.png', '/new-business.png': ROOT/'assets/images/action-icons/new-business.png'}
        if name in special: return str(special[name])
        if name == '/contact-sheet.html': return str(ASSETS/'contact-sheet.html')
        if name.startswith('/screenshots/'): return str(ASSETS/name.lstrip('/'))
        candidate = EXPORT/name.lstrip('/')
        if candidate.is_dir(): candidate = candidate/'index.html'
        if not candidate.exists() and candidate.with_suffix('.html').exists(): candidate = candidate.with_suffix('.html')
        return str(candidate)
ThreadingHTTPServer(('127.0.0.1', 8786), Handler).serve_forever()
