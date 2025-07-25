#!/usr/bin/env python3
"""
完整的上传功能测试脚本 - 包含用户认证
通过直接在数据库中创建测试用户来模拟登录状态
"""

import os
import sys
import sqlite3
import uuid
import json
import tempfile
import requests
import time
from datetime import datetime, timedelta

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 导入应用相关模块
from app import generate_jwt_token, init_db, DATABASE

# 测试配置
BASE_URL = "http://localhost:5001"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_NAME = "测试用户"

class UploadTester:
    def __init__(self):
        self.test_user = None
        self.test_token = None
        
    def setup_test_user(self):
        """在数据库中创建测试用户"""
        print("📝 创建测试用户...")
        
        # 确保数据库初始化
        init_db()
        
        user_uuid = str(uuid.uuid4())
        
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 删除可能存在的测试用户
            cursor.execute('DELETE FROM users WHERE email = ?', (TEST_USER_EMAIL,))
            
            # 创建新的测试用户
            cursor.execute('''
                INSERT INTO users (uuid, email, name, avatar_url, provider, provider_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_uuid,
                TEST_USER_EMAIL,
                TEST_USER_NAME,
                "https://example.com/avatar.jpg",
                "google",
                "test_provider_id_123"
            ))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            # 获取创建的用户信息
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            user = cursor.fetchone()
            
            self.test_user = dict(user)
            print(f"✅ 测试用户创建成功: {self.test_user['email']} (UUID: {self.test_user['uuid']})")
            
            return self.test_user
    
    def generate_test_token(self):
        """为测试用户生成JWT令牌"""
        if not self.test_user:
            raise Exception("请先创建测试用户")
        
        print("🔑 生成JWT令牌...")
        self.test_token = generate_jwt_token(self.test_user)
        print(f"✅ JWT令牌生成成功: {self.test_token[:50]}...")
        
        return self.test_token
    
    def test_server_health(self):
        """测试服务器健康状况"""
        print("\n🏥 测试服务器健康状况...")
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print("✅ 服务器运行正常")
                return True
            else:
                print(f"❌ 服务器响应异常: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ 无法连接到服务器")
            return False
        except Exception as e:
            print(f"❌ 健康检查失败: {e}")
            return False
    
    def test_token_validation(self):
        """测试JWT令牌验证"""
        print("\n🔍 测试JWT令牌验证...")
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/api/auth/validate", headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"✅ 令牌验证成功: {user_data['user']['email']}")
                return True
            else:
                print(f"❌ 令牌验证失败: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 令牌验证请求失败: {e}")
            return False
    
    def test_file_upload(self):
        """测试文件上传功能"""
        print("\n📤 测试文件上传功能...")
        
        # 创建测试文件
        test_content = f"""# 测试文档 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

这是一个测试文档，用于验证上传功能。

## 项目信息
- 测试用户: {TEST_USER_NAME}
- 测试邮箱: {TEST_USER_EMAIL}
- 上传时间: {datetime.now().isoformat()}

## 功能测试
- ✅ 用户认证
- ✅ 文件上传
- 🔄 .specs文件生成

```python
def test_function():
    print("Hello, Web-Spec!")
    return "测试成功"
```

## 下一步
验证上传的文件是否正确保存并生成了对应的.specs文件。
"""
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
            f.write(test_content)
            test_file_path = f.name
        
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            
            with open(test_file_path, 'rb') as f:
                files = {'file': (os.path.basename(test_file_path), f, 'text/markdown')}
                response = requests.post(f"{BASE_URL}/api/upload", 
                                       files=files, 
                                       headers=headers)
            
            if response.status_code == 200:
                upload_result = response.json()
                print("✅ 文件上传成功!")
                print(f"   原始文件名: {upload_result['file_info']['original_name']}")
                print(f"   保存文件名: {upload_result['file_info']['saved_name']}")
                print(f"   时间戳: {upload_result['file_info']['timestamp']}")
                print(f"   文件大小: {upload_result['file_info']['size']} bytes")
                print(f"   访问URL: {upload_result['file_info']['access_url']}")
                
                return upload_result
            else:
                print(f"❌ 文件上传失败: {response.status_code}")
                print(f"   响应内容: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 文件上传请求失败: {e}")
            return None
        finally:
            # 清理临时文件
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
    
    def test_specs_access(self, upload_result):
        """测试.specs文件访问"""
        if not upload_result:
            print("❌ 没有上传结果，跳过.specs文件访问测试")
            return False
        
        print("\n📄 测试.specs文件访问...")
        
        access_url = upload_result['file_info']['access_url']
        full_url = f"{BASE_URL}{access_url}"
        
        try:
            response = requests.get(full_url)
            
            if response.status_code == 200:
                specs_content = response.json()
                print("✅ .specs文件访问成功!")
                print(f"   版本: {specs_content.get('version', 'N/A')}")
                print(f"   项目名称: {specs_content.get('metadata', {}).get('name', 'N/A')}")
                print(f"   任务类型: {specs_content.get('metadata', {}).get('task_type', 'N/A')}")
                print(f"   创建时间: {specs_content.get('metadata', {}).get('createdAt', 'N/A')}")
                print(f"   资产数量: {len(specs_content.get('assets', {}).get('files', {}))}")
                print(f"   历史记录数量: {len(specs_content.get('history', []))}")
                
                return specs_content
            else:
                print(f"❌ .specs文件访问失败: {response.status_code}")
                print(f"   响应内容: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ .specs文件访问请求失败: {e}")
            return None
    
    def test_upload_list(self):
        """测试获取上传文件列表"""
        print("\n📋 测试获取上传文件列表...")
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/api/uploads/list", headers=headers)
            
            if response.status_code == 200:
                file_list = response.json()
                print(f"✅ 文件列表获取成功! 共 {file_list['total']} 个文件")
                
                for i, file_info in enumerate(file_list['files'], 1):
                    print(f"   {i}. {file_info['name']}")
                    print(f"      时间戳: {file_info['timestamp']}")
                    print(f"      大小: {file_info['size']} bytes")
                    print(f"      类型: {file_info['task_type']}")
                    print(f"      访问URL: {file_info['access_url']}")
                
                return file_list
            else:
                print(f"❌ 文件列表获取失败: {response.status_code}")
                print(f"   响应内容: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 文件列表获取请求失败: {e}")
            return None
    
    def cleanup_test_user(self):
        """清理测试用户"""
        print("\n🧹 清理测试数据...")
        
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            
            # 删除测试用户的会话
            if self.test_user:
                cursor.execute('DELETE FROM user_sessions WHERE user_id = ?', (self.test_user['id'],))
                # 删除测试用户
                cursor.execute('DELETE FROM users WHERE id = ?', (self.test_user['id'],))
                conn.commit()
                print("✅ 测试用户数据清理完成")
    
    def run_full_test(self):
        """运行完整测试"""
        print("🚀 开始完整的上传功能测试")
        print("=" * 60)
        
        try:
            # 1. 检查服务器健康状况
            if not self.test_server_health():
                print("❌ 服务器不可用，测试终止")
                return False
            
            # 2. 创建测试用户
            self.setup_test_user()
            
            # 3. 生成JWT令牌
            self.generate_test_token()
            
            # 4. 验证令牌
            if not self.test_token_validation():
                print("❌ 令牌验证失败，测试终止")
                return False
            
            # 5. 测试文件上传
            upload_result = self.test_file_upload()
            if not upload_result:
                print("❌ 文件上传失败，测试终止")
                return False
            
            # 6. 测试.specs文件访问
            specs_content = self.test_specs_access(upload_result)
            
            # 7. 测试文件列表获取
            file_list = self.test_upload_list()
            
            # 8. 验证结果
            success = all([
                upload_result is not None,
                specs_content is not None,
                file_list is not None
            ])
            
            if success:
                print("\n🎉 所有测试通过!")
                print("=" * 60)
                print("✅ 用户认证")
                print("✅ 文件上传")
                print("✅ .specs文件生成和访问")
                print("✅ 文件列表获取")
                print("=" * 60)
            else:
                print("\n❌ 部分测试失败")
            
            return success
            
        except Exception as e:
            print(f"\n💥 测试过程中发生异常: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        finally:
            # 清理测试数据
            self.cleanup_test_user()

def main():
    """主函数"""
    # 检查是否需要启动服务器
    tester = UploadTester()
    
    if not tester.test_server_health():
        print("🚨 服务器未运行，尝试启动...")
        try:
            # 尝试启动服务器
            import subprocess
            import signal
            
            print("启动后端服务器...")
            server_process = subprocess.Popen([
                "python", "backend/app.py"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # 等待服务器启动
            time.sleep(3)
            
            # 检查服务器是否启动成功
            if tester.test_server_health():
                print("✅ 服务器启动成功")
                try:
                    # 运行测试
                    success = tester.run_full_test()
                    return success
                finally:
                    # 停止服务器
                    print("\n🛑 停止服务器...")
                    server_process.terminate()
                    try:
                        server_process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        server_process.kill()
            else:
                print("❌ 服务器启动失败")
                server_process.terminate()
                return False
                
        except Exception as e:
            print(f"❌ 启动服务器时发生错误: {e}")
            return False
    else:
        # 服务器已运行，直接测试
        return tester.run_full_test()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 