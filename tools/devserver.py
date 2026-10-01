"""Static dev server with caching disabled (so edits show up on every reload).
Usage: python tools/devserver.py [port]"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):  # the game loads ~50 files per reload: keep the log to errors
        if len(args) > 1 and str(args[1])[:1] in '45':
            super().log_message(fmt, *args)


class Server(http.server.ThreadingHTTPServer):
    # the default backlog of 5 refused connections when a browser opened many at once (a random script then
    # failed to load: "PropArt is not defined"); daemon threads let Ctrl+C stop it at once
    request_queue_size = 128
    daemon_threads = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    Server(('127.0.0.1', port), NoCacheHandler).serve_forever()
