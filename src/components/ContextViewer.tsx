import React, { useState } from 'react'
import { X, Download, Copy, Edit, Save, MessageSquare, FileText, ChevronDown, ChevronRight, ArrowLeft, MessageCircle, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { ContextFile, Message, Asset } from '@/types/context'

interface ContextViewerProps {
  context: ContextFile | null
  isOpen: boolean
  onClose: () => void
  onSave: (context: ContextFile) => void
  onDownload: (context: ContextFile) => void
}

export function ContextViewer({ context, isOpen, onClose, onSave, onDownload }: ContextViewerProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContext, setEditedContext] = useState<ContextFile | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    systemPrompt: true,
    conversation: true,
    assets: true
  })

  if (!isOpen || !context) return null

  // Initialize edit state
  if (!editedContext && isEditing) {
    setEditedContext({ ...context })
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditedContext({ ...context })
  }

  const handleSave = () => {
    if (editedContext) {
      onSave(editedContext)
      setIsEditing(false)
      setEditedContext(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContext(null)
  }

  const updateSystemPrompt = (value: string) => {
    if (editedContext) {
      setEditedContext({
        ...editedContext,
        system_prompt: value
      })
    }
  }

  const updateDescription = (value: string) => {
    if (editedContext) {
      setEditedContext({
        ...editedContext,
        description: value
      })
    }
  }

  const addMessage = () => {
    if (editedContext) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: '',
        timestamp: new Date().toISOString()
      }
      
      setEditedContext({
        ...editedContext,
        conversation: [...(editedContext.conversation || []), newMessage]
      })
    }
  }

  const updateMessage = (index: number, content: string) => {
    if (editedContext && editedContext.conversation) {
      const updatedConversation = [...editedContext.conversation]
      updatedConversation[index] = {
        ...updatedConversation[index],
        content
      }
      
      setEditedContext({
        ...editedContext,
        conversation: updatedConversation
      })
    }
  }

  const removeMessage = (index: number) => {
    if (editedContext && editedContext.conversation) {
      const updatedConversation = editedContext.conversation.filter((_, i) => i !== index)
      setEditedContext({
        ...editedContext,
        conversation: updatedConversation
      })
    }
  }

  const currentContext = isEditing ? editedContext : context

  return (
    <div 
      className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(7, 11, 17, 0.5)' }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
      >
        {/* Header */}
        <div className="header flex items-center w-full px-6">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </button>
            <h1 
              className="ml-4 text-xl font-medium"
              style={{ color: 'rgba(7, 11, 17, 1)' }}
            >
              {currentContext?.name}
            </h1>
          </div>
          
          <div className="flex-1"></div>
          
          <div className="flex items-center">
            {!isEditing && (
              <>
                <button
                  onClick={handleEdit}
                  className="btn btn-secondary btn-sm mr-3"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑副本
                </button>
                <button
                  onClick={() => navigate(`/chat?context=${context.id}`)}
                  className="btn btn-secondary btn-sm mr-3"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  继续对话
                </button>
                <button
                  onClick={() => onDownload(context)}
                  className="btn btn-primary btn-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </button>
              </>
            )}
            
            {isEditing && (
              <>
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary btn-sm mr-3"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary btn-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto pt-6 pr-6 pb-6 pl-6">
          <div 
            className="pt-6 pr-6 pb-6 pl-6 rounded-lg"
            style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
          >
            {/* 上下文概览 */}
            <section className="mb-6">
              <h2 className="mb-4 text-base font-medium">上下文概览</h2>
              <div 
                className="pt-4 pr-4 pb-4 pl-4 rounded-md"
                style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p 
                      className="mb-1 text-xs"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      文件名
                    </p>
                    <p className="text-sm font-medium">{currentContext?.name}</p>
                  </div>
                  <div>
                    <p 
                      className="mb-1 text-xs"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      大小
                    </p>
                    <p className="text-sm">{currentContext?.size}</p>
                  </div>
                  <div>
                    <p 
                      className="mb-1 text-xs"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      描述
                    </p>
                    {isEditing ? (
                      <textarea
                        value={currentContext?.description || ''}
                        onChange={(e) => updateDescription(e.target.value)}
                        className="textarea text-sm"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm">{currentContext?.description}</p>
                    )}
                  </div>
                  <div>
                    <p 
                      className="mb-1 text-xs"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      更新时间
                    </p>
                    <p className="text-sm">
                      {currentContext?.updated_at && 
                        new Date(currentContext.updated_at).toLocaleString('zh-CN')
                      }
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* System Prompt */}
            <section className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-medium">系统提示词</h2>
                <button
                  onClick={() => toggleSection('systemPrompt')}
                  className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
                  style={{ color: 'rgba(136, 138, 139, 1)' }}
                >
                  {expandedSections.systemPrompt ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {expandedSections.systemPrompt && (
                <div 
                  className="collapsible-section"
                  style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
                >
                  {isEditing ? (
                    <textarea
                      value={currentContext?.system_prompt || ''}
                      onChange={(e) => updateSystemPrompt(e.target.value)}
                      className="textarea font-mono text-sm w-full"
                      rows={6}
                      placeholder="输入系统提示词..."
                    />
                  ) : (
                    <p className="text-sm">
                      {currentContext?.system_prompt || '暂无系统提示词'}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 对话历史 */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => toggleSection('conversation')}
                  className="flex items-center"
                >
                  <h2 className="text-base font-medium flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    对话历史
                  </h2>
                  {expandedSections.conversation ? (
                    <ChevronDown className="w-4 h-4 ml-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-2" />
                  )}
                </button>
                
                {isEditing && (
                  <button
                    onClick={addMessage}
                    className="btn btn-secondary btn-sm"
                  >
                    添加消息
                  </button>
                )}
              </div>
              
              {expandedSections.conversation && (
                <div className="space-y-4">
                  {currentContext?.conversation && currentContext.conversation.length > 0 ? (
                    currentContext.conversation.map((message, index) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "chat-bubble p-3",
                            message.role === 'user' 
                              ? "chat-bubble-user" 
                              : "chat-bubble-assistant"
                          )}
                        >
                          {isEditing && (
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                "px-2 py-1 text-xs font-medium rounded",
                                message.role === 'user' 
                                  ? "bg-gray-700 text-white" 
                                  : "bg-gray-200 text-gray-800"
                              )}>
                                {message.role === 'user' ? '用户' : '助手'}
                              </span>
                              <button
                                onClick={() => removeMessage(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          
                          {isEditing ? (
                            <textarea
                              value={message.content}
                              onChange={(e) => updateMessage(index, e.target.value)}
                              className="textarea text-sm w-full bg-transparent border-none"
                              rows={3}
                              placeholder="输入消息内容..."
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p 
                      className="text-center py-4"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      暂无对话历史
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 附件列表 */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-medium flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  附件
                </h2>
                <button
                  onClick={() => toggleSection('assets')}
                  className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
                  style={{ color: 'rgba(136, 138, 139, 1)' }}
                >
                  {expandedSections.assets ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {expandedSections.assets && (
                <div>
                  {currentContext?.assets && currentContext.assets.length > 0 ? (
                    <div className="space-y-3">
                      {currentContext.assets.map((asset) => (
                        <div 
                          key={asset.id} 
                          className="flex items-center pt-4 pr-4 pb-4 pl-4 rounded-md"
                          style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
                        >
                          <div 
                            className="flex justify-center items-center w-8 h-8 mr-3 rounded-md"
                            style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
                          >
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <h4 
                                className="text-sm font-medium truncate"
                                style={{ color: 'rgba(7, 11, 17, 1)' }}
                              >
                                {asset.name}
                              </h4>
                              <div className="flex ml-2">
                                <button 
                                  className="flex justify-center items-center w-8 h-8 hover:bg-gray-200 rounded transition-colors"
                                  style={{ color: 'rgba(136, 138, 139, 1)' }}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  className="flex justify-center items-center w-8 h-8 hover:bg-gray-200 rounded transition-colors"
                                  style={{ color: 'rgba(136, 138, 139, 1)' }}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center mt-1">
                              <span 
                                className="text-xs"
                                style={{ color: 'rgba(136, 138, 139, 1)' }}
                              >
                                {asset.type} • {asset.size}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p 
                      className="text-center py-4"
                      style={{ color: 'rgba(136, 138, 139, 1)' }}
                    >
                      暂无附件
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 