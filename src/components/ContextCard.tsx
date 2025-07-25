import React from 'react'
import { FileText, Eye, Download, Share2, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ContextFile } from '@/types/context'

interface ContextCardProps {
  context: ContextFile
  onView: (context: ContextFile) => void
  onDownload: (context: ContextFile) => void
  onDelete: (context: ContextFile) => void
  onShare: (context: ContextFile) => void
}

export function ContextCard({ context, onView, onDownload, onDelete, onShare }: ContextCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
            onClick={() => onView(context)}
            className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
            title="查看详情"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDownload(context)}
            className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
            title="下载文件"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onShare(context)}
            className="flex justify-center items-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
            title="分享"
            style={{ color: 'rgba(136, 138, 139, 1)' }}
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