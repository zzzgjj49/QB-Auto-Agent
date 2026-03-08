import http.server
import ssl
import os

# Generate a self-signed certificate if it doesn't exist
if not os.path.exists("server.pem"):
    print("Generating self-signed certificate...")
    try:
        # Try using openssl if available (standard on Git Bash / WSL / some Windows)
        os.system('openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes -subj "/CN=localhost"')
    except:
        print("Warning: Could not generate certificate automatically. Please ensure 'server.pem' exists.")

print("Starting HTTPS server on https://localhost:8000")
print("NOTE: You will see a security warning in the browser because the certificate is self-signed.")
print("Click 'Advanced' -> 'Proceed to localhost (unsafe)' to continue.")

server_address = ('localhost', 8000)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Wrap the socket with SSL
try:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile='server.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()
except FileNotFoundError:
    print("\n[ERROR] 'server.pem' not found!")
    print("Please generate a certificate manually or install OpenSSL.")
    print("Command: openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes")
except Exception as e:
    print(f"\n[ERROR] {e}")
