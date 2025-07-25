# ContextHub Frontend

简洁的 ContextHub 前端界面，参考 GitHub 设计风格，专注于 .ct 文件的管理功能。

## 功能特性

- 🎨 **简洁设计**：参考 GitHub 的设计语言，界面清晰
- 📁 **文件上传**：支持拖拽上传 .ct 文件
- 📥 **文件下载**：一键下载 .ct 文件
- 🔍 **智能搜索**：支持按文件名和描述搜索
- 📊 **排序功能**：按更新时间、文件名、大小排序
- 🗑️ **文件管理**：查看、下载、删除、分享功能
- 👁️ **内容预览**：点击卡片查看完整的上下文内容
- ✏️ **在线编辑**：直接在界面中编辑系统提示词和对话历史
- 🌙 **主题切换**：支持浅色/深色模式切换

## 主要页面

### 1. 首页（Context 列表页）
- 显示所有 .ct 文件（卡片形式）
- 支持搜索和排序
- 文件操作：查看、下载、删除、分享

### 2. 上传模态框
- 拖拽或点击上传 .ct 文件
- 支持多文件上传
- 文件状态显示

### 3. 上下文查看器
- **预览模式**：查看完整的上下文内容
- **编辑模式**：在线编辑系统提示词和对话历史
- **可折叠区域**：System Prompt、对话历史、附件列表
- **实时保存**：编辑后直接保存到列表

## 技术栈

- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Lucide React** - 图标库

## 快速开始

### 安装依赖
```bash
cd frontend
npm install
```

### 开发模式
```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本
```bash
npm run build
```

## 项目结构

```
frontend/
├── src/
│   ├── components/          # 组件
│   │   ├── Header.tsx      # 页面头部
│   │   ├── UploadModal.tsx # 上传模态框
│   │   ├── ContextCard.tsx # 文件卡片
│   │   └── ContextViewer.tsx # 上下文查看器
│   ├── pages/              # 页面
│   │   └── ContextList.tsx # 文件列表页
│   ├── types/              # 类型定义
│   │   └── context.ts      # 上下文文件类型
│   ├── utils/              # 工具函数
│   │   └── cn.ts           # CSS 类名合并
│   ├── styles/             # 样式文件
│   │   └── index.css       # 全局样式
│   ├── App.tsx             # 主应用
│   └── main.tsx            # 应用入口
├── package.json            # 项目配置
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── tsconfig.json           # TypeScript 配置
```

## 数据结构

```typescript
interface ContextFile {
  id: string
  name: string
  description: string
  updated_at: string
  size: string
  system_prompt?: string
  conversation?: Message[]
  assets?: Asset[]
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface Asset {
  id: string
  name: string
  type: string
  size: string
  url?: string
}
```

## 使用指南

### 查看上下文内容
1. 在文件列表中点击任意卡片的"查看"按钮
2. 在弹出的查看器中浏览完整内容
3. 可以展开/折叠不同的内容区域

### 编辑上下文内容
1. 在查看器中点击"编辑"按钮
2. 修改系统提示词、描述或对话历史
3. 点击"保存"按钮应用更改

### 管理对话历史
- 在编辑模式下可以添加新消息
- 可以删除不需要的消息
- 支持修改消息内容

## 设计特点

- **GitHub 风格**：简洁的卡片设计和布局
- **响应式**：支持桌面和移动设备
- **交互友好**：清晰的按钮和状态反馈
- **性能优化**：快速的搜索和排序
- **可折叠界面**：节省空间，提高浏览效率 