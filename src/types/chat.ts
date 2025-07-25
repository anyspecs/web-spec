export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  contextId?: string
  modelId: string
  createdAt: string
  updatedAt: string
}

export interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  maxTokens: number
  supportedFeatures: string[]
  pricing?: {
    inputTokens: number
    outputTokens: number
  }
  isAvailable: boolean
}

export interface ChatConfig {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface ChatRequest {
  messages: ChatMessage[]
  model: string
  config: ChatConfig
  contextId?: string
}

export interface ChatResponse {
  message: ChatMessage
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
} 