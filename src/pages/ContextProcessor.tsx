import React, { useCallback, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload, X, FileText, AlertCircle, CheckCircle, Cloud, FolderOpen, Loader, ArrowRight, Sparkles, Clock, Copy, Save } from 'lucide-react'
import { cn } from '@/utils/cn'
import { processFileWithKimi, readFileContent } from '@/utils/kimiApi'
import { generateSpecsFile, downloadSpecsFile, generateSpecsFileName } from '@/utils/specsGenerator'
import { Header } from '@/components/Header'
import type { UploadFile, ProcessingFile, ProcessingState, SpecsProcessingResult } from '@/types/context'
import type { User } from '@/types/user'
import type { SpecsFile } from '@/types/specs'

interface ContextProcessorProps {
  user: User | null
  onLogout: () => void
}

export function ContextProcessor({ user, onLogout }: ContextProcessorProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dragActive, setDragActive] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'process' | 'complete'>('upload')
  const [processingProgress, setProcessingProgress] = useState(0)

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault()
    
    const clipboardData = e.clipboardData
    if (!clipboardData) return

    // 处理文件
    if (clipboardData.files.length > 0) {
      const files = Array.from(clipboardData.files)
      const validFiles = files.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop()
        return ['ct', 'json', 'md', 'txt', 'html'].includes(extension || '')
      })
      
      const newUploadFiles: UploadFile[] = validFiles.map(file => ({
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'uploading'
      }))
      
      setUploadFiles(prev => [...prev, ...newUploadFiles])
    }
    // 处理文本内容
    else if (clipboardData.getData('text')) {
      const textContent = clipboardData.getData('text')
      const blob = new Blob([textContent], { type: 'text/plain' })
      const file = new File([blob], `clipboard-${Date.now()}.txt`, { type: 'text/plain' })
      
      const newUploadFile: UploadFile = {
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'uploading'
      }
      
      setUploadFiles(prev => [...prev, newUploadFile])
    }
  }, [])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      const validFiles = files.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop()
        return ['ct', 'json', 'md', 'txt', 'html'].includes(extension || '')
      })
      
      const newUploadFiles: UploadFile[] = validFiles.map(file => ({
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'uploading'
      }))
      
      setUploadFiles(prev => [...prev, ...newUploadFiles])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      const files = Array.from(selectedFiles)
      const validFiles = files.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop()
        return ['ct', 'json', 'md', 'txt', 'html'].includes(extension || '')
      })
      
      const newUploadFiles: UploadFile[] = validFiles.map(file => ({
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'uploading'
      }))
      
      setUploadFiles(prev => [...prev, ...newUploadFiles])
    }
  }

  const handleProcess = async () => {
    if (uploadFiles.length === 0) return

    setCurrentStep('process')
    setProcessingProgress(0)
    
    // 转换为ProcessingFile格式
    const files: ProcessingFile[] = uploadFiles.map(file => ({
      ...file,
      processingState: 'idle' as ProcessingState
    }))
    
    setProcessingFiles(files)

    // 依次处理每个文件
    for (let i = 0; i < files.length; i++) {
      try {
        // 更新状态为处理中
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { ...file, processingState: 'generating' } : file
        ))

        // 读取文件内容
        const content = await readFileContent(files[i].file)
        
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { ...file, content, processingState: 'processing' } : file
        ))

        // 调用Kimi API处理并生成.specs文件
        const apiResult = await processFileWithKimi(content, files[i].name)
        
        // 生成.specs文件 - 使用新的状态链结构
        const specsFile = generateSpecsFile(
          files[i].name,
          content,
          apiResult.contextAnalysis,
          apiResult.processingTime
        )
        
        const specsFileName = generateSpecsFileName(
          files[i].name, 
          apiResult.contextAnalysis.metadata.name
        )
        
        const result: SpecsProcessingResult = {
          summary: apiResult.summary,
          generatedAt: apiResult.generatedAt,
          processingTime: apiResult.processingTime,
          specsFile,
          specsFileName,
          contextAnalysis: apiResult.contextAnalysis
        }
        
        // 更新结果
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { 
            ...file, 
            processingState: 'completed',
            result 
          } : file
        ))

        // 更新进度
        setProcessingProgress(Math.round(((i + 1) / files.length) * 100))
      } catch (error) {
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { 
            ...file, 
            processingState: 'error',
            error: error instanceof Error ? error.message : '处理失败'
          } : file
        ))

        // 更新进度（即使出错也要更新）
        setProcessingProgress(Math.round(((i + 1) / files.length) * 100))
      }
    }

    setCurrentStep('complete')
  }

  const handleUpload = async () => {
    const completedFiles = processingFiles.filter(f => f.processingState === 'completed')
    if (completedFiles.length === 0) return

    // 生成唯一ID
    const uploadId = Date.now().toString(36) + Math.random().toString(36).substring(2)
    
    setTimeout(() => {
      // 上传成功后，在URL中添加id参数
      setSearchParams({ id: uploadId })
      
      // 重置状态
      setUploadFiles([])
      setProcessingFiles([])
      setCurrentStep('upload')
      setProcessingProgress(0)
    }, 1000)
  }

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeProcessingFile = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleNewContext = () => {
    console.log('创建新上下文')
    // 创建新上下文逻辑
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'upload' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
        )}>
          <Upload className="w-4 h-4" />
          <span>上传文件</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'process' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
        )}>
          <Sparkles className="w-4 h-4" />
          <span>AI处理</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
          currentStep === 'complete' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        )}>
          <CheckCircle className="w-4 h-4" />
          <span>完成</span>
        </div>
      </div>
    </div>
  )

  const renderUploadSection = () => (
    <div className="flex-1 p-6">
      <h3 className="text-lg font-medium mb-4" style={{ color: 'rgba(7, 11, 17, 1)' }}>
        上传文件
      </h3>
      
      <div
        className={cn(
          "upload-area flex flex-col justify-center items-center mb-6 pt-8 pr-6 pb-8 pl-6 border-2 border-dashed rounded-lg transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div 
          className="flex justify-center items-center w-16 h-16 mb-4 rounded-md"
          style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
        >
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <p 
          className="mb-2 text-sm font-medium"
          style={{ color: 'rgba(7, 11, 17, 1)' }}
        >
          拖放文件到此处或粘贴剪切板内容
        </p>
        <p 
          className="mb-4 text-xs"
          style={{ color: 'rgba(136, 138, 139, 1)' }}
        >
          支持 .ct, .json, .md, .txt, .html 格式
        </p>
        <label className="btn btn-primary btn-sm cursor-pointer">
          <FolderOpen className="w-4 h-4 mr-2" />
          浏览文件
          <input
            type="file"
            accept=".ct,.json,.md,.txt,.html"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {uploadFiles.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium" style={{ color: 'rgba(7, 11, 17, 1)' }}>
            文件列表 ({uploadFiles.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadFiles.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center pt-3 pr-3 pb-3 pl-3 rounded-md"
                style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
              >
                <FileText className="w-4 h-4 mr-3 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'rgba(7, 11, 17, 1)' }}>
                    {file.name}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(136, 138, 139, 1)' }}>
                    {file.size}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 hover:bg-gray-200 p-1 rounded"
                  style={{ color: 'rgba(136, 138, 139, 1)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderProcessSection = () => (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-[400px]">
      <div className="text-center">
        {currentStep === 'upload' && (
          <>
            <div 
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg ${
                uploadFiles.length > 0 
                  ? 'cursor-pointer hover:bg-gray-100 transition-colors' 
                  : 'cursor-not-allowed opacity-50'
              }`}
              style={{ backgroundColor: 'rgba(241, 245, 249, 1)' }}
            >
              <Sparkles className="w-8 h-8 text-gray-600" />
            </div>
            <h3 
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`text-lg font-medium mb-2 ${
                uploadFiles.length > 0 ? 'cursor-pointer hover:text-blue-600' : 'cursor-not-allowed'
              }`} 
              style={{ color: 'rgba(7, 11, 17, 1)' }}
            >
              Specs获取
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(136, 138, 139, 1)' }}>
              点击开始处理文件，AI将为您生成总结和分析
            </p>
            <button
              onClick={handleProcess}
              disabled={uploadFiles.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              开始处理
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </>
        )}
        
        {currentStep === 'process' && (
          <>
            <Loader className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-sm" style={{ color: 'rgba(136, 138, 139, 1)' }}>
              AI正在分析和总结您的文件内容
            </p>
          </>
        )}

        {currentStep === 'complete' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'rgba(7, 11, 17, 1)' }}>
              处理完成
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(136, 138, 139, 1)' }}>
              所有文件已成功处理，选择您要进行的操作
            </p>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => {
                  try {
                    const completedFiles = processingFiles.filter(f => f.processingState === 'completed')
                    
                    if (completedFiles.length === 0) {
                      alert('没有已完成的文件可供复制')
                      return
                    }
                    
                    // 生成用于复制的文本内容
                    const copyText = completedFiles.map(file => {
                      const specs = file.result?.specsFile?.compressed_context
                      if (!specs) return ''
                      
                      return `文件: ${file.name}
对话总结: ${specs.conversation_summary}
用户画像: ${specs.user_profile?.communication_style} / ${specs.user_profile?.expertise_level}
关键讨论: ${specs.key_discussions?.map((d: any) => d.topic).join(', ') || '无'}
待办任务: ${specs.ongoing_tasks?.map((t: any) => t.task).join(', ') || '无'}
---`
                    }).join('\n\n')
                    
                    // 复制到剪贴板
                    navigator.clipboard.writeText(copyText).then(() => {
                      console.log('结果已复制到剪贴板')
                      // 可以添加一个临时的成功提示
                    }).catch(() => {
                      // 降级方案：选择文本
                      const textArea = document.createElement('textarea')
                      textArea.value = copyText
                      document.body.appendChild(textArea)
                      textArea.select()
                      document.execCommand('copy')
                      document.body.removeChild(textArea)
                      console.log('结果已复制到剪贴板（降级模式）')
                    })
                  } catch (error) {
                    console.error('复制失败:', error)
                    alert('复制失败，请重试')
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border-r border-gray-200 rounded-l-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-600 transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                复制结果
              </button>
              <button
                onClick={() => {
                  try {
                    // 下载.specs文件
                    const completedFiles = processingFiles.filter(f => f.processingState === 'completed')
                    
                    if (completedFiles.length === 0) {
                      alert('没有已完成的文件可供下载')
                      return
                    }
                    
                    completedFiles.forEach(file => {
                      if (file.result?.specsFile) {
                        downloadSpecsFile(file.result.specsFile, file.result.specsFileName)
                      }
                    })
                    
                    // 显示成功提示
                    console.log(`成功下载 ${completedFiles.length} 个.specs文件`)
                    handleUpload()
                  } catch (error) {
                    console.error('下载文件失败:', error)
                    alert('下载文件失败，请重试')
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-r-lg hover:bg-gray-700 focus:z-10 focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                下载.specs文件
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderResultSection = () => (
    <div className="flex-1 p-6 border-l border-gray-200">
      <h3 className="text-lg font-medium mb-4" style={{ color: 'rgba(7, 11, 17, 1)' }}>
        处理结果
      </h3>
      
      {processingFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="w-12 h-12 mb-4 text-gray-400" />
          <p className="text-sm" style={{ color: 'rgba(136, 138, 139, 1)' }}>
            处理完成后，结果将在这里显示
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {processingFiles.map((file, index) => (
            <div key={index} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">{file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {file.processingState === 'generating' && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                      生成中...
                    </span>
                  )}
                  {file.processingState === 'processing' && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Clock className="w-3 h-3 mr-1" />
                      处理中...
                    </span>
                  )}
                  {file.processingState === 'completed' && (
                    <span className="flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已完成
                    </span>
                  )}
                  {file.processingState === 'error' && (
                    <span className="flex items-center text-xs text-red-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      处理失败
                    </span>
                  )}
                  <button
                    onClick={() => removeProcessingFile(index)}
                    className="hover:bg-gray-200 p-1 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {file.result && (
                <div className="text-xs space-y-3" style={{ color: 'rgba(136, 138, 139, 1)' }}>
                  {/* 基本信息 */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">.specs文件: {file.result.specsFileName}</span>
                    <span>处理时间: {(file.result.processingTime / 1000).toFixed(1)}s</span>
                  </div>
                  
                  {/* 项目信息 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-1">项目信息:</div>
                    <div className="ml-2 space-y-1">
                      <div>• 项目名称: {file.result.specsFile?.metadata?.name || '未命名项目'}</div>
                      <div>• 任务类型: {file.result.specsFile?.metadata?.task_type || 'general_chat'}</div>
                      <div>• 概述: {file.result.summary}</div>
                    </div>
                  </div>
                  
                  {/* 角色定位 */}
                  {file.result.specsFile?.instructions?.role_and_goal && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">AI角色:</div>
                      <p className="text-gray-600 ml-2">{file.result.specsFile.instructions.role_and_goal}</p>
                    </div>
                  )}
                  
                  {/* 资产状态链 */}
                  {file.result.specsFile?.assets?.files && Object.keys(file.result.specsFile.assets.files).length > 0 && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">项目资产:</div>
                      <div className="ml-2">
                        {Object.entries(file.result.specsFile.assets.files).slice(0, 3).map(([filePath, asset]: [string, any], idx: number) => {
                          const latestState = asset.state_chain?.[asset.state_chain.length - 1]
                          return (
                            <div key={idx} className="mb-1">
                              <div>• {filePath} ({asset.asset_id})</div>
                              {latestState && (
                                <div className="text-gray-500 ml-4">
                                  最新: {latestState.state_id} - {latestState.summary?.substring(0, 60)}...
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {Object.keys(file.result.specsFile.assets.files).length > 3 && (
                          <div className="text-gray-500">... 还有 {Object.keys(file.result.specsFile.assets.files).length - 3} 个资产</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 对话历史 */}
                  {file.result.specsFile?.history?.length > 0 && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">对话记录:</div>
                      <div className="ml-2">
                        <div>共 {file.result.specsFile.history.length} 轮对话</div>
                        {file.result.specsFile.history.slice(-2).map((historyItem: any, idx: number) => (
                          <div key={idx} className="text-gray-500 mb-1">
                            • {historyItem.role}: {historyItem.content?.substring(0, 40)}...
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-right text-gray-400">
                    {new Date(file.result.generatedAt).toLocaleTimeString()}
                  </div>
                </div>
              )}
              
              {file.processingState === 'error' && file.error && (
                <p className="text-xs text-red-600">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Header
        onNewContext={handleNewContext}
        isDarkMode={false}
        onToggleTheme={() => {}}
        user={user}
        onLogout={onLogout}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium" style={{ color: 'rgba(7, 11, 17, 1)' }}>
            上下文处理器
          </h1>
          
          {searchParams.get('id') && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>上传成功 - ID: {searchParams.get('id')}</span>
            </div>
          )}
        </div>
        
        {renderStepIndicator()}
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex h-[600px]">
            {renderUploadSection()}
            {renderProcessSection()}
            {renderResultSection()}
          </div>
        </div>
      </div>
    </div>
  )
}