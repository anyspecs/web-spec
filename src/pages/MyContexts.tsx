import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Grid, List, Upload, RefreshCw } from 'lucide-react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ContextCard } from '@/components/ContextCard'
import { uploadsApi } from '@/utils/uploadsApi'
import type { ContextFile, UserUploadedFile, UserUploadsResponse } from '@/types/context'
import type { User } from '@/types/user'

interface MyContextsProps {
  user: User | null
  onLogout: () => void
}

export function MyContexts({ user, onLogout }: MyContextsProps) {
  const navigate = useNavigate()
  const [uploadedFiles, setUploadedFiles] = useState<UserUploadedFile[]>([])
  const [contexts, setContexts] = useState<ContextFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSort, setSelectedSort] = useState('updated')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [userUuid, setUserUuid] = useState<string>('')

  // 将后端返回的文件转换为ContextFile格式
  const convertToContextFile = (uploadedFile: UserUploadedFile): ContextFile => {
    return {
      id: uploadedFile.timestamp,
      name: uploadedFile.original_name,
      description: uploadedFile.name || `上传文件: ${uploadedFile.original_name}`,
      updated_at: uploadedFile.modified_at,
      size: formatFileSize(uploadedFile.size),
      system_prompt: "这是一个用户上传的文件。",
      conversation: [],
      assets: []
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 加载用户上传的文件
  const loadUserUploads = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: UserUploadsResponse = await uploadsApi.getUserUploads()
      setUploadedFiles(response.files)
      setUserUuid(response.user_uuid)
      
      // 转换为ContextFile格式
      const convertedContexts = response.files.map(convertToContextFile)
      setContexts(convertedContexts)
      
    } catch (err) {
      console.error('加载用户文件失败:', err)
      setError(err instanceof Error ? err.message : '加载文件列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserUploads()
  }, [])

  const handleRefresh = () => {
    loadUserUploads()
  }



  const handleDownload = async (context: ContextFile) => {
    try {
      const uploadedFile = uploadedFiles.find(file => file.timestamp === context.id)
      if (!uploadedFile) {
        throw new Error('找不到对应的文件')
      }

      const blob = await uploadsApi.downloadFile(userUuid, uploadedFile.saved_name)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = uploadedFile.original_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('下载文件失败:', err)
      alert(err instanceof Error ? err.message : '下载失败')
    }
  }

  const handleDelete = async (context: ContextFile) => {
    if (!confirm(`确定要删除 "${context.name}" 吗？`)) {
      return
    }

    try {
      await uploadsApi.deleteUserFile(context.id)
      setContexts(prev => prev.filter(ctx => ctx.id !== context.id))
      setUploadedFiles(prev => prev.filter(file => file.timestamp !== context.id))
    } catch (err) {
      console.error('删除文件失败:', err)
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }


  const filteredContexts = contexts.filter(context => {
    const matchesSearch = context.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         context.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'my'
    return matchesSearch && matchesCategory
  })

  const sortedContexts = [...filteredContexts].sort((a, b) => {
    switch (selectedSort) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'updated':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'size':
        const sizeA = parseFloat(a.size.replace(/[^\d.]/g, ''))
        const sizeB = parseFloat(b.size.replace(/[^\d.]/g, ''))
        return sizeB - sizeA
      default:
        return 0
    }
  })

  return (
    <div className="w-full min-h-screen">
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        user={user}
        onLogout={onLogout}
      />
      
      <div className="flex w-full">
        <Sidebar
          selectedSort={selectedSort}
          onCategoryChange={setSelectedCategory}
          onSortChange={setSelectedSort}
        />
        
        <main className="flex-1 pt-6 pr-6 pb-6 pl-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="mr-3 text-xl font-medium">我的上下文</h2>
              <span 
                className="text-sm"
                style={{ color: 'rgba(136, 138, 139, 1)' }}
              >
                共{sortedContexts.length}个文件
              </span>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center px-3 py-2 mr-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              
              <div className="relative mr-3">
                <input
                  type="text"
                  placeholder="搜索当前列表..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-64 h-10 pr-10 pl-4"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-4 h-4" style={{ color: 'rgba(136, 138, 139, 1)' }} />
                </div>
              </div>
              
              <div 
                className="flex p-1 rounded-md"
                style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded ${
                    viewMode === 'grid' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-white'
                  }`}
                  style={viewMode === 'grid' ? { backgroundColor: 'rgba(244, 246, 248, 1)', color: 'rgba(7, 11, 17, 1)' } : {}}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded ${
                    viewMode === 'list' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-white'
                  }`}
                  style={viewMode === 'list' ? { backgroundColor: 'rgba(244, 246, 248, 1)', color: 'rgba(7, 11, 17, 1)' } : {}}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-gray-600">加载中...</span>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && sortedContexts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Upload className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">还没有上传文件</h3>
              <p className="text-gray-500 text-center mb-4">
                您可以前往上传页面上传您的聊天记录和文档文件
              </p>
              <a
                href="/processor"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                前往上传
              </a>
            </div>
          )}

          {/* 文件列表 */}
          {!isLoading && !error && sortedContexts.length > 0 && (
            <div className="grid grid-cols-3 gap-6">
              {sortedContexts.map((context) => {
                const uploadedFile = uploadedFiles.find(file => file.timestamp === context.id)
                return (
                  <ContextCard
                    key={context.id}
                    context={context}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    originalFileName={uploadedFile?.original_name}
                  />
                )
              })}
            </div>
          )}
        </main>
      </div>

    </div>
  )
}