# Web-Spec 后端服务

基于 Flask + Google OAuth 2.0 的认证后端服务。

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 环境配置

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：

```env
# Google OAuth (必须配置)
GOOGLE_CLIENT_ID=你的Google客户端ID
GOOGLE_CLIENT_SECRET=你的Google客户端密钥

# JWT密钥 (生产环境必须更改)
JWT_SECRET=你的JWT密钥

# Flask密钥 (生产环境必须更改) 
FLASK_SECRET_KEY=你的Flask密钥
```

### 3. 获取 Google OAuth 凭据

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID
5. 配置重定向 URI: `http://localhost:3000/auth/google/callback`
6. 将客户端 ID 和密钥添加到 `.env` 文件

### 4. 启动服务

```bash
python run.py
```

服务将在 `http://localhost:5000` 启动。

## API 端点

### 认证相关

- `GET /api/auth/google/url` - 获取Google OAuth授权URL
- `POST /api/auth/google/callback` - 处理Google OAuth回调
- `GET /api/auth/validate` - 验证JWT令牌
- `POST /api/auth/logout` - 用户登出

### 用户相关

- `GET /api/users/profile` - 获取用户资料

### 系统

- `GET /health` - 健康检查

## 数据库

使用 SQLite 数据库，自动创建以下表：

- `users` - 用户信息
- `user_sessions` - 用户会话

数据库文件位置：`database/web-spec.db`

## 安全特性

- JWT 令牌认证
- Google OAuth 2.0 集成  
- CORS 跨域保护
- 会话管理
- 状态验证防CSRF

## 开发说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| GOOGLE_CLIENT_ID | Google OAuth客户端ID | 必须配置 |
| GOOGLE_CLIENT_SECRET | Google OAuth客户端密钥 | 必须配置 |
| JWT_SECRET | JWT签名密钥 | 必须更改 |
| FLASK_SECRET_KEY | Flask会话密钥 | 必须更改 |
| DATABASE_URL | 数据库路径 | database/web-spec.db |
| JWT_EXPIRE_HOURS | JWT过期时间(小时) | 24 |
| PORT | 服务端口 | 5000 |

### 部署注意事项

1. **生产环境**:
   - 更改所有默认密钥
   - 使用 HTTPS
   - 配置适当的 CORS 域名
   - 设置环境变量 `FLASK_ENV=production`

2. **Google OAuth**:
   - 生产环境需要添加实际域名到授权重定向URI
   - 建议设置不同的开发和生产OAuth应用

3. **数据库**:
   - 生产环境建议使用 PostgreSQL 或 MySQL
   - 定期备份用户数据

## 错误排查

### 常见问题

1. **Google OAuth 失败**:
   - 检查客户端ID和密钥是否正确
   - 确认重定向URI配置正确
   - 验证Google OAuth应用状态

2. **CORS 错误**:
   - 检查前端URL是否在CORS允许列表中
   - 确认请求包含正确的credentials

3. **数据库错误**:
   - 确认数据库文件权限
   - 检查SQLite安装

### 日志

开发模式下，错误信息会输出到控制台。生产环境建议配置适当的日志系统。

## 扩展

当前实现了Google OAuth，可以类似地添加：

- Microsoft OAuth
- GitHub OAuth  
- 其他OAuth提供商

只需要实现对应的认证流程和回调处理。