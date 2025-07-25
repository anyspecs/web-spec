import React, { useState, useEffect } from 'react'
import { Search, Grid, List, Eye, Download, Share2, Trash2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ContextProcessor } from '@/components/ContextProcessor'
import { ContextCard } from '@/components/ContextCard'
import { ContextViewer } from '@/components/ContextViewer'
import type { ContextFile, UploadFile } from '@/types/context'

// Mock data updated to include system_prompt, conversation, and assets
const mockContexts: ContextFile[] = [
  {
    id: "1",
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
      },
      {
        id: "2", 
        role: "assistant",
        content: "根据项目需求文档，核心功能需求包括：\n1. 用户身份认证和授权管理系统\n2. 实时数据同步和离线工作模式",
        timestamp: "2023-11-23T14:31:00Z"
      }
    ],
    assets: [
      {
        id: "1",
        name: "项目需求说明书.pdf",
        type: "application/pdf",
        size: "2.4MB"
      }
    ]
  },
  {
    id: "2",
    name: "用户调研报告.ct",
    description: "用户调研结果与分析，包含用户需求、痛点和建议改进方向。",
    updated_at: "2023-11-20T10:15:30Z",
    size: "0.8MB",
    system_prompt: "你是一个用户体验研究专家。",
    conversation: [],
    assets: []
  },
  {
    id: "3",
    name: "开发技术文档.ct",
    description: "详细的开发技术文档，包含架构设计、API文档和开发规范。",
    updated_at: "2023-11-18T16:45:22Z",
    size: "2.4MB",
    system_prompt: "你是一个技术架构师。",
    conversation: [],
    assets: []
  },
  {
    id: "4",
    name: "市场分析报告.ct",
    description: "对目标市场的详细分析，包括竞争对手情况、市场趋势和机会分析。",
    updated_at: "2023-11-15T09:20:10Z",
    size: "1.7MB",
    system_prompt: "你是一个市场分析专家。",
    conversation: [],
    assets: []
  },
  {
    id: "5",
    name: "产品路线规划.ct",
    description: "未来产品功能规划和开发时间线，包括短期和长期目标。",
    updated_at: "2023-11-12T13:55:40Z",
    size: "0.9MB",
    system_prompt: "你是一个产品策略顾问。",
    conversation: [],
    assets: []
  },
  {
    id: "6",
    name: "测试结果报告.ct",
    description: "系统测试结果和性能分析，包含测试用例和测试数据。",
    updated_at: "2023-11-10T11:30:15Z",
    size: "1.5MB",
    system_prompt: "你是一个质量保证工程师。",
    conversation: [],
    assets: []
  }
]

export function ContextList() {
  const [contexts, setContexts] = useState<ContextFile[]>(mockContexts)
  const [isProcessorOpen, setIsProcessorOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedContext, setSelectedContext] = useState<ContextFile | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSort, setSelectedSort] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const handleUpload = (files: UploadFile[]) => {
    console.log('Uploading files:', files)
    // Here you would handle the actual file upload
    setIsProcessorOpen(false)
  }

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
        onUpload={() => setIsProcessorOpen(true)}
        onNewContext={handleNewContext}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
      
      <div className="flex w-full">
        <Sidebar
          selectedCategory={selectedCategory}
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
                共{sortedContexts.length}个文件
              </span>
            </div>
            
            <div className="flex items-center">
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
        </main>
      </div>

      <ContextProcessor
        isOpen={isProcessorOpen}
        onClose={() => setIsProcessorOpen(false)}
        onUpload={handleUpload}
      />

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