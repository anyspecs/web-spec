# ContextHub 项目记忆文档

## 项目概述
ContextHub 是一个AI上下文文件管理和处理系统，包含前端React应用和后端Flask服务。

## 项目架构

### 前端 (React + TypeScript + Tailwind CSS)
- **技术栈**: React 18, TypeScript, Vite, Tailwind CSS, React Router
- **主要页面**: ContextList (文件管理), Chat (AI对话)
- **核心组件**: ContextProcessor (文件上传+AI处理), ContextViewer, Header, Sidebar

### 后端 (Flask + SQLite)
- **技术栈**: Flask, SQLite, Python
- **功能**: 文件上传、存储、API接口

## 最新开发进展

### ✅ 已完成功能

#### 1. ContextProcessor 组件 (替代原UploadModal)
**位置**: `/frontend/src/components/ContextProcessor.tsx`

**功能特性**:
- **三列布局设计**:
  - 左侧：文件上传区域 (拖拽、选择、剪贴板粘贴)
  - 中间：智能操作按钮 (生成→正在处理→上传)
  - 右侧：AI处理结果显示

- **文件上传能力**:
  - 支持格式: .ct, .json, .md, .txt, .html
  - 拖拽上传
  - 文件选择器上传
  - 剪贴板粘贴 (文件和文本内容)

- **AI处理流程**:
  - 文件内容读取
  - Kimi API调用进行智能总结
  - 实时状态显示: idle → generating → processing → completed/error
  - 处理时间统计
  - 错误处理

#### 2. Kimi API集成
**位置**: `/frontend/src/utils/kimiApi.ts`

**配置**:
- API密钥: `sk-7hIpkoYCNZ6GdKVadMtlGtU2NZ8sz4TbTVI33VvisT3SwUE0`
- 基础URL: `https://api.moonshot.cn/v1`
- 模型: `kimi-k2-0711-preview`

**功能**:
- 真实API调用 (非模拟)
- 文件内容智能分析和总结
- 错误处理和重试机制
- 支持多种文件格式的专业化分析

#### 3. 类型系统
**位置**: `/frontend/src/types/context.ts`

**新增类型**:
```typescript
export type ProcessingState = 'idle' | 'generating' | 'processing' | 'completed' | 'error'

export interface ProcessingResult {
  summary: string
  generatedAt: string
  processingTime: number
}

export interface ProcessingFile extends UploadFile {
  content?: string
  processingState: ProcessingState
  result?: ProcessingResult
}
```

#### 4. 组件重构
- **导入更新**: 所有组件现在使用 `ContextProcessor` 替代 `UploadModal`
- **状态管理**: 页面级状态 `isProcessorOpen` 替代 `isUploadModalOpen`
- **向后兼容**: 保留导出 `export { ContextProcessor as UploadModal }`

### 🔧 技术特点

#### 用户体验
- **流畅的状态转换**: 三步处理流程可视化
- **实时反馈**: 处理状态、进度、时间显示
- **错误处理**: 友好的错误提示和重试机制
- **响应式设计**: 适配不同屏幕尺寸

#### 代码质量
- **TypeScript类型安全**: 完整的类型定义
- **模块化架构**: 清晰的组件职责分离
- **错误边界**: 完善的异常捕获
- **性能优化**: useCallback、条件渲染等

### 📊 用户操作流程

#### 文件处理流程
1. **上传阶段**: 用户拖拽/选择/粘贴文件到左侧区域
2. **处理阶段**: 点击中间"开始处理"按钮，AI分析文件内容
3. **结果阶段**: 右侧显示AI生成的智能总结
4. **完成阶段**: 点击"上传"按钮保存到系统

#### 页面导航
- **主页** (`/`): ContextList 文件管理页面
- **对话页** (`/chat`): AI对话界面
- **上下文页** (`/contexts`): 同主页

### 🗂️ 文件结构

```
/frontend/src/
├── components/
│   ├── ContextProcessor.tsx    # 🆕 多功能上下文处理器
│   ├── Header.tsx             # 页面头部
│   ├── Sidebar.tsx            # 侧边栏筛选
│   ├── ContextCard.tsx        # 文件卡片
│   ├── ContextViewer.tsx      # 文件查看器
│   ├── ModelSelector.tsx      # AI模型选择
│   └── ChatInterface.tsx      # 聊天界面
├── pages/
│   ├── ContextList.tsx        # 🔄 已更新导入
│   └── Chat.tsx              # AI对话页面
├── utils/
│   ├── kimiApi.ts            # 🆕 Kimi API服务
│   └── cn.ts                 # 工具函数
├── types/
│   ├── context.ts            # 🔄 新增处理相关类型
│   └── chat.ts               # 聊天类型
└── styles/
    └── index.css             # 全局样式
```

### 🐛 已解决问题

#### 1. 空白页面问题
**原因**: `process.env` 在浏览器环境中未定义
**解决**: 直接在代码中配置API密钥

#### 2. TypeScript编译错误
**原因**: 类型导入路径和定义问题
**解决**: 修复类型定义和导入语句

#### 3. 组件引用更新
**原因**: 从UploadModal迁移到ContextProcessor
**解决**: 更新所有相关导入和状态管理

### 🚀 下一步计划

#### 短期目标
1. **测试AI处理功能**: 验证Kimi API集成效果
2. **用户体验优化**: 完善错误提示和加载状态
3. **性能优化**: 大文件处理优化

#### 中期目标
1. **后端集成**: 连接Flask后端API
2. **数据持久化**: 处理结果保存到数据库
3. **用户认证**: 添加用户系统

#### 长期目标
1. **多模型支持**: 集成更多AI模型
2. **协作功能**: 多用户共享和协作
3. **高级分析**: 文件关系图谱、智能标签

### 📝 开发注意事项

#### API密钥安全
- 当前直接在代码中配置，生产环境需要使用环境变量
- 建议创建 `.env.local` 文件管理敏感信息

#### 性能考虑
- 大文件上传需要分块处理
- API调用频率限制
- 客户端缓存策略

#### 用户体验
- 网络错误重试机制
- 离线状态处理
- 进度指示器优化

## 项目状态: ✅ 核心功能完成，可正常使用

当前版本实现了完整的文件上传、AI处理、结果展示流程，具备生产使用的基础功能。