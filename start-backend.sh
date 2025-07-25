#!/bin/bash

echo "🚀 启动 Web-Spec 后端服务..."

# 检查是否安装了依赖
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ 找不到 requirements.txt 文件"
    exit 1
fi

# 进入后端目录
cd backend

# 检查是否安装了依赖
echo "📦 检查Python依赖..."
python3 -m pip show flask > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔧 安装Python依赖..."
    python3 -m pip install -r requirements.txt
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，请配置Google OAuth密钥"
    echo "📋 请参考 .env.example 文件"
    exit 1
fi

# 创建数据库目录
mkdir -p ../database

echo "✅ 启动后端服务 (http://localhost:5000)"
echo "💡 按 Ctrl+C 停止服务"
echo ""

# 启动服务
python3 run.py