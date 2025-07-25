// 基于状态链的.specs文件类型定义

export interface StateChainItem {
  state_id: string
  timestamp: string
  summary: string
  content?: string  // 初始状态(s0)使用content，包含完整内容
  patch?: string    // 后续状态使用patch，采用diff格式记录变化
  metadata?: {
    [key: string]: any
  }
}

export interface FileAsset {
  asset_id: string
  state_chain: StateChainItem[]
}

export interface HistoryItem {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    asset_reference?: string  // 如 "file-001:s1"  
    [key: string]: any
  }
}

export interface ExampleItem {
  context: string
  usage: string
}

export interface SpecsFile {
  version: string
  metadata: {
    name: string
    task_type: 'general_chat' | 'document_analysis' | 'code_project'
    createdAt: string
    source_file?: string
    processing_model?: string
  }
  instructions: {
    role_and_goal: string
  }
  assets: {
    files: Record<string, FileAsset>  // 文件路径 -> FileAsset
  }
  examples?: ExampleItem[]
  history: HistoryItem[]
}

// 用于API分析结果的接口
export interface ContextAnalysisResult {
  metadata: {
    name: string
    task_type: 'general_chat' | 'document_analysis' | 'code_project'
  }
  instructions: {
    role_and_goal: string
  }
  assets: {
    files: Record<string, {
      asset_id: string
      state_chain: Array<{
        state_id: string
        timestamp: string
        summary: string
        content?: string
        patch?: string
      }>
    }>
  }
  examples?: ExampleItem[]
  history: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    metadata?: {
      asset_reference?: string
    }
  }>
}

// 生成选项
export interface SpecsGenerationOptions {
  outputDir?: string
  customFileName?: string
  includeSourceFile?: boolean
}