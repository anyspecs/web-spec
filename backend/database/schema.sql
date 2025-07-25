-- web-spec 数据库架构设计
-- 用户认证和数据管理

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,                -- 用户唯一标识
    email TEXT UNIQUE NOT NULL,               -- 邮箱
    name TEXT NOT NULL,                       -- 用户名
    avatar_url TEXT,                          -- 头像URL
    provider TEXT NOT NULL,                   -- SSO提供商 (google/microsoft/github)
    provider_id TEXT NOT NULL,                -- 提供商用户ID
    is_active BOOLEAN DEFAULT TRUE,           -- 账户状态
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, provider_id)             -- 防止同一提供商重复绑定
);

-- 用户会话表
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,               -- JWT令牌或会话ID
    expires_at DATETIME NOT NULL,             -- 过期时间
    ip_address TEXT,                          -- 登录IP
    user_agent TEXT,                          -- 用户代理
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 上下文文件表
CREATE TABLE context_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,                -- 文件唯一标识
    user_id INTEGER NOT NULL,                 -- 所属用户
    name TEXT NOT NULL,                       -- 文件名
    description TEXT,                         -- 文件描述
    file_type TEXT NOT NULL,                  -- 文件类型 (.ct, .json, .md, .txt, .html)
    file_size INTEGER NOT NULL,               -- 文件大小(字节)
    content TEXT,                             -- 文件内容
    system_prompt TEXT,                       -- 系统提示词
    processing_status TEXT DEFAULT 'pending', -- 处理状态 (pending/processing/completed/error)
    ai_summary TEXT,                          -- AI生成摘要
    processing_time INTEGER,                  -- 处理耗时(毫秒)
    tags TEXT,                                -- 标签(JSON数组)
    is_public BOOLEAN DEFAULT FALSE,          -- 是否公开
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 对话消息表
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    context_file_id INTEGER,                  -- 关联的上下文文件
    user_id INTEGER NOT NULL,                 -- 消息所属用户
    role TEXT NOT NULL,                       -- 角色 (user/assistant/system)
    content TEXT NOT NULL,                    -- 消息内容
    model TEXT,                               -- 使用的AI模型
    tokens_used INTEGER,                      -- 消耗的令牌数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (context_file_id) REFERENCES context_files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 文件资产表 (附件)
CREATE TABLE file_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    context_file_id INTEGER NOT NULL,         -- 关联的上下文文件
    name TEXT NOT NULL,                       -- 资产名称
    file_type TEXT NOT NULL,                  -- 文件类型
    file_size INTEGER NOT NULL,               -- 文件大小
    storage_path TEXT NOT NULL,               -- 存储路径
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (context_file_id) REFERENCES context_files(id) ON DELETE CASCADE
);

-- AI处理日志表
CREATE TABLE ai_processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    context_file_id INTEGER,
    provider TEXT NOT NULL,                   -- AI提供商 (kimi/gpt/claude)
    model TEXT NOT NULL,                      -- 模型名称
    prompt_tokens INTEGER,                    -- 输入令牌数
    completion_tokens INTEGER,                -- 输出令牌数
    total_tokens INTEGER,                     -- 总令牌数
    processing_time INTEGER,                  -- 处理时间(毫秒)
    status TEXT NOT NULL,                     -- 状态 (success/error)
    error_message TEXT,                       -- 错误信息
    cost DECIMAL(10,6),                       -- 成本(USD)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (context_file_id) REFERENCES context_files(id) ON DELETE SET NULL
);

-- 用户设置表
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    theme TEXT DEFAULT 'light',               -- 主题 (light/dark)
    language TEXT DEFAULT 'zh',               -- 语言
    default_ai_model TEXT DEFAULT 'kimi-k2-0711-preview',
    ai_temperature DECIMAL(3,2) DEFAULT 0.6, -- AI温度参数
    max_tokens INTEGER DEFAULT 1000,         -- 最大令牌数
    notifications_enabled BOOLEAN DEFAULT TRUE,
    settings_json TEXT,                       -- 其他设置(JSON)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_context_files_user_id ON context_files(user_id);
CREATE INDEX idx_context_files_uuid ON context_files(uuid);
CREATE INDEX idx_chat_messages_context_file_id ON chat_messages(context_file_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_ai_logs_user_id ON ai_processing_logs(user_id);
CREATE INDEX idx_ai_logs_created_at ON ai_processing_logs(created_at);

-- 创建触发器自动更新 updated_at 字段
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_context_files_timestamp 
    AFTER UPDATE ON context_files
    BEGIN
        UPDATE context_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_user_settings_timestamp 
    AFTER UPDATE ON user_settings
    BEGIN
        UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;