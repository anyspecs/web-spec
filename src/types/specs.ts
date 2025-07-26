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
    task_type: 'general_chat' | 'document_analysis' | 'code_project' | 'debug' | 'chat_compression'
    createdAt: string
    source_file?: string
    processing_model?: string
  }
  instructions: {
    role_and_goal?: string  // 调试模式下可选
  }
  assets: {
    files: Record<string, FileAsset>  // 文件路径 -> FileAsset
  }
  examples?: ExampleItem[]
  history: HistoryItem[]
  // 新格式：聊天压缩数据
  compressed_context?: ChatCompressionResult
  // 调试模式下的原始API响应
  raw_api_response?: string
}

// 基于新提示词格式的压缩结果接口
export interface ChatCompressionResult {
  metadata: {
    original_length: number
    compression_time: string
    context_version: string
    priority_level: '高' | '中' | '低'
  }
  context_summary: {
    main_topic: string
    current_task: string
    user_intent: string
    conversation_stage: '开始' | '进行中' | '接近完成'
  }
  key_entities: {
    people: string[]
    concepts: string[]
    objects: string[]
    locations: string[]
    time_references: string[]
  }
  user_profile: {
    expertise_level: '新手' | '中级' | '专家'
    communication_style: '正式' | '随意' | '技术性'
    preferences: string[]
    constraints: string[]
  }
  decisions_made: Array<{
    decision: string
    reasoning: string
    status: string
  }>
  pending_issues: Array<{
    issue: string
    context: string
    priority: string
  }>
  resources_used: {
    tools: string[]
    files: string[]
    external_refs: string[]
  }
  conversation_flow: Array<{
    stage: string
    key_exchange: string
    outcome: string
  }>
  context_restoration: {
    role_continuation: string
    conversation_tone: string
    knowledge_assumptions: string
    next_expected_action: string
  }
  receiver_instructions: {
    context_understanding: string
    response_requirements: string[]
    mandatory_reply: string
    forbidden_actions: string
  }
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