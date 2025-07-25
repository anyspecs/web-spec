#!/usr/bin/env python3
"""
Web-Spec 后端启动脚本
"""

import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 将当前目录添加到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, init_db

if __name__ == '__main__':
    # 初始化数据库
    init_db()
    
    # 启动应用
    port = int(os.getenv('PORT', 5001))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"启动 Web-Spec 后端服务...")
    print(f"地址: http://{host}:{port}")
    print(f"调试模式: {debug}")
    
    app.run(debug=debug, port=port, host=host)