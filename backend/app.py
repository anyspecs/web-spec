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
import hashlib

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

# 上传配置
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'upload')
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'txt', 'json', 'specs', 'html', 'md', 'py', 'js', 'ts', 'tsx', 'jsx', 'css', 'xml', 'log'}

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_upload_dir(user_uuid):
    """获取用户的上传目录"""
    user_dir = os.path.join(UPLOAD_FOLDER, user_uuid)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def get_db_version():
    """获取数据库schema版本"""
    try:
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM metadata WHERE key = 'schema_version'")
            result = cursor.fetchone()
            return int(result[0]) if result else 0
    except:
        return 0

def set_db_version(version):
    """设置数据库schema版本"""
    with sqlite3.connect(DATABASE) as conn:
        conn.execute('''
            INSERT OR REPLACE INTO metadata (key, value, updated_at)
            VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
        ''', (str(version),))
        conn.commit()

def migrate_to_v1():
    """迁移到版本1: 添加增强用户字段"""
    with sqlite3.connect(DATABASE) as conn:
        # 创建metadata表用于版本管理
        conn.execute('''
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 安全添加新字段
        migrations = [
            "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN given_name TEXT",
            "ALTER TABLE users ADD COLUMN family_name TEXT", 
            "ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'zh-CN'",
            "ALTER TABLE users ADD COLUMN sub_id TEXT",
            "ALTER TABLE users ADD COLUMN profile_link TEXT",
            "ALTER TABLE users ADD COLUMN gender TEXT",
            "ALTER TABLE users ADD COLUMN hosted_domain TEXT",
            "ALTER TABLE users ADD COLUMN oauth_response_raw TEXT",
            "ALTER TABLE users ADD COLUMN last_profile_sync DATETIME"
        ]
        
        for migration in migrations:
            try:
                conn.execute(migration)
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    raise e  # 重新抛出非重复列名错误
        
        # 为现有用户设置默认值
        conn.execute("UPDATE users SET last_profile_sync = updated_at WHERE last_profile_sync IS NULL")
        conn.commit()

def init_db():
    """初始化数据库并执行迁移"""
    # 确保数据库目录存在
    db_dir = os.path.dirname(DATABASE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    with sqlite3.connect(DATABASE) as conn:
        # 创建基础表结构
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
    
    # 执行数据库迁移
    current_version = get_db_version()
    if current_version < 1:
        print("执行数据库迁移到版本1...")
        migrate_to_v1()
        set_db_version(1)
        print("数据库迁移完成")

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

def get_or_create_user(user_info, provider='google'):
    """获取或创建用户 - 增强版支持完整OAuth信息"""
    import uuid
    
    # 提取基础字段
    email = user_info.get('email')
    name = user_info.get('name', '')
    avatar_url = user_info.get('picture', '')
    provider_id = user_info.get('id') or user_info.get('sub')
    
    # 提取增强字段
    email_verified = user_info.get('verified_email', user_info.get('email_verified', False))
    given_name = user_info.get('given_name', '')
    family_name = user_info.get('family_name', '')
    locale = user_info.get('locale', 'zh-CN')
    sub_id = user_info.get('sub', '')
    profile_link = user_info.get('link', '')
    gender = user_info.get('gender', '')
    hosted_domain = user_info.get('hd', '')
    
    # 保存完整OAuth响应用于调试和未来扩展
    oauth_response_raw = json.dumps(user_info, ensure_ascii=False)
    
    if not email or not provider_id:
        raise ValueError('缺少必要的用户信息: email或provider_id')
    
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 尝试通过邮箱或provider_id查找用户
        cursor.execute(
            'SELECT * FROM users WHERE email = ? OR (provider = ? AND provider_id = ?)',
            (email, provider, provider_id)
        )
        user = cursor.fetchone()
        
        if user:
            # 更新用户信息 - 包含所有增强字段
            cursor.execute('''
                UPDATE users 
                SET name = ?, avatar_url = ?, email_verified = ?, given_name = ?, 
                    family_name = ?, locale = ?, sub_id = ?, profile_link = ?, 
                    gender = ?, hosted_domain = ?, oauth_response_raw = ?,
                    last_profile_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (name, avatar_url, email_verified, given_name, family_name, 
                  locale, sub_id, profile_link, gender, hosted_domain, 
                  oauth_response_raw, user['id']))
            conn.commit()
            
            # 重新获取更新后的用户信息
            cursor.execute('SELECT * FROM users WHERE id = ?', (user['id'],))
            updated_user = cursor.fetchone()
            return dict(updated_user)
        else:
            # 创建新用户 - 包含所有字段
            user_uuid = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO users (
                    uuid, email, name, avatar_url, provider, provider_id,
                    email_verified, given_name, family_name, locale, sub_id,
                    profile_link, gender, hosted_domain, oauth_response_raw,
                    last_profile_sync
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_uuid, email, name, avatar_url, provider, provider_id,
                  email_verified, given_name, family_name, locale, sub_id,
                  profile_link, gender, hosted_domain, oauth_response_raw))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return {
                'id': user_id,
                'uuid': user_uuid,
                'email': email,
                'name': name,
                'avatar_url': avatar_url,
                'provider': provider,
                'provider_id': provider_id,
                'email_verified': email_verified,
                'given_name': given_name,
                'family_name': family_name,
                'locale': locale,
                'sub_id': sub_id,
                'profile_link': profile_link,
                'gender': gender,
                'hosted_domain': hosted_domain
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
        
        # 验证必要的用户信息
        email = user_info.get('email')
        provider_id = user_info.get('id') or user_info.get('sub')
        
        if not email or not provider_id:
            return jsonify({'error': '无法获取必要的用户信息'}), 400
        
        # 使用增强的用户创建函数，传递完整的OAuth响应
        user = get_or_create_user(user_info, 'google')
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
        
        # 验证必要的用户信息
        email = verified_user_info.get('email')
        provider_id = verified_user_info.get('id') or verified_user_info.get('sub')
        
        if not email or not provider_id:
            return jsonify({'error': '无法获取必要的用户信息'}), 400
        
        # 获取或创建用户 - 使用增强函数
        user = get_or_create_user(verified_user_info, 'google')
        
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

@app.route('/api/upload', methods=['POST'])
@require_auth
def upload_file():
    """文件上传端点 (使用时间戳命名)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有选择文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        # 获取当前用户信息
        user_id = request.current_user['user_id']
        with sqlite3.connect(DATABASE) as conn:
            user_uuid = conn.execute('SELECT uuid FROM users WHERE id = ?', (user_id,)).fetchone()[0]
            if not user_uuid:
                return jsonify({'error': '用户不存在'}), 404
        
        original_filename = secure_filename(file.filename)
        _, file_extension = os.path.splitext(original_filename)
        
        # 生成时间戳文件名 (YYYYMMDD_HHMMSS_ms)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')[:-3]
        new_filename = f"{timestamp}{file_extension}"
        
        # 获取用户上传目录并保存
        user_upload_dir = get_user_upload_dir(user_uuid)
        file_path = os.path.join(user_upload_dir, new_filename)
        file.save(file_path)

        return jsonify({
            'success': True,
            'message': '文件上传成功',
            'file_info': {
                'original_name': original_filename,
                'saved_name': new_filename,
                'timestamp': timestamp,
                'size': os.path.getsize(file_path),
                'user_uuid': user_uuid,
                'storage_path': f"upload/{user_uuid}/{new_filename}"
            }
        })
        
    except Exception as e:
        app.logger.error(f"文件上传错误: {str(e)}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/api/uploads/list', methods=['GET'])
@require_auth
def get_user_uploads():
    """获取当前用户的所有上传文件列表"""
    try:
        # 获取当前用户信息
        user_id = request.current_user['user_id']
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT uuid FROM users WHERE id = ?', (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                return jsonify({'error': '用户不存在'}), 404
            
            user_uuid = user_row['uuid']
        
        # 获取用户上传目录
        user_upload_dir = get_user_upload_dir(user_uuid)
        
        if not os.path.exists(user_upload_dir):
            return jsonify({'files': [], 'total': 0})
        
        files = []
        
        # 遍历用户目录中的所有文件
        processed_files = set()  # 记录已处理的时间戳，避免重复
        
        for filename in os.listdir(user_upload_dir):
            file_path = os.path.join(user_upload_dir, filename)
            
            # 跳过目录
            if os.path.isdir(file_path):
                continue
            
            try:
                # 解析时间戳
                name_without_ext, file_extension = os.path.splitext(filename)
                
                # 处理.specs文件
                if filename.endswith('.specs'):
                    # 尝试从文件名中提取时间戳
                    # 支持格式：timestamp.specs 或 projectname_context_timestamp.specs
                    if '_context_' in name_without_ext:
                        # 项目格式：projectname_context_timestamp
                        timestamp_part = name_without_ext.split('_context_')[-1]
                        # 处理ISO格式时间戳：2025-07-26_03-46-24-084Z
                        timestamp = timestamp_part.replace('-', '').replace('Z', '')
                    else:
                        # 简单格式：直接使用文件名（去掉.specs）
                        timestamp = name_without_ext
                    
                    # 避免重复处理
                    if timestamp in processed_files:
                        continue
                    processed_files.add(timestamp)
                    
                    # 获取文件统计信息
                    file_stat = os.stat(file_path)
                    file_size = file_stat.st_size
                    created_time = datetime.fromtimestamp(file_stat.st_ctime)
                    modified_time = datetime.fromtimestamp(file_stat.st_mtime)
                    
                    # 从.specs文件中获取元数据
                    file_metadata = {
                        'name': f"上传文件: {filename}",
                        'task_type': 'general_chat',
                        'source_file': filename
                    }
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as specs_file:
                            specs_content = json.load(specs_file)
                            # 安全访问可选的metadata字段
                            if specs_content and 'metadata' in specs_content and specs_content['metadata']:
                                metadata = specs_content['metadata']
                                file_metadata.update({
                                    'name': metadata.get('name') or file_metadata['name'],
                                    'task_type': metadata.get('task_type') or file_metadata['task_type'],
                                    'source_file': metadata.get('source_file') or file_metadata['source_file']
                                })
                    except (json.JSONDecodeError, IOError, TypeError):
                        # 如果.specs文件损坏，使用默认元数据
                        pass
                    
                    # 构建文件信息
                    file_info = {
                        'timestamp': timestamp,
                        'original_name': file_metadata['source_file'],
                        'saved_name': filename,
                        'size': file_size,
                        'created_at': created_time.isoformat(),
                        'modified_at': modified_time.isoformat(),
                        'name': file_metadata['name'],
                        'task_type': file_metadata['task_type'],
                        'source_file': file_metadata['source_file'],
                        'specs_file': filename,
                        'access_url': f"/api/{user_uuid}/{timestamp}.html"
                    }
                    
                    files.append(file_info)
                    
                # 检查是否为时间戳格式的原始文件
                elif len(name_without_ext) == 18 and '_' in name_without_ext:
                    timestamp = name_without_ext
                    
                    # 避免重复处理
                    if timestamp in processed_files:
                        continue
                    processed_files.add(timestamp)
                    
                    # 获取文件统计信息
                    file_stat = os.stat(file_path)
                    file_size = file_stat.st_size
                    created_time = datetime.fromtimestamp(file_stat.st_ctime)
                    modified_time = datetime.fromtimestamp(file_stat.st_mtime)
                    
                    # 检查是否存在对应的.specs文件
                    specs_filename = f"{timestamp}.specs"
                    specs_path = os.path.join(user_upload_dir, specs_filename)
                    
                    # 尝试从.specs文件中获取元数据 - 支持可选字段
                    file_metadata = {
                        'name': f"上传文件: {filename}",
                        'task_type': 'document_analysis',
                        'source_file': filename
                    }
                    
                    if os.path.exists(specs_path):
                        try:
                            with open(specs_path, 'r', encoding='utf-8') as specs_file:
                                specs_content = json.load(specs_file)
                                # 安全访问可选的metadata字段
                                if specs_content and 'metadata' in specs_content and specs_content['metadata']:
                                    metadata = specs_content['metadata']
                                    file_metadata.update({
                                        'name': metadata.get('name') or file_metadata['name'],
                                        'task_type': metadata.get('task_type') or file_metadata['task_type'],
                                        'source_file': metadata.get('source_file') or file_metadata['source_file']
                                    })
                        except (json.JSONDecodeError, IOError, TypeError):
                            # 如果.specs文件损坏或格式不正确，使用默认元数据
                            pass
                    
                    # 构建文件信息
                    file_info = {
                        'timestamp': timestamp,
                        'original_name': filename,
                        'saved_name': filename,
                        'size': file_size,
                        'created_at': created_time.isoformat(),
                        'modified_at': modified_time.isoformat(),
                        'name': file_metadata['name'],
                        'task_type': file_metadata['task_type'],
                        'source_file': file_metadata['source_file'],
                        'specs_file': specs_filename if os.path.exists(specs_path) else None,
                        'access_url': f"/api/{user_uuid}/{timestamp}.html"
                    }
                    
                    files.append(file_info)
                    
            except Exception as file_error:
                app.logger.warning(f"处理文件 {filename} 时出错: {str(file_error)}")
                continue
        
        # 按创建时间倒序排列
        files.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'files': files,
            'total': len(files),
            'user_uuid': user_uuid
        })
        
    except Exception as e:
        app.logger.error(f"获取用户文件列表错误: {str(e)}")
        return jsonify({'error': f'获取文件列表失败: {str(e)}'}), 500

@app.route('/api/contexts/list', methods=['GET'])
def get_all_contexts():
    """获取所有用户的上下文文件列表（公开API，用于ContextList页面）"""
    try:
        all_files = []
        
        # 检查upload目录是否存在
        if not os.path.exists(UPLOAD_FOLDER):
            return jsonify({'files': [], 'total': 0})
        
        # 遍历所有用户目录
        for user_uuid in os.listdir(UPLOAD_FOLDER):
            user_upload_dir = os.path.join(UPLOAD_FOLDER, user_uuid)
            
            # 跳过非目录文件
            if not os.path.isdir(user_upload_dir):
                continue
            
            # 获取用户信息（可选，如果获取失败就使用UUID）
            user_name = user_uuid[:8] + "..."  # 默认显示UUID前8位
            try:
                with sqlite3.connect(DATABASE) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute('SELECT name FROM users WHERE uuid = ?', (user_uuid,))
                    user_row = cursor.fetchone()
                    if user_row:
                        user_name = user_row['name']
            except:
                # 如果获取用户信息失败，继续使用默认名称
                pass
            
            # 使用与get_user_uploads相同的逻辑处理文件
            processed_files = set()
            
            for filename in os.listdir(user_upload_dir):
                file_path = os.path.join(user_upload_dir, filename)
                
                # 跳过目录
                if os.path.isdir(file_path):
                    continue
                
                try:
                    # 解析时间戳
                    name_without_ext, file_extension = os.path.splitext(filename)
                    
                    # 处理.specs文件
                    if filename.endswith('.specs'):
                        # 尝试从文件名中提取时间戳
                        if '_context_' in name_without_ext:
                            # 项目格式：projectname_context_timestamp
                            timestamp_part = name_without_ext.split('_context_')[-1]
                            # 处理ISO格式时间戳：2025-07-26_03-46-24-084Z
                            timestamp = timestamp_part.replace('-', '').replace('Z', '')
                        else:
                            # 简单格式：直接使用文件名（去掉.specs）
                            timestamp = name_without_ext
                        
                        # 避免重复处理
                        if timestamp in processed_files:
                            continue
                        processed_files.add(timestamp)
                        
                        # 获取文件统计信息
                        file_stat = os.stat(file_path)
                        file_size = file_stat.st_size
                        created_time = datetime.fromtimestamp(file_stat.st_ctime)
                        modified_time = datetime.fromtimestamp(file_stat.st_mtime)
                        
                        # 从.specs文件中获取元数据
                        file_metadata = {
                            'name': f"上传文件: {filename}",
                            'task_type': 'general_chat',
                            'source_file': filename
                        }
                        
                        try:
                            with open(file_path, 'r', encoding='utf-8') as specs_file:
                                specs_content = json.load(specs_file)
                                # 安全访问可选的metadata字段
                                if specs_content and 'metadata' in specs_content and specs_content['metadata']:
                                    metadata = specs_content['metadata']
                                    file_metadata.update({
                                        'name': metadata.get('name') or file_metadata['name'],
                                        'task_type': metadata.get('task_type') or file_metadata['task_type'],
                                        'source_file': metadata.get('source_file') or file_metadata['source_file']
                                    })
                        except (json.JSONDecodeError, IOError, TypeError):
                            # 如果.specs文件损坏，使用默认元数据
                            pass
                        
                        # 构建文件信息
                        file_info = {
                            'id': f"{user_uuid}_{timestamp}",  # 全局唯一ID
                            'timestamp': timestamp,
                            'original_name': file_metadata['source_file'],
                            'saved_name': filename,
                            'size': file_size,
                            'created_at': created_time.isoformat(),
                            'modified_at': modified_time.isoformat(),
                            'name': file_metadata['name'],
                            'task_type': file_metadata['task_type'],
                            'source_file': file_metadata['source_file'],
                            'specs_file': filename,
                            'access_url': f"/api/{user_uuid}/{timestamp}.html",
                            'user_uuid': user_uuid,
                            'user_name': user_name
                        }
                        
                        all_files.append(file_info)
                        
                    # 检查是否为时间戳格式的原始文件
                    elif len(name_without_ext) == 18 and '_' in name_without_ext:
                        timestamp = name_without_ext
                        
                        # 避免重复处理
                        if timestamp in processed_files:
                            continue
                        processed_files.add(timestamp)
                        
                        # 获取文件统计信息
                        file_stat = os.stat(file_path)
                        file_size = file_stat.st_size
                        created_time = datetime.fromtimestamp(file_stat.st_ctime)
                        modified_time = datetime.fromtimestamp(file_stat.st_mtime)
                        
                        # 检查是否存在对应的.specs文件
                        specs_filename = f"{timestamp}.specs"
                        specs_path = os.path.join(user_upload_dir, specs_filename)
                        
                        # 尝试从.specs文件中获取元数据
                        file_metadata = {
                            'name': f"上传文件: {filename}",
                            'task_type': 'document_analysis',
                            'source_file': filename
                        }
                        
                        if os.path.exists(specs_path):
                            try:
                                with open(specs_path, 'r', encoding='utf-8') as specs_file:
                                    specs_content = json.load(specs_file)
                                    # 安全访问可选的metadata字段
                                    if specs_content and 'metadata' in specs_content and specs_content['metadata']:
                                        metadata = specs_content['metadata']
                                        file_metadata.update({
                                            'name': metadata.get('name') or file_metadata['name'],
                                            'task_type': metadata.get('task_type') or file_metadata['task_type'],
                                            'source_file': metadata.get('source_file') or file_metadata['source_file']
                                        })
                            except (json.JSONDecodeError, IOError, TypeError):
                                # 如果.specs文件损坏，使用默认元数据
                                pass
                        
                        # 构建文件信息
                        file_info = {
                            'id': f"{user_uuid}_{timestamp}",  # 全局唯一ID
                            'timestamp': timestamp,
                            'original_name': filename,
                            'saved_name': filename,
                            'size': file_size,
                            'created_at': created_time.isoformat(),
                            'modified_at': modified_time.isoformat(),
                            'name': file_metadata['name'],
                            'task_type': file_metadata['task_type'],
                            'source_file': file_metadata['source_file'],
                            'specs_file': specs_filename if os.path.exists(specs_path) else None,
                            'access_url': f"/api/{user_uuid}/{timestamp}.html",
                            'user_uuid': user_uuid,
                            'user_name': user_name
                        }
                        
                        all_files.append(file_info)
                        
                except Exception as file_error:
                    app.logger.warning(f"处理文件 {filename} 时出错: {str(file_error)}")
                    continue
        
        # 按创建时间倒序排列
        all_files.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'files': all_files,
            'total': len(all_files)
        })
        
    except Exception as e:
        app.logger.error(f"获取全局文件列表错误: {str(e)}")
        return jsonify({'error': f'获取文件列表失败: {str(e)}'}), 500

@app.route('/api/uploads/<timestamp>', methods=['DELETE'])
@require_auth
def delete_user_file(timestamp):
    """删除用户上传的文件"""
    try:
        # 获取当前用户信息
        user_id = request.current_user['user_id']
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT uuid FROM users WHERE id = ?', (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                return jsonify({'error': '用户不存在'}), 404
            
            user_uuid = user_row['uuid']
        
        # 获取用户上传目录
        user_upload_dir = get_user_upload_dir(user_uuid)
        
        # 查找并删除对应的文件
        deleted_files = []
        for filename in os.listdir(user_upload_dir):
            if filename.startswith(timestamp):
                file_path = os.path.join(user_upload_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    deleted_files.append(filename)
        
        if not deleted_files:
            return jsonify({'error': '文件不存在'}), 404
        
        return jsonify({
            'success': True,
            'message': f'成功删除 {len(deleted_files)} 个文件',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        app.logger.error(f"删除文件错误: {str(e)}")
        return jsonify({'error': f'删除失败: {str(e)}'}), 500

@app.route('/api/uploads/download/<user_uuid>/<filename>', methods=['GET'])
@require_auth
def download_user_file(user_uuid, filename):
    """下载用户上传的文件"""
    try:
        # 获取当前用户信息
        user_id = request.current_user['user_id']
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT uuid FROM users WHERE id = ?', (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                return jsonify({'error': '用户不存在'}), 404
            
            current_user_uuid = user_row['uuid']
        
        # 安全检查：确保用户只能下载自己的文件
        if current_user_uuid != user_uuid:
            return jsonify({'error': '无权访问此文件'}), 403
        
        # 构建文件路径
        user_upload_dir = get_user_upload_dir(user_uuid)
        file_path = os.path.join(user_upload_dir, secure_filename(filename))
        
        # 检查文件是否存在
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify({'error': '文件不存在'}), 404
        
        # 发送文件
        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        app.logger.error(f"下载文件错误: {str(e)}")
        return jsonify({'error': f'下载失败: {str(e)}'}), 500

@app.route('/api/<user_uuid>/<timestamp>.html', methods=['GET'])
def get_specs_content(user_uuid, timestamp):
    """获取用户的specs文件内容（公开访问）"""
    try:
        # 构建specs文件路径
        user_upload_dir = os.path.join(UPLOAD_FOLDER, user_uuid)
        specs_filename = f"{timestamp}.specs"
        specs_path = os.path.join(user_upload_dir, specs_filename)
        
        # 检查文件是否存在
        if not os.path.exists(specs_path) or not os.path.isfile(specs_path):
            return jsonify({'error': '文件不存在'}), 404
        
        # 读取并返回specs文件内容
        with open(specs_path, 'r', encoding='utf-8') as f:
            specs_content = json.load(f)
        
        return jsonify(specs_content)
        
    except json.JSONDecodeError:
        return jsonify({'error': 'specs文件格式错误'}), 400
    except Exception as e:
        app.logger.error(f"获取specs文件错误: {str(e)}")
        return jsonify({'error': f'获取文件内容失败: {str(e)}'}), 500

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
    port = int(os.getenv('PORT', 5001))
    host = os.getenv('HOST', '0.0.0.0')
    app.run(debug=True, port=port, host=host)