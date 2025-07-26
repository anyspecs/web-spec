import React, { useState, useEffect } from 'react'
import { Search, Grid, List, Eye, Download, Share2, Trash2, RefreshCw, User as UserIcon } from 'lucide-react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ContextCard } from '@/components/ContextCard'
import { ContextViewer } from '@/components/ContextViewer'
import { contextsApi, type GlobalContextFile } from '@/service/contextsApi'
import type { ContextFile } from '@/types/context'
import type { User } from '@/types/user'


interface ContextListProps {
  user: User | null
  onLogout: () => void
}

export function ContextList({ user, onLogout }: ContextListProps) {
  const [contexts, setContexts] = useState<ContextFile[]>([])
  const [globalFiles, setGlobalFiles] = useState<GlobalContextFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedContext, setSelectedContext] = useState<ContextFile | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSort, setSelectedSort] = useState('updated')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // 将GlobalContextFile转换为ContextFile格式
  const convertToContextFile = (globalFile: GlobalContextFile): ContextFile => {
    return {
      id: globalFile.id,
      name: globalFile.name,
      description: `由 ${globalFile.user_name} 上传 • ${contextsApi.formatTaskType(globalFile.task_type)}`,
      updated_at: globalFile.modified_at,
      size: contextsApi.formatFileSize(globalFile.size),
      system_prompt: "这是一个用户上传的上下文文件。",
      conversation: [],
      assets: []
    }
  }

  // 加载全局文件列表
  const loadGlobalContexts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await contextsApi.getAllContexts()
      setGlobalFiles(response.files)
      
      // 转换为ContextFile格式
      const convertedContexts = response.files.map(convertToContextFile)
      setContexts(convertedContexts)
      
    } catch (err) {
      console.error('加载全局文件列表失败:', err)
      setError(err instanceof Error ? err.message : '加载文件列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 刷新数据
  const handleRefresh = () => {
    loadGlobalContexts()
  }

  // 组件挂载时加载数据
  useEffect(() => {
    loadGlobalContexts()
  }, [])

  const handleNewContext = () => {
    console.log('Creating new context')
    // Here you would navigate to the context editor
  }

  const handleView = (context: ContextFile) => {
    setSelectedContext(context)
    setIsViewerOpen(true)
  }

  const handleSave = (updatedContext: ContextFile) => {
    setContexts(prev => 
      prev.map(ctx => ctx.id === updatedContext.id ? updatedContext : ctx)
    )
    setSelectedContext(updatedContext)
  }

  const handleDownload = (context: ContextFile) => {
    console.log('Downloading context:', context.name)
    // Here you would handle the file download
  }

  const handleDelete = (context: ContextFile) => {
    if (confirm(`确定要删除 "${context.name}" 吗？`)) {
      setContexts(prev => prev.filter(ctx => ctx.id !== context.id))
    }
  }

  const handleShare = (context: ContextFile) => {
    console.log('Sharing context:', context.name)
    // Here you would handle sharing functionality
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
              <h2 className="mr-3 text-xl font-medium">所有上下文</h2>
              <span 
                className="text-sm"
                style={{ color: 'rgba(136, 138, 139, 1)' }}
              >
                {isLoading ? '加载中...' : `共${sortedContexts.length}个文件`}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="relative mr-3">
                <input
                  type="text"
                  placeholder="搜索所有用户的文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-64 h-10 pr-10 pl-4"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-4 h-4" style={{ color: 'rgba(136, 138, 139, 1)' }} />
                </div>
              </div>
              
              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="mr-3 p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="刷新文件列表"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
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
          
          {/* 错误状态 */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">⚠️ 加载失败</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                重试
              </button>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">正在加载文件列表...</p>
            </div>
          )}

          {/* 文件列表 */}
          {!isLoading && !error && (
            <>
              {sortedContexts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-gray-400 mb-4">📁 暂无文件</div>
                  <p className="text-gray-600">还没有用户上传任何文件</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {sortedContexts.map((context) => (
                    <ContextCard
                      key={context.id}
                      context={context}
                      onView={handleView}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <ContextViewer
        context={selectedContext}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onSave={handleSave}
        onDownload={handleDownload}
      />
    </div>
  )
} 