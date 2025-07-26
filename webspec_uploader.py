#!/usr/bin/env python3
"""
Web-Spec Python CLI Uploader
"""
import os
import sys
import json
import time
import hashlib
import threading
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

def print_colored(color, *args):
    print(" ".join(map(str, args)))

class WebSpecUploader:
    def __init__(self):
        self.base_url = "http://localhost:5001"
        self.session = requests.Session()  # Use a session object to persist cookies
        self.token_file = os.path.join(os.path.expanduser("~"), ".webspec_token.json")
        self.timeout = 120  # 2-minute timeout
        self.oauth_result = None
        self.callback_server = None
    
    def _api_request(self, method, endpoint, **kwargs):
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.setdefault("headers", {})
        token = self.load_token()
        if token:
            headers['Authorization'] = f"Bearer {token}"
        
        try:
            # Use the session object for all requests
            response = self.session.request(method, url, timeout=20, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"API Error: {e.response.status_code}", e.response.text)
        except requests.exceptions.RequestException as e:
            print(f"Connection Error: {e}")
        return None

    def load_token(self):
        if os.path.exists(self.token_file):
            with open(self.token_file, 'r') as f:
                return json.load(f).get('token')
        return None

    def save_token(self, data):
        with open(self.token_file, 'w') as f:
            json.dump(data, f)
        print("✔ Authentication token saved.")

    def clear_token(self):
        if os.path.exists(self.token_file):
            os.remove(self.token_file)
            print("Authentication token cleared.")

    def validate_token(self):
        print("Verifying existing token...")
        if not self.load_token():
            print("No token found.")
            return False
        
        data = self._api_request("get", "/api/auth/validate")
        if data and data.get('valid'):
            user = data.get('user', {})
            print(f"✔ Token valid for user: {user.get('name')} ({user.get('email')})")
            return True
        print("Token is invalid or expired.")
        return False

    class _CallbackHandler(BaseHTTPRequestHandler):
        def __init__(self, uploader, *args, **kwargs):
            self.uploader = uploader
            super().__init__(*args, **kwargs)

        def do_GET(self):
            query = parse_qs(urlparse(self.path).query)
            self.uploader.oauth_result = query
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>Authentication Successful!</h1><p>You can close this window.</p>")
        
        def log_message(self, format, *args): return

    def _start_server(self, port):
        handler = lambda *args, **kwargs: self._CallbackHandler(self, *args, **kwargs)
        self.callback_server = HTTPServer(('localhost', port), handler)
        threading.Thread(target=self.callback_server.serve_forever, daemon=True).start()
        print(f"✔ Callback server started on port {port}.")

    def _stop_server(self):
        if self.callback_server:
            self.callback_server.shutdown()
            print("Callback server stopped.")

    def authenticate(self):
        callback_port = 8888
        self._start_server(callback_port)
        
        try:
            auth_data = self._api_request("get", "/api/auth/google/url", params={'redirect_uri': f'http://localhost:{callback_port}/auth/callback'})
            if not auth_data: return False

            print("\n" + " ACTION REQUIRED ".center(50, "="))
            print("Please open this URL in your browser to authenticate:")
            print(auth_data['auth_url'])
            print("="*50 + "\n")

            start_time = time.time()
            while time.time() - start_time < self.timeout:
                if self.oauth_result: break
                time.sleep(1)
            
            if not self.oauth_result:
                print("Authentication timed out.")
                return False

            code = self.oauth_result['code'][0]
            print("Exchanging code for token...")
            
            session_data = self._api_request("post", "/api/auth/google/callback", json={
                'code': code,
                'redirect_uri': f'http://localhost:{callback_port}/auth/callback'
            })

            if session_data and session_data.get('success'):
                self.save_token(session_data)
                user = session_data.get('user', {})
                print(f"✔ Successfully authenticated as {user.get('name')}.")
                return True
        finally:
            self._stop_server()
        return False

    def upload_file(self, file_path):
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return

        filename = os.path.basename(file_path)
        print(f"Uploading '{filename}'...")

        try:
            with open(file_path, 'rb') as f:
                # The server will handle naming, we just send the file
                files = {'file': (filename, f, 'application/octet-stream')}
                data = self._api_request("post", "/api/upload", files=files)
            
            if data and data.get('success'):
                info = data.get('file_info', {})
                print(f"✔ Upload successful!")
                print(f"  -> Original Name: {info.get('original_name')}")
                print(f"  -> Saved Name: {info.get('saved_name')}")
                print(f"  -> Stored at: {info.get('storage_path')}")
            else:
                print("Upload failed.")
        except Exception as e:
            print(f"An error occurred during upload: {e}")

    def run(self, args):
        if args.reset:
            return self.clear_token()
        
        if not self.validate_token():
            if not self.authenticate():
                return
        
        if args.file:
            self.upload_file(args.file)

def main():
    parser = argparse.ArgumentParser(description="Web-Spec Python CLI Uploader.")
    parser.add_argument('file', nargs='?', help='Path to the .json file to upload.')
    parser.add_argument('--reset', action='store_true', help='Clear saved authentication token.')
    args = parser.parse_args()
    
    uploader = WebSpecUploader()
    uploader.run(args)

if __name__ == "__main__":
    main() 