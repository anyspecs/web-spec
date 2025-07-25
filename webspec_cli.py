#!/usr/bin/env python3
"""
Web-Spec Python CLI 文件上传工具

功能特性:
- Google OAuth 认证（显示链接，用户手动点击）
- 自动处理OAuth回调（通过临时HTTP服务器）
- 60秒超时控制，提供友好提示
- 自动将认证信息保存到服务器数据库并获取JWT令牌
- 令牌本地缓存，支持自动续期
- 命令行界面友好，提供帮助和状态检查功能
"""

import os
import sys
import json
import time
import threading
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

# ==============================================================================
# 终端颜色和打印工具
# ==============================================================================
class Colors:
    """终端颜色定义"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_highlight(message):
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.END}")

# ==============================================================================
# WebSpecUploader
# ==============================================================================
class WebSpecUploader:
    """Web-Spec文件上传器，包含认证和上传逻辑"""
    
    def __init__(self):
        self.base_url = "http://localhost:5001"
        self.token_file = os.path.join(os.path.expanduser("~"), ".webspec_token")
        self.timeout_seconds = 60
        self.oauth_result = None
        self.callback_server = None
        self.server_thread = None

    # --- Token管理 ---
    def load_token(self):
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file, 'r') as f:
                    return json.load(f).get('token')
            except (json.JSONDecodeError, IOError):
                return None
        return None

    def save_token(self, token):
        try:
            with open(self.token_file, 'w') as f:
                json.dump({'token': token}, f)
            print_success(f"认证令牌已保存到 {self.token_file}")
        except IOError as e:
            print_warning(f"无法保存令牌: {e}")

    def clear_token(self):
        if os.path.exists(self.token_file):
            os.remove(self.token_file)
            print_success("本地认证令牌已清除")
        else:
            print_info("本地没有保存的认证令牌")

    def validate_token(self, token):
        if not token:
            return False
        try:
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(f"{self.base_url}/api/auth/validate", headers=headers, timeout=5)
            if response.status_code == 200 and response.json().get('valid'):
                user = response.json().get('user', {})
                print_success(f"令牌有效 - 用户: {user.get('name')} ({user.get('email')})")
                return True
            else:
                print_warning("令牌无效或已过期")
                return False
        except requests.RequestException:
            print_warning("无法验证令牌，可能服务器未运行")
            return False

    # --- OAuth 认证流程 ---
    class _OAuthCallbackHandler(BaseHTTPRequestHandler):
        def __init__(self, uploader, *args, **kwargs):
            self.uploader = uploader
            super().__init__(*args, **kwargs)

        def do_GET(self):
            parsed_url = urlparse(self.path)
            query = parse_qs(parsed_url.query)
            print(query)

        def log_message(self, format, *args):
            return

    def _start_callback_server(self, port):
        try:
            handler = lambda *args, **kwargs: self._OAuthCallbackHandler(self, *args, **kwargs)
            self.callback_server = HTTPServer(('localhost', port), handler)
            self.server_thread = threading.Thread(target=self.callback_server.serve_forever, daemon=True)
            self.server_thread.start()
            print_success(f"临时回调服务器已在 http://localhost:{port} 启动")
            return True
        except Exception as e:
            print_error(f"无法启动回调服务器: {e}")
            return False

    def _stop_callback_server(self):
        if self.callback_server:
            self.callback_server.shutdown()
            self.callback_server.server_close()
            print_info("临时回调服务器已关闭")

    def _get_auth_url(self, port):
        try:
            params = {'redirect_uri': f'http://localhost:{port}/auth/callback'}
            response = requests.get(f"{self.base_url}/api/auth/google/url", params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                print_error(f"获取认证链接失败: {response.status_code} - {response.text}")
                return None
        except requests.RequestException as e:
            print_error(f"无法连接后端获取认证链接: {e}")
            return None

    def _exchange_code_for_token(self, code, state, port):
        try:
            payload = {
                'code': code,
                'state': state,
                'redirect_uri': f'http://localhost:{port}/auth/callback'
            }
            response = requests.post(f"{self.base_url}/api/auth/google/callback", json=payload, timeout=20)
            if response.status_code == 200:
                print_success("成功从后端换取会话信息(包含JWT令牌)")
                return response.json()
            else:
                print_error(f"令牌交换失败: {response.status_code} - {response.text}")
                return None
        except requests.RequestException as e:
            print_error(f"令牌交换请求失败: {e}")
            return None

    def authenticate(self):
        print_highlight("🔐 需要认证，启动Google OAuth流程...")
        callback_port = 8888
        
        if not self._start_callback_server(callback_port):
            return None
        
        token = None
        # try:
        auth_info = self._get_auth_url(callback_port)
        if not auth_info or 'auth_url' not in auth_info:
            return None

        print("\n" + "="*50)
        print_info("请在浏览器中打开以下链接完成登录:")
        print(f"\n{Colors.GREEN}{auth_info['auth_url']}{Colors.END}\n")
        print_warning(f"链接将在 {self.timeout_seconds} 秒后超时。")
        print("="*50 + "\n")

        start_time = time.time()
        # 在这里，我们直接等待 self.oauth_result 被回调处理器填充
        while time.time() - start_time < self.timeout_seconds:
            if self.oauth_result is not None:
                break
            time.sleep(0.5)
        
        if self.oauth_result is None:
            print_error("认证超时，请重试。")
            return None
        
        if not self.oauth_result.get('success'):
            print_error(f"Google认证失败: {self.oauth_result.get('error', '未知错误')}")
            return None
        
    # --- 主流程 ---
    def run(self, file_to_upload):
        try:
            response = requests.get(f"{self.base_url}/health", timeout=3)
            if response.status_code != 200:
                raise requests.RequestException
            print_success("后端服务连接正常")
        except requests.RequestException:
            print_error(f"无法连接到后端服务 at {self.base_url}")
            print_info("请确保后端服务正在运行，然后再试。")
            return False

        token = self.load_token()
        
        if not token:
            print_error("无法获取有效的认证令牌，上传已取消。")
            return False

# ==============================================================================
# CLI 主函数
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Web-Spec Python CLI 文件上传工具",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
示例:
  python webspec_cli.py sample.specs        # 上传指定文件
  python webspec_cli.py --token             # 检查当前认证状态
  python webspec_cli.py --reset             # 清除本地认证信息
"""
    )
    parser.add_argument('file', nargs='?', help='要上传的文件路径 (例如: sample.specs)')
    parser.add_argument('--token', action='store_true', help='检查当前认证令牌的状态')
    parser.add_argument('--reset', action='store_true', help='清除本地保存的认证令牌')
    
    args = parser.parse_args()
    uploader = WebSpecUploader()

    if args.token:
        uploader.validate_token(uploader.load_token())
    elif args.reset:
        uploader.clear_token()
    elif args.file:
        success = uploader.run(args.file)
        sys.exit(0 if success else 1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 