import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, Settings, FileText, User as UserIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ModelSelector } from '@/components/ModelSelector'
import { ChatInterface } from '@/components/ChatInterface'
import type { ChatSession, AIModel, ChatConfig, ChatMessage } from '@/types/chat'
import type { ContextFile } from '@/types/context'
import type { User } from '@/types/user'

// Mock data
const mockModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: '最强大的语言模型，适合复杂任务',
    maxTokens: 8192,
    supportedFeatures: ['text', 'code', 'analysis'],
    pricing: { inputTokens: 0.03, outputTokens: 0.06 },
    isAvailable: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: '快速且经济的模型，适合日常对话',
    maxTokens: 4096,
    supportedFeatures: ['text', 'code'],
    pricing: { inputTokens: 0.001, outputTokens: 0.002 },
    isAvailable: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: '平衡性能和成本的优秀选择',
    maxTokens: 200000,
    supportedFeatures: ['text', 'analysis'],
    pricing: { inputTokens: 0.003, outputTokens: 0.015 },
    isAvailable: true
  }
]

const defaultConfig: ChatConfig = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0
}

interface ChatProps {
  user: User | null
  onLogout: () => void
}

export function Chat({ user, onLogout }: ChatProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const contextId = searchParams.get('context')
  
  const [selectedModel, setSelectedModel] = useState<AIModel>(mockModels[0])
  const [config, setConfig] = useState<ChatConfig>(defaultConfig)
  const [session, setSession] = useState<ChatSession>(() => ({
    id: Date.now().toString(),
    title: '新对话',
    messages: [],
    contextId: contextId || undefined,
    modelId: mockModels[0].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))
  const [isLoading, setIsLoading] = useState(false)
  const [contextFile, setContextFile] = useState<ContextFile | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Load context file if contextId is provided
  useEffect(() => {
    if (contextId) {
      // Mock context file loading
      const mockContext: ContextFile = {
        id: contextId,
        name: "项目需求文档.ct",
        description: "这是一个包含项目需求和规格的上下文文件，详细描述了功能和技术要求。",
        updated_at: "2023-11-23T14:30:45Z",
        size: "1.2MB",
        system_prompt: "你是一个专业的产品经理助手，擅长分析和梳理项目需求。",
        conversation: [
          {
            id: "1",
            role: "user",
            content: "请帮我总结一下这个项目的核心功能需求",
            timestamp: "2023-11-23T14:30:45Z"
          }
        ],
        assets: []
      }
      setContextFile(mockContext)
      
      // Add system message if context has system prompt
      if (mockContext.system_prompt) {
        const systemMessage: ChatMessage = {
          id: 'system-' + Date.now(),
          role: 'system',
          content: mockContext.system_prompt,
          timestamp: new Date().toISOString()
        }
        setSession(prev => ({
          ...prev,
          messages: [systemMessage],
          title: `基于 ${mockContext.name} 的对话`
        }))
      }
    }
  }, [contextId])

  const handleSendMessage = async (content: string): Promise<void> => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      model: selectedModel.id
    }

    // Add user message
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      updatedAt: new Date().toISOString()
    }))

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      // Mock AI response
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(content, contextFile),
        timestamp: new Date().toISOString(),
        model: selectedModel.id
      }

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        updatedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get AI response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockResponse = (userMessage: string, context?: ContextFile | null): string => {
    if (context) {
      return `基于 "${context.name}" 上下文，我来回答您的问题：\n\n${userMessage}\n\n根据上下文内容，这个问题涉及到项目的核心功能需求。让我为您详细分析一下相关的技术要求和实现方案。\n\n如果您需要更具体的信息，请告诉我您想了解哪个方面的详细内容。`
    }
    
    const responses = [
      `您好！我理解您的问题。让我来为您详细解答：\n\n${userMessage}\n\n这是一个很好的问题。根据我的理解，我建议从以下几个方面来考虑...`,
      `感谢您的提问。关于"${userMessage}"，我的建议是：\n\n1. 首先需要明确目标和需求\n2. 然后制定详细的实施计划\n3. 最后进行测试和优化\n\n您还有其他相关问题吗？`,
      `这是一个很有意思的话题。让我从不同角度来分析一下：\n\n${userMessage}\n\n从技术角度来看，我们需要考虑可行性、成本和时间等因素。您希望我重点讲解哪个方面呢？`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model)
    setSession(prev => ({
      ...prev,
      modelId: model.id
    }))
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div 
        className={`${isSidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary btn-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <h1 className="text-lg font-semibold text-gray-900">AI 对话</h1>
          </div>
          
          {contextFile && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>基于上下文</span>
            </div>
          )}
        </div>

        {/* Model Selector */}
        <div className="p-4 flex-1 overflow-y-auto">
          <ModelSelector
            models={mockModels}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            config={config}
            onConfigChange={setConfig}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {session.title}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>模型: {selectedModel.name}</span>
                  {contextFile && (
                    <>
                      <span>•</span>
                      <span>基于上下文</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500">
                {session.messages.filter(m => m.role !== 'system').length} 条消息
              </div>
              
              {user && (
                <div className="flex items-center space-x-2 ml-4">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="text-sm text-gray-600">{user.name}</div>
                  <button
                    onClick={onLogout}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    退出
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 bg-white">
          <ChatInterface
            session={session}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            contextFile={contextFile || undefined}
          />
        </div>
      </div>
    </div>
  )
} 