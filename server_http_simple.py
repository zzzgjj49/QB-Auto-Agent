import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

# Allow reusing the port immediately
socketserver.TCPServer.allow_reuse_address = True

print(f"Starting HTTP server at http://localhost:{PORT}")
print("Note: Voice features will NOT work in HTTP mode (browser security restriction).")
print("Use this only for viewing the 3D model.")

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except OSError as e:
    print(f"Error: {e}")
    print(f"Port {PORT} is likely busy. Stop the other server first.")
