import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, Share2, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ContextFile } from '@/types/context'

interface ContextCardProps {
  context: ContextFile
  onDownload: (context: ContextFile) => void
  onDelete: (context: ContextFile) => void
  originalFileName?: string
}

export function ContextCard({ context, onDownload, onDelete, originalFileName }: ContextCardProps) {
  const navigate = useNavigate()
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleApply = async () => {
    try {
      // 使用原始文件名或context名称来构建URL
      const fileName = originalFileName || context.name

      // 跳转到specs详情页面
      const encodedFileName = encodeURIComponent(fileName)
      const specsDetailUrl = `/specs-detail/${encodedFileName}`
      
      // 复制完整URL到剪贴板
      const fullUrl = `${window.location.origin}${specsDetailUrl}`
      await navigator.clipboard.writeText(fullUrl)
      
      // 跳转到详情页面
      navigate(specsDetailUrl)
    } catch (error) {
      console.error('应用失败:', error)
      alert('应用失败，请重试')
    }
  }

  return (
    <div className="card pt-6 pr-6 pb-6 pl-6 hover:shadow-github-lg transition-all duration-200">
      <div className="flex items-center mb-4">
        <div 
          className="flex justify-center items-center w-10 h-10 mr-4 rounded-md"
          style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
        >
          <FileText 
            className="w-5 h-5" 
            style={{ color: 'rgba(33, 37, 40, 1)' }} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 
            className="text-sm font-medium truncate"
            style={{ color: 'rgba(7, 11, 17, 1)' }}
          >
            {context.name}
          </h3>
          <p 
            className="text-xs"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            {context.size}
          </p>
        </div>
      </div>
      
      <p 
        className="text-xs mb-6 line-clamp-3 overflow-hidden"
        style={{ color: 'rgba(7, 11, 17, 1)' }}
      >
        {context.description}
      </p>
      
      <div className="flex justify-between items-center">
        <span 
          className="text-xs"
          style={{ color: 'rgba(136, 138, 139, 1)' }}
        >
          更新于 {formatDate(context.updated_at)}
        </span>
        <div className="flex">
          <button
            onClick={() => onDownload(context)}
            className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
            title="下载文件"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleApply}
            className="flex justify-center items-center w-8 h-8 hover:bg-blue-50 rounded transition-colors"
            title="应用到新对话"
            style={{ color: 'rgba(59, 130, 246, 1)' }}
          >
            <Share2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(context)}
            className="flex justify-center items-center w-8 h-8 hover:bg-red-50 rounded transition-colors"
            title="删除"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
} 