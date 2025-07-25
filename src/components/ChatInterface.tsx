import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader, Copy, RotateCcw, FileText, User, Bot } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ChatMessage, ChatSession } from '@/types/chat'
import type { ContextFile as ContextFileType } from '@/types/context'

interface ChatInterfaceProps {
  session: ChatSession
  onSendMessage: (content: string) => Promise<void>
  isLoading?: boolean
  contextFile?: ContextFileType
}

export function ChatInterface({ session, onSendMessage, isLoading = false, contextFile }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue('')
    
    try {
      await onSendMessage(message)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Context Info */}
      {contextFile && (
        <div 
          className="p-3 border-b border-gray-200 flex items-center space-x-3"
          style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
        >
          <FileText className="w-4 h-4 text-gray-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              基于上下文: {contextFile.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {contextFile.description}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
            >
              <Bot className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">开始新对话</h3>
            <p className="text-gray-500 max-w-md">
              {contextFile 
                ? `基于 "${contextFile.name}" 上下文开始对话，AI将根据上下文内容来回答您的问题。`
                : '选择一个AI模型，开始您的对话之旅。'
              }
            </p>
          </div>
        ) : (
          <>
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3",
                  message.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === 'user' 
                      ? "bg-blue-600" 
                      : "bg-gray-600"
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div 
                  className={cn(
                    "flex-1 max-w-[80%]",
                    message.role === 'user' ? "text-right" : ""
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg p-3 text-sm",
                      message.role === 'user'
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Message Meta */}
                  <div 
                    className={cn(
                      "flex items-center space-x-2 mt-1 text-xs text-gray-500",
                      message.role === 'user' ? "justify-end" : ""
                    )}
                  >
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {message.model && (
                      <>
                        <span>•</span>
                        <span>{message.model}</span>
                      </>
                    )}
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="opacity-0 group-hover:opacity-100 hover:text-gray-700 transition-opacity"
                      title="复制"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Message */}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">AI正在思考...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div 
            className={cn(
              "relative border rounded-lg transition-colors",
              isInputFocused ? "border-blue-500" : "border-gray-200"
            )}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder={contextFile ? "基于上下文提问..." : "输入您的消息..."}
              className="w-full p-3 pr-12 resize-none border-none outline-none bg-transparent min-h-[44px] max-h-32"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-2 bottom-2 w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>按 Enter 发送，Shift + Enter 换行</span>
            <div className="flex items-center space-x-2">
              {session.messages.length > 0 && (
                <button
                  type="button"
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  onClick={() => {
                    // Clear conversation
                    console.log('Clear conversation')
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>清空对话</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 