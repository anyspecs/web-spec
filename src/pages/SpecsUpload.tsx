import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader
} from 'lucide-react'
import { Header } from '@/components/Header'
import { uploadSpecsFile } from '@/service/specsApi'
import type { User } from '@/types/user'

interface SpecsFile {
  id: string
  name: string
  size: string
  file?: File
  content?: any
  uploadState: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

interface SpecsUploadProps {
  user: User | null
  onLogout: () => void
}

export function SpecsUpload({ user, onLogout }: SpecsUploadProps) {
  const navigate = useNavigate()
  const [specsFile, setSpecsFile] = useState<SpecsFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // 文件验证：只接受.specs文件
  const validateFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    return fileName.endsWith('.specs')
  }

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    if (!validateFile(file)) {
      alert('请上传.specs格式的文件')
      return
    }

    const newSpecsFile: SpecsFile = {
      id: Date.now().toString(),
      name: file.name,
      size: formatFileSize(file.size),
      file: file,
      uploadState: 'idle'
    }

    try {
      // 读取文件内容
      const content = await readFileContent(file)
      newSpecsFile.content = JSON.parse(content)
      setSpecsFile(newSpecsFile)
    } catch (error) {
      newSpecsFile.uploadState = 'error'
      newSpecsFile.error = '文件格式错误，请上传有效的.specs文件'
      setSpecsFile(newSpecsFile)
    }
  }, [])

  // 读取文件内容
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // 移除文件
  const handleRemoveFile = () => {
    setSpecsFile(null)
  }

  // 上传文件
  const handleUpload = async () => {
    if (!specsFile || !specsFile.file) return

    setSpecsFile(prev => prev ? { ...prev, uploadState: 'uploading' } : null)

    try {
      const response = await uploadSpecsFile(
        specsFile.file,
        user?.id
      )

      if (response.success) {
        setSpecsFile(prev => prev ? { ...prev, uploadState: 'success' } : null)
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setSpecsFile(prev => prev ? { 
          ...prev, 
          uploadState: 'error',
          error: response.message || '上传失败，请重试'
        } : null)
      }
      
    } catch (error) {
      setSpecsFile(prev => prev ? { 
        ...prev, 
        uploadState: 'error',
        error: error instanceof Error ? error.message : '上传失败，请重试'
      } : null)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Header
        isDarkMode={false}
        onToggleTheme={() => {}}
        user={user}
        onLogout={onLogout}
      />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
            上传Specs文件
          </h1>
          <p className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
            上传您的.specs上下文文件，导入已有的AI对话上下文
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            {!specsFile ? (
              // 上传区域
              <div
                className={`upload-area border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragOver ? 'border-gray-600 bg-gray-50' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <div 
                    className="flex justify-center items-center w-16 h-16 mb-4 rounded-lg"
                    style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
                  >
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
                    拖放specs文件到此处或粘贴内容
                  </h3>
                  
                  <p className="text-sm mb-6" style={{ color: "rgba(136, 138, 139, 1)" }}>
                    支持 .specs 文件格式，最大支持 50MB
                  </p>

                  <input
                    type="file"
                    accept=".specs"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="btn btn-primary btn-md cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </label>
                </div>
              </div>
            ) : (
              // 文件预览和上传
              <div className="space-y-6">
                {/* 文件信息 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div 
                        className="flex justify-center items-center w-10 h-10 mr-4 rounded-md"
                        style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
                      >
                        <FileText 
                          className="w-5 h-5" 
                          style={{ color: 'rgba(33, 37, 40, 1)' }} 
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm" style={{ color: "rgba(7, 11, 17, 1)" }}>
                          {specsFile.name}
                        </h3>
                        <p className="text-xs" style={{ color: "rgba(136, 138, 139, 1)" }}>
                          {specsFile.size}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {specsFile.uploadState === 'uploading' && (
                        <Loader className="w-5 h-5 animate-spin text-blue-500" />
                      )}
                      {specsFile.uploadState === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {specsFile.uploadState === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {specsFile.uploadState === 'idle' && (
                        <button
                          onClick={handleRemoveFile}
                          className="w-5 h-5 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Specs文件详细信息 */}
                  {specsFile.content && (
                    <div className="space-y-3">
                      {/* 项目信息 */}
                      {specsFile.content.metadata && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
                            项目信息
                          </h4>
                          <div className="text-xs space-y-1" style={{ color: "rgba(136, 138, 139, 1)" }}>
                            {specsFile.content.metadata.name && (
                              <div>项目名称: {specsFile.content.metadata.name}</div>
                            )}
                            {specsFile.content.metadata.task_type && (
                              <div>任务类型: {specsFile.content.metadata.task_type}</div>
                            )}
                            {specsFile.content.metadata.createdAt && (
                              <div>创建时间: {new Date(specsFile.content.metadata.createdAt).toLocaleString('zh-CN')}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 资产统计 */}
                      {specsFile.content.assets && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
                            包含资产
                          </h4>
                          <div className="text-xs space-y-1" style={{ color: "rgba(136, 138, 139, 1)" }}>
                            {specsFile.content.assets.files && (
                              <div>文件数量: {Object.keys(specsFile.content.assets.files).length} 个</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 对话历史 */}
                      {specsFile.content.history && specsFile.content.history.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
                            对话记录
                          </h4>
                          <div className="text-xs" style={{ color: "rgba(136, 138, 139, 1)" }}>
                            共 {specsFile.content.history.length} 轮对话
                          </div>
                        </div>
                      )}

                      {/* AI角色 */}
                      {specsFile.content.instructions && specsFile.content.instructions.role_and_goal && (
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: "rgba(7, 11, 17, 1)" }}>
                            AI角色
                          </h4>
                          <div className="text-xs line-clamp-2" style={{ color: "rgba(136, 138, 139, 1)" }}>
                            {specsFile.content.instructions.role_and_goal}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 错误信息 */}
                {specsFile.uploadState === 'error' && specsFile.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">{specsFile.error}</span>
                    </div>
                  </div>
                )}

                {/* 成功信息 */}
                {specsFile.uploadState === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm text-green-700">
                        文件上传成功！正在跳转到主页...
                      </span>
                    </div>
                  </div>
                )}

                {/* 上传按钮 */}
                {specsFile.uploadState === 'idle' && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleUpload}
                      className="btn btn-primary btn-lg"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      上传文件
                    </button>
                  </div>
                )}

                {specsFile.uploadState === 'uploading' && (
                  <div className="flex justify-center">
                    <div className="flex items-center">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
                        正在上传...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}