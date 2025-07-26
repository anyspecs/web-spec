import { useState } from 'react'
import { FileText, Download, Share2, Trash2 } from 'lucide-react'
import type { ContextFile } from '@/types/context'

interface ContextCardProps {
  context: ContextFile
  onDownload: (context: ContextFile) => void
  onDelete: (context: ContextFile) => void
  originalFileName?: string
}

export function ContextCard({ context, onDownload, onDelete, originalFileName }: ContextCardProps) {
  const [showToast, setShowToast] = useState(false)
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleApply = async () => {
    try {
      // 获取文件JSON内容
      const fileName = originalFileName || context.name
      
      // 从后端获取文件内容
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
      
      // 首先获取文件列表找到目标文件
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('未登录，请先登录')
        return
      }
      
      const listResponse = await fetch(`${API_BASE_URL}/api/uploads/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!listResponse.ok) {
        throw new Error('获取文件列表失败')
      }
      
      const { files, user_uuid } = await listResponse.json()
      const targetFile = files.find((file: any) => 
        file.original_name === fileName || file.saved_name === fileName || file.name === fileName
      )
      
      if (!targetFile) {
        throw new Error('文件未找到')
      }
      
      // 获取文件内容
      const contentResponse = await fetch(`${API_BASE_URL}/api/${user_uuid}/${targetFile.timestamp}.html`)
      if (!contentResponse.ok) {
        throw new Error('获取文件内容失败')
      }
      
      const jsonContent = await contentResponse.json()
      
      // 复制JSON内容到剪贴板
      await navigator.clipboard.writeText(JSON.stringify(jsonContent, null, 2))
      
      // 显示成功提示
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      
    } catch (error) {
      console.error('应用失败:', error)
      alert('应用失败，请重试')
    }
  }

  return (
    <>
      {/* 居中弹窗提示 */}
      {showToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 mb-2">
                复制成功！
              </div>
              <div className="text-sm text-gray-600">
                复制到粘贴板了，发给其他ai无缝衔接吧～
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  )
} 