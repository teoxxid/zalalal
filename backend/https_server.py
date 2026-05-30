import http.server
import ssl
import socketserver
import requests
import os

BACKEND_URL = "http://127.0.0.1:8000"
PROXY_PORT = 8443

CERTS_DIR = os.path.join(os.path.dirname(__file__), 'certs')
CERT_FILE = os.path.join(CERTS_DIR, '192.168.0.103+3.pem')
KEY_FILE = os.path.join(CERTS_DIR, '192.168.0.103+3-key.pem')

ALLOWED_ORIGINS = [
    "https://192.168.56.1:5174",
    "https://192.168.0.103:5173",
    "https://localhost:5173",
    "https://teoxxid.github.io",
]

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        """Обработка preflight CORS-запросов"""
        origin = self.headers.get('Origin', '')
        if origin in ALLOWED_ORIGINS:
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRFToken, X-Requested-With')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Access-Control-Max-Age', '86400')
            self.end_headers()
        else:
            self.send_response(403)
            self.end_headers()
    
    def do_GET(self):
        self.proxy_request("GET")
    
    def do_POST(self):
        self.proxy_request("POST")
    
    def do_PUT(self):
        self.proxy_request("PUT")
    
    def do_DELETE(self):
        self.proxy_request("DELETE")
    
    def proxy_request(self, method):
        try:
            origin = self.headers.get('Origin', '')
            url = f"{BACKEND_URL}{self.path}"
            
            headers = {k: v for k, v in self.headers.items() 
                      if k.lower() not in ['host', 'connection']}
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            resp = requests.request(
                method=method,
                url=url,
                headers=headers,
                data=body,
                verify=False,
                allow_redirects=False,
                timeout=30
            )
            
            self.send_response(resp.status_code)
            
            for k, v in resp.headers.items():
                if k.lower() in [
                    'access-control-allow-origin',
                    'access-control-allow-credentials',
                    'access-control-expose-headers',
                    'access-control-allow-headers',
                    'access-control-allow-methods',
                    'vary',
                ]:
                    self.send_header(k, v)
            
            if origin in ALLOWED_ORIGINS:
                if 'Access-Control-Allow-Origin' not in resp.headers:
                    self.send_header('Access-Control-Allow-Origin', origin)
                if 'Access-Control-Allow-Credentials' not in resp.headers:
                    self.send_header('Access-Control-Allow-Credentials', 'true')
            
            for k, v in resp.headers.items():
                if k.lower() not in [
                    'transfer-encoding', 'content-length', 'connection', 
                    'keep-alive', 'access-control-allow-origin',
                    'access-control-allow-credentials'
                ]:
                    self.send_header(k, v)
            
            self.end_headers()
            self.wfile.write(resp.content)
            
        except Exception as e:
            self.send_error(502, f"Proxy error: {e}")
            print(f"Proxy error: {e}")
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
        print(f"Сертификаты не найдены:\n  {CERT_FILE}\n  {KEY_FILE}")
        print("Запустите: mkcert 192.168.0.103 192.168.56.1 localhost 127.0.0.1")
        exit(1)
    
    httpd = socketserver.TCPServer(("0.0.0.0", PROXY_PORT), ProxyHandler)
    
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"HTTPS proxy running on https://0.0.0.0:{PROXY_PORT}")
    print(f"Forwarding to {BACKEND_URL}")
    print(f"CORS origins: {ALLOWED_ORIGINS}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        httpd.shutdown()