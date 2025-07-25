# Web-Spec 上传功能 API 文档

## 概述

Web-Spec 提供了安全的文件上传功能，支持用户上传文档并自动生成对应的 .specs 文件。所有上传的文件都按时间戳重命名，并且只有认证用户可以访问自己的文件。

## 认证

所有上传相关的 API 都需要 JWT 认证。请在请求头中包含：

```
Authorization: Bearer <your_jwt_token>
```

## API 端点

### 1. 文件上传

**端点**: `POST /api/upload`

**描述**: 上传文件并自动生成对应的 .specs 文件

**认证**: 必需

**请求格式**: `multipart/form-data`

**参数**:
- `file` (文件): 要上传的文件

**支持的文件格式**:
- 文本文件: `.txt`, `.md`, `.json`, `.specs`
- 代码文件: `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.css`
- 标记文件: `.html`, `.xml`
- 日志文件: `.log`

**最大文件大小**: 16MB

**响应示例**:

```json
{
  "success": true,
  "message": "文件上传成功",
  "file_info": {
    "original_name": "test.md",
    "saved_name": "20231225_143022_123.md",
    "timestamp": "20231225_143022_123",
    "size": 1024,
    "specs_file": "20231225_143022_123.specs",
    "access_url": "/api/550e8400-e29b-41d4-a716-446655440000/20231225_143022_123.html"
  }
}
```

**错误响应**:

```json
{
  "error": "不支持的文件格式"
}
```

**状态码**:
- `200`: 上传成功
- `400`: 请求错误（文件格式不支持、文件过大等）
- `401`: 未认证
- `500`: 服务器错误

### 2. 获取 .specs 文件内容

**端点**: `GET /api/<user_uuid>/<timestamp>.html`

**描述**: 根据用户 UUID 和时间戳获取对应的 .specs 文件内容

**认证**: 不需要（公开访问）

**参数**:
- `user_uuid` (路径参数): 用户的 UUID
- `timestamp` (路径参数): 文件的时间戳

**响应示例**:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "上传文件: test.md",
    "task_type": "document_analysis",
    "createdAt": "2023-12-25T14:30:22.123Z",
    "source_file": "test.md",
    "processing_model": "web-spec-backend"
  },
  "instructions": {
    "role_and_goal": "分析和处理用户上传的文档或文件"
  },
  "assets": {
    "files": {
      "test.md": {
        "asset_id": "file-20231225_143022_123",
        "state_chain": [
          {
            "state_id": "s0",
            "timestamp": "2023-12-25T14:30:22.123Z",
            "summary": "用户上传了文件: test.md",
            "content": "# 测试文档\n\n这是一个测试文档..."
          }
        ]
      }
    }
  },
  "examples": [],
  "history": [
    {
      "role": "user",
      "content": "上传了文件: test.md",
      "timestamp": "2023-12-25T14:30:22.123Z",
      "metadata": {
        "asset_reference": "file-20231225_143022_123:s0"
      }
    }
  ]
}
```

**错误响应**:

```json
{
  "error": "文件不存在"
}
```

**状态码**:
- `200`: 成功获取文件内容
- `400`: 请求格式错误（UUID或时间戳格式无效）
- `403`: 访问被拒绝
- `404`: 文件不存在
- `500`: 服务器错误

### 3. 获取用户上传文件列表

**端点**: `GET /api/uploads/list`

**描述**: 获取当前用户的所有上传文件列表

**认证**: 必需

**响应示例**:

```json
{
  "files": [
    {
      "timestamp": "20231225_143022_123",
      "specs_file": "20231225_143022_123.specs",
      "size": 2048,
      "created_at": "2023-12-25T14:30:22.123",
      "modified_at": "2023-12-25T14:30:22.123",
      "name": "上传文件: test.md",
      "task_type": "document_analysis",
      "source_file": "test.md",
      "access_url": "/api/550e8400-e29b-41d4-a716-446655440000/20231225_143022_123.html"
    }
  ],
  "total": 1
}
```

**状态码**:
- `200`: 成功获取列表
- `401`: 未认证
- `404`: 用户不存在
- `500`: 服务器错误

## 文件组织结构

上传的文件按以下结构组织：

```
backend/upload/
└── <user_uuid>/
    ├── <timestamp>.md          # 原始上传文件
    ├── <timestamp>.specs       # 自动生成的 specs 文件
    ├── <timestamp2>.py         # 其他上传文件
    └── <timestamp2>.specs      # 对应的 specs 文件
```

## 安全特性

1. **认证保护**: 上传功能需要有效的 JWT 令牌
2. **文件类型限制**: 仅允许安全的文件格式
3. **大小限制**: 最大文件大小 16MB
4. **路径安全**: 防止路径遍历攻击
5. **用户隔离**: 每个用户只能访问自己的文件

## .specs 文件格式

当上传非 .specs 文件时，系统会自动生成一个标准的 .specs 文件：

- **version**: 固定为 "1.0"
- **metadata**: 包含文件名、任务类型、创建时间等
- **instructions**: 处理指令和角色定位
- **assets**: 文件资产和状态链
- **examples**: 示例（空数组）
- **history**: 操作历史

## 使用示例

### 使用 curl 上传文件

```bash
curl -X POST \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@test.md" \
  http://localhost:5001/api/upload
```

### 使用 JavaScript 上传文件

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('上传成功:', data);
  // 可以通过 data.file_info.access_url 访问 specs 内容
});
```

### 获取 specs 文件内容

```javascript
fetch('/api/550e8400-e29b-41d4-a716-446655440000/20231225_143022_123.html')
.then(response => response.json())
.then(specs => {
  console.log('Specs 内容:', specs);
});
```

## 错误处理

所有错误响应都遵循统一格式：

```json
{
  "error": "错误描述信息"
}
```

常见错误：
- `没有选择文件`: 未提供文件
- `不支持的文件格式`: 文件格式不在允许列表中
- `无效的用户ID格式`: UUID 格式错误
- `文件不存在`: 请求的文件不存在
- `访问被拒绝`: 权限不足 