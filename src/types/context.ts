// 简化的上下文文件数据结构
export interface ContextFile {
  id: string
  name: string
  description: string
  updated_at: string
  size: string
  system_prompt?: string
  conversation?: Message[]
  assets?: Asset[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface Asset {
  id: string
  name: string
  type: string
  size: string
  url?: string
}

// 上传文件的状态
export interface UploadFile {
  file: File
  name: string
  size: string
  status: 'uploading' | 'success' | 'error'
  error?: string
}

// 处理状态
export type ProcessingState = 'idle' | 'generating' | 'processing' | 'completed' | 'error'

// 处理结果
export interface ProcessingResult {
  summary: string
  generatedAt: string
  processingTime: number
}

// .specs文件处理结果 - 更新为状态链结构
export interface SpecsProcessingResult extends ProcessingResult {
  specsFile?: import('@/types/specs').SpecsFile | null // 生成的.specs文件数据，调试模式下可为null
  specsFileName?: string | null // .specs文件名，调试模式下可为null
  contextAnalysis?: import('@/types/specs').ContextAnalysisResult // AI分析的原始结果
}

// 文件处理接口
export interface ProcessingFile extends UploadFile {
  content?: string
  processingState: ProcessingState
  result?: SpecsProcessingResult
}

// 用户上传的文件接口 - 对应后端API返回格式
export interface UserUploadedFile {
  timestamp: string
  original_name: string
  saved_name: string
  size: number
  created_at: string
  modified_at: string
  name: string
  task_type: string
  source_file: string
  specs_file?: string | null
  access_url: string
}

// 后端API响应格式
export interface UserUploadsResponse {
  files: UserUploadedFile[]
  total: number
  user_uuid: string
} 