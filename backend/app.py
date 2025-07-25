#!/usr/bin/env python3
"""
Web-Spec 后端服务
基于 Flask + Google OAuth 2.0 认证
参考: https://github.com/googleapis/google-api-python-client
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
import requests
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-change-in-production')

# CORS配置
CORS(app, origins=[
    "http://localhost:3000",  # 开发环境
    "https://yourdomain.com"   # 生产环境
], supports_credentials=True)

# Google OAuth 2.0 配置
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

# 数据库配置
DATABASE = os.getenv('DATABASE_URL', 'database/web-spec.db')
JWT_SECRET = os.getenv('JWT_SECRET', 'jwt-secret-change-in-production')
JWT_EXPIRE_HOURS = int(os.getenv('JWT_EXPIRE_HOURS', '24'))

def init_db():
    """初始化数据库"""
    # 确保数据库目录存在
    db_dir = os.path.dirname(DATABASE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    with sqlite3.connect(DATABASE) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                avatar_url TEXT,
                provider TEXT NOT NULL,
                provider_id TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, provider_id)
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        conn.commit()

def generate_jwt_token(user_data):
    """生成JWT令牌"""
    import uuid
    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        'iat': datetime.utcnow(),
        'jti': str(uuid.uuid4())  # JWT ID - 确保token唯一性
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt_token(token):
    """验证JWT令牌"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': '未提供认证令牌'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': '无效或过期的令牌'}), 401
        
        # 将用户信息添加到请求上下文
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated_function

def get_or_create_user(email, name, avatar_url, provider, provider_id):
    """获取或创建用户"""
    import uuid
    
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 尝试通过邮箱查找用户
        cursor.execute(
            'SELECT * FROM users WHERE email = ? OR (provider = ? AND provider_id = ?)',
            (email, provider, provider_id)
        )
        user = cursor.fetchone()
        
        if user:
            # 更新用户信息
            cursor.execute('''
                UPDATE users 
                SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (name, avatar_url, user['id']))
            conn.commit()
            return dict(user)
        else:
            # 创建新用户
            user_uuid = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO users (uuid, email, name, avatar_url, provider, provider_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_uuid, email, name, avatar_url, provider, provider_id))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return {
                'id': user_id,
                'uuid': user_uuid,
                'email': email,
                'name': name,
                'avatar_url': avatar_url,
                'provider': provider,
                'provider_id': provider_id
            }

@app.route('/api/auth/google/url', methods=['GET'])
def google_auth_url():
    """获取Google OAuth授权URL (支持动态回调)"""
    try:
        # 1. 动态获取客户端请求的回调URI，默认为前端地址
        redirect_uri = request.args.get(
            'redirect_uri', 
            "http://localhost:3000/auth/google/callback"
        )
        
        # 2. 定义所有在Google Cloud Console中注册过的回调URI列表
        allowed_redirect_uris = [
            "http://localhost:3000/auth/google/callback",  # 前端
            "http://localhost:8888/auth/callback",         # CLI工具
            "http://localhost:8889/auth/callback",         # CLI工具备用
        ]

        # 安全检查：确保请求的URI是受信任的
        if redirect_uri not in allowed_redirect_uris:
            return jsonify({'error': f'Unauthorized redirect_uri: {redirect_uri}'}), 400

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": allowed_redirect_uris
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email', 
                'openid'
            ]
        )
        
        # 3. 告知Google本次请求使用哪个回调URI
        flow.redirect_uri = redirect_uri
        
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='select_account'
        )
        
        # 4. 将state和本次请求使用的redirect_uri存入session，以备回调时验证
        session['oauth_state'] = state
        session['oauth_redirect_uri'] = redirect_uri
        
        return jsonify({
            'auth_url': auth_url,
            'state': state
        })
        
    except Exception as e:
        return jsonify({'error': f'生成授权URL失败: {str(e)}'}), 500

@app.route('/api/auth/google/callback', methods=['POST'])
def google_callback():
    """Google OAuth回调处理 (支持动态回调)"""
    try:
        data = request.get_json()
        code = data.get('code')
        state = data.get('state')
        
        if not code:
            return jsonify({'error': '未收到授权码'}), 400
        
        # 安全检查：验证state
        if state and session.get('oauth_state') != state:
            return jsonify({'error': '状态验证失败'}), 400
        
        # 1. 从session中安全地取出本次流程对应的回调URI
        redirect_uri = session.get('oauth_redirect_uri')
        if not redirect_uri:
            return jsonify({'error': '认证会话已过期或无效'}), 400
        
        allowed_redirect_uris = [
            "http://localhost:3000/auth/google/callback",
            "http://localhost:8888/auth/callback",
            "http://localhost:8889/auth/callback",
        ]

        # 2. 配置OAuth flow，并告知Google本次回调的URI
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": allowed_redirect_uris
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email', 
                'openid'
            ]
        )
        
        # 3. 使用从session中获取的回调URI
        flow.redirect_uri = redirect_uri
        
        # 使用授权码获取访问令牌
        try:
            flow.fetch_token(code=code)
        except Exception as token_error:
            error_msg = str(token_error)
            if 'invalid_grant' in error_msg:
                return jsonify({'error': '授权码无效或已过期，请重新登录'}), 400
            elif 'redirect_uri_mismatch' in error_msg:
                # 这是一个非常有用的调试信息
                return jsonify({'error': f'重定向URI不匹配，后端期望URI: {redirect_uri}'}), 400
            else:
                return jsonify({'error': f'获取访问令牌失败: {error_msg}'}), 400
        
        # ... (获取用户信息和生成JWT的后续逻辑保持不变) ...
        credentials = flow.credentials
        user_info_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {credentials.token}'}
        )
        
        if user_info_response.status_code != 200:
            return jsonify({'error': '获取用户信息失败'}), 400
        
        user_info = user_info_response.json()
        
        id_info = id_token.verify_oauth2_token(
            credentials.id_token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return jsonify({'error': '无效的令牌发行方'}), 400
        
        email = user_info.get('email')
        name = user_info.get('name', '')
        avatar_url = user_info.get('picture', '')
        provider_id = user_info.get('id')
        
        if not email or not provider_id:
            return jsonify({'error': '无法获取必要的用户信息'}), 400
        
        user = get_or_create_user(email, name, avatar_url, 'google', provider_id)
        jwt_token = generate_jwt_token(user)
        
        with sqlite3.connect(DATABASE) as conn:
            conn.execute('DELETE FROM user_sessions WHERE user_id = ?', (user['id'],))
            conn.execute('''
                INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user['id'],
                jwt_token,
                datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
                request.remote_addr,
                request.user_agent.string
            ))
            conn.commit()
        
        session.pop('oauth_state', None)
        session.pop('oauth_redirect_uri', None)
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['uuid'],
                'email': user['email'],
                'name': user['name'],
                'avatar': user['avatar_url'],
                'provider': user['provider']
            },
            'token': jwt_token
        })
        
    except Exception as e:
        app.logger.error(f"Google OAuth回调错误: {str(e)}")
        return jsonify({'error': f'认证失败: {str(e)}'}), 500

@app.route('/api/auth/validate', methods=['GET'])
@require_auth
def validate_token():
    """验证JWT令牌"""
    user_id = request.current_user['user_id']
    
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user['uuid'],
                'email': user['email'],
                'name': user['name'],
                'avatar': user['avatar_url'],
                'provider': user['provider']
            }
        })

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """用户登出"""
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    
    with sqlite3.connect(DATABASE) as conn:
        conn.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE token = ?',
            (token,)
        )
        conn.commit()
    
    return jsonify({'success': True, 'message': '登出成功'})

@app.route('/api/users/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """获取用户资料"""
    user_id = request.current_user['user_id']
    
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        return jsonify({
            'id': user['uuid'],
            'email': user['email'],
            'name': user['name'],
            'avatar': user['avatar_url'],
            'provider': user['provider'],
            'created_at': user['created_at']
        })

@app.route('/api/auth/extension/register', methods=['POST'])
def extension_register():
    """浏览器插件用户注册/验证"""
    try:
        data = request.get_json()
        google_token = data.get('google_token')
        user_info = data.get('user_info')
        
        if not google_token:
            return jsonify({'error': '缺少Google令牌'}), 400
        
        # 验证Google token
        user_info_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {google_token}'}
        )
        
        if user_info_response.status_code != 200:
            return jsonify({'error': '无效的Google令牌'}), 400
        
        verified_user_info = user_info_response.json()
        
        # 提取用户信息
        email = verified_user_info.get('email')
        name = verified_user_info.get('name', '')
        avatar_url = verified_user_info.get('picture', '')
        provider_id = verified_user_info.get('id')
        
        if not email or not provider_id:
            return jsonify({'error': '无法获取必要的用户信息'}), 400
        
        # 获取或创建用户
        user = get_or_create_user(email, name, avatar_url, 'google', provider_id)
        
        # 生成JWT令牌
        jwt_token = generate_jwt_token(user)
        
        # 记录会话
        with sqlite3.connect(DATABASE) as conn:
            # 清理该用户的旧会话，避免token冲突
            conn.execute('DELETE FROM user_sessions WHERE user_id = ?', (user['id'],))
            
            # 插入新会话
            conn.execute('''
                INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user['id'],
                jwt_token,
                datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
                request.remote_addr,
                request.user_agent.string
            ))
            conn.commit()
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['uuid'],
                'email': user['email'],
                'name': user['name'],
                'avatar': user['avatar_url']
            },
            'jwt': jwt_token
        })
        
    except Exception as e:
        app.logger.error(f"插件注册错误: {str(e)}")
        return jsonify({'error': f'注册失败: {str(e)}'}), 500

@app.route('/api/auth/extension/validate', methods=['GET'])
@require_auth
def extension_validate():
    """浏览器插件令牌验证"""
    user_id = request.current_user['user_id']
    
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user['uuid'],
                'email': user['email'],
                'name': user['name'],
                'avatar': user['avatar_url']
            }
        })

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001, host='0.0.0.0')