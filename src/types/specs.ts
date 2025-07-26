// 统一的.specs文件类型定义 - 所有字段可选

export interface StateChainItem {
  state_id?: string
  timestamp?: string
  summary?: string
  content?: string  // 初始状态(s0)使用content，包含完整内容
  patch?: string    // 后续状态使用patch，采用diff格式记录变化
  metadata?: {
    [key: string]: any
  }
}

export interface FileAsset {
  asset_id?: string
  state_chain?: StateChainItem[]
}

export interface HistoryItem {
  role?: 'user' | 'assistant' | 'system'
  content?: string
  timestamp?: string
  metadata?: {
    asset_reference?: string  // 如 "file-001:s1"  
    [key: string]: any
  }
}

export interface ExampleItem {
  context?: string
  usage?: string
  source?: string
}

// 统一的.specs文件结构 - 所有字段可选
export interface SpecsFile {
  version?: string
  metadata?: {
    name?: string
    task_type?: 'general_chat' | 'document_analysis' | 'code_project' | 'chat_compression'
    createdAt?: string
    source_file?: string
    source_platform?: string
    analysis_model?: string
    processing_model?: string
    project?: string
    project_path?: string
    session_id?: string
    original_date?: string
  }
  instructions?: {
    role_and_goal?: string
    context?: string
    key_topics?: string[]
  }
  assets?: {
    files?: Record<string, FileAsset>  // 文件路径 -> FileAsset
  }
  examples?: ExampleItem[]
  history?: HistoryItem[]
  // 聊天压缩专用字段
  compressed_context?: ChatCompressionResult
  // 原始API响应(调试用)
  raw_api_response?: string
}

// 聊天压缩结果接口 - 所有字段可选
export interface ChatCompressionResult {
  metadata?: {
    original_length?: number
    compression_time?: string
    context_version?: string
    priority_level?: string
  }
  context_summary?: {
    main_topic?: string
    current_task?: string
    user_intent?: string
    conversation_stage?: string
  }
  key_entities?: {
    people?: string[]
    concepts?: string[]
    objects?: string[]
    locations?: string[]
    time_references?: string[]
  }
  user_profile?: {
    expertise_level?: string
    communication_style?: string
    preferences?: string[]
    constraints?: string[]
  }
  decisions_made?: Array<{
    decision?: string
    reasoning?: string
    status?: string
  }>
  pending_issues?: Array<{
    issue?: string
    context?: string
    priority?: string
  }>
  resources_used?: {
    tools?: string[]
    files?: string[]
    external_refs?: string[]
  }
  conversation_flow?: Array<{
    stage?: string
    key_exchange?: string
    outcome?: string
  }>
  context_restoration?: {
    role_continuation?: string
    conversation_tone?: string
    knowledge_assumptions?: string
    next_expected_action?: string
  }
  receiver_instructions?: {
    context_understanding?: string
    response_requirements?: string[]
    mandatory_reply?: string
    forbidden_actions?: string
  }
}

// 用于API分析结果的接口 - 所有字段可选
export interface ContextAnalysisResult {
  metadata?: {
    name?: string
    task_type?: 'general_chat' | 'document_analysis' | 'code_project'
  }
  instructions?: {
    role_and_goal?: string
  }
  assets?: {
    files?: Record<string, {
      asset_id?: string
      state_chain?: Array<{
        state_id?: string
        timestamp?: string
        summary?: string
        content?: string
        patch?: string
      }>
    }>
  }
  examples?: ExampleItem[]
  history?: Array<{
    role?: 'user' | 'assistant' | 'system'
    content?: string
    timestamp?: string
    metadata?: {
      asset_reference?: string
    }
  }>
}

// 生成选项 - 所有字段可选
export interface SpecsGenerationOptions {
  outputDir?: string
  customFileName?: string
  includeSourceFile?: boolean
}

// 默认值常量
export const SPECS_DEFAULTS = {
  version: "1.0",
  metadata: {
    name: "未命名文件",
    task_type: "general_chat" as const,
    createdAt: new Date().toISOString()
  },
  instructions: {},
  assets: { files: {} },
  examples: [],
  history: []
}

// 安全获取specs字段的工具函数
export function getSpecsField<T>(specs: SpecsFile | undefined, path: string, defaultValue: T): T {
  if (!specs) return defaultValue
  
  const keys = path.split('.')
  let current: any = specs
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return defaultValue
    }
  }
  
  return current !== undefined ? current : defaultValue
}