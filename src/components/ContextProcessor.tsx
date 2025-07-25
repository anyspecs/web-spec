import React, { useCallback, useState, useEffect } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, Cloud, FolderOpen, Loader, ArrowRight, Sparkles, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { processFileWithKimi, readFileContent } from '@/utils/kimiApi'
import type { UploadFile, ProcessingFile, ProcessingState } from '@/types/context'

interface ContextProcessorProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: UploadFile[]) => void
}

export function ContextProcessor({ isOpen, onClose, onUpload }: ContextProcessorProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'process' | 'complete'>('upload')

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
    if (isOpen) {
      document.addEventListener('paste', handlePaste)
      return () => {
        document.removeEventListener('paste', handlePaste)
      }
    }
  }, [isOpen, handlePaste])

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

        // 调用Kimi API处理
        const result = await processFileWithKimi(content, files[i].name)
        
        // 更新结果
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { 
            ...file, 
            processingState: 'completed',
            result 
          } : file
        ))
      } catch (error) {
        setProcessingFiles(prev => prev.map((file, index) => 
          index === i ? { 
            ...file, 
            processingState: 'error',
            error: error instanceof Error ? error.message : '处理失败'
          } : file
        ))
      }
    }

    setCurrentStep('complete')
  }

  const handleUpload = async () => {
    const completedFiles = processingFiles.filter(f => f.processingState === 'completed')
    if (completedFiles.length === 0) return

    // 模拟上传过程
    const updatedFiles = completedFiles.map(file => ({
      ...file,
      status: 'success' as const
    }))
    
    setTimeout(() => {
      onUpload(updatedFiles)
      onClose()
      setUploadFiles([])
      setProcessingFiles([])
      setCurrentStep('upload')
    }, 1000)
  }

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeProcessingFile = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

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
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'rgba(7, 11, 17, 1)' }}>
              AI智能处理
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(136, 138, 139, 1)' }}>
              点击开始处理文件，AI将为您生成总结和分析
            </p>
            <button
              onClick={handleProcess}
              disabled={uploadFiles.length === 0}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>开始处理</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
        
        {currentStep === 'process' && (
          <>
            <Loader className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'rgba(7, 11, 17, 1)' }}>
              正在处理中...
            </h3>
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
              所有文件已成功处理，点击上传保存结果
            </p>
            <button
              onClick={handleUpload}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>上传结果</span>
            </button>
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
                <div className="text-xs" style={{ color: 'rgba(136, 138, 139, 1)' }}>
                  <p className="mb-2">{file.result.summary}</p>
                  <div className="flex justify-between">
                    <span>处理时间: {(file.result.processingTime / 1000).toFixed(1)}s</span>
                    <span>{new Date(file.result.generatedAt).toLocaleTimeString()}</span>
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
    <div 
      className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(7, 11, 17, 0.5)' }}
    >
      <div 
        className="overflow-hidden w-[1200px] h-[800px] rounded-lg shadow-xl bg-white"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-medium" style={{ color: 'rgba(7, 11, 17, 1)' }}>
            上下文处理器
          </h2>
          <button
            onClick={onClose}
            className="flex justify-center items-center w-10 h-10 hover:bg-gray-100 rounded transition-colors"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {renderStepIndicator()}
        </div>

        <div className="flex h-[calc(100%-140px)]">
          {renderUploadSection()}
          {renderProcessSection()}
          {renderResultSection()}
        </div>
      </div>
    </div>
  )
}

// 保持向后兼容
export { ContextProcessor as UploadModal }