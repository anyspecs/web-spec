# 简单的 curl 上传命令

## 🔧 手动 curl 命令步骤

### 1. 检查服务器状态
```bash
curl -s http://localhost:5001/health | jq .
```

### 2. 获取Google OAuth认证链接
```bash
curl -s http://localhost:5001/api/auth/google/url | jq .
```

**输出示例:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/auth?...",
  "state": "random-state-string"
}
```

### 3. 完成Google认证并获取授权码
1. 复制上面的 `auth_url` 并在浏览器中打开
2. 完成Google登录授权
3. 从重定向URL中复制 `code=` 后面的授权码

### 4. 使用授权码获取JWT Token
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_AUTH_CODE","state":"YOUR_STATE"}' \
  http://localhost:5001/api/auth/google/callback | jq .
```

**输出示例:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@gmail.com",
    "name": "用户名"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. 使用Token上传文件
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@sample.specs" \
  http://localhost:5001/api/upload | jq .
```

**输出示例:**
```json
{
  "success": true,
  "message": "文件上传成功",
  "file_info": {
    "original_name": "sample.specs",
    "saved_name": "20250725_143022_123.specs",
    "timestamp": "20250725_143022_123",
    "size": 2048,
    "specs_file": "20250725_143022_123.specs",
    "access_url": "/api/user-uuid/20250725_143022_123.html"
  }
}
```

### 6. 访问上传的.specs文件内容
```bash
curl -s http://localhost:5001/api/user-uuid/20250725_143022_123.html | jq .
```

## 🚀 一键智能上传（推荐）

使用我们提供的智能上传脚本，自动处理所有认证逻辑：

```bash
# 基本使用
./smart-upload.sh

# 上传指定文件
./smart-upload.sh myfile.specs

# 查看帮助
./smart-upload.sh --help

# 重置认证信息
./smart-upload.sh --reset

# 检查token状态
./smart-upload.sh --token
```

## 🔒 认证说明

- 智能脚本会自动保存你的JWT token到 `.webspec_token` 文件
- Token有效期为24小时
- 如果token过期，脚本会自动引导你重新认证
- 可以使用 `--reset` 选项清除保存的认证信息

## 📝 注意事项

1. **Google OAuth配置**: 确保后端 `.env` 文件中配置了正确的Google OAuth客户端ID和密钥
2. **服务器运行**: 确保后端服务器在 `http://localhost:5001` 运行
3. **文件格式**: 支持的文件格式包括: txt, md, json, specs, py, js, ts, tsx, jsx, css, html, xml, log
4. **文件大小**: 最大支持16MB的文件上传

## 🛠️ 故障排除

### 认证失败
```bash
# 检查Google OAuth配置
cat backend/.env | grep GOOGLE

# 重置认证信息
./smart-upload.sh --reset
```

### 服务器连接失败
```bash
# 检查后端服务器状态
curl -s http://localhost:5001/health

# 启动后端服务器
cd backend && python run.py
```

### Token验证失败
```bash
# 检查token状态
./smart-upload.sh --token

# 重新认证
./smart-upload.sh --reset
``` 