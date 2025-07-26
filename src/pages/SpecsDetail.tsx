import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Share2, Download, ChevronDown, ChevronRight, FileText, MessageSquare, User, Bot } from 'lucide-react'

import { uploadsApi } from '@/utils/uploadsApi'
import type { User as UserType } from '@/types/context'

interface SpecsDetailProps {
  user: UserType | null
  onLogout: () => void
}

interface SpecsData {
  version?: string
  metadata?: {
    name?: string
    task_type?: string
    createdAt?: string
  }
  instructions?: {
    role_and_goal?: string
    context?: string
    key_topics?: string[]
  }
  assets?: {
    files?: {
      [key: string]: {
        asset_id: string
        state_chain: Array<{
          state_id: string
          timestamp: string
          summary: string
          content?: string
          patch?: string
        }>
      }
    }
  }
  history?: Array<{
    role: string
    content: string
    metadata?: {
      asset_reference?: string
    }
  }>
  compressed_context?: any
  examples?: any[]
  [key: string]: any // 允许其他字段
}

export default function SpecsDetail({ user, onLogout }: SpecsDetailProps) {
  const { filename } = useParams<{ filename: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [specsData, setSpecsData] = useState<SpecsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    instructions: true,
    assets: true,
    history: true
  })

  useEffect(() => {
    const fetchSpecsData = async () => {
      if (!filename) {
        setError('文件名参数缺失')
        setLoading(false)
        return
      }

      // 检查是否有本地数据传递
      const locationState = location.state as { specsData?: SpecsData; isLocalData?: boolean } | null
      if (locationState?.isLocalData && locationState?.specsData) {
        console.log('使用本地传递的specs数据:', locationState.specsData)
        setSpecsData(locationState.specsData)
        setLoading(false)
        return
      }

      try {
        console.log('正在获取文件:', decodeURIComponent(filename))
        
        // 1. 获取用户文件列表
        const uploadsResponse = await uploadsApi.getUserUploads()
        console.log('文件列表响应:', uploadsResponse)
        
        const files = uploadsResponse.files || []
        console.log('文件数组:', files)
        
        // 2. 根据文件名匹配目标文件
        const decodedFilename = decodeURIComponent(filename)
        const targetFile = files.find((file: any) => 
          file.original_name === decodedFilename || 
          file.saved_name === decodedFilename ||
          file.name === decodedFilename
        )
        
        console.log('目标文件:', targetFile)
        
        if (!targetFile) {
          setError(`文件未找到: ${decodedFilename}`)
          setLoading(false)
          return
        }

        // 3. 构建内容获取URL - 使用后端的specs内容API
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
        const contentUrl = `${API_BASE_URL}/api/${uploadsResponse.user_uuid}/${targetFile.timestamp}.html`
        console.log('内容获取URL:', contentUrl)
        
        // 4. 获取specs文件内容（公开API，无需认证）
        const contentResponse = await fetch(contentUrl)

        if (!contentResponse.ok) {
          throw new Error(`获取文件内容失败: ${contentResponse.status}`)
        }

        const specsContent = await contentResponse.json()
        console.log('获取到的specs内容:', specsContent)
        
        setSpecsData(specsContent)
      } catch (err) {
        console.error('获取specs文件失败:', err)
        setError(err instanceof Error ? err.message : '获取文件失败')
      } finally {
        setLoading(false)
      }
    }

    fetchSpecsData()
  }, [filename, location.state])



  const handleCopyUrl = async () => {
    try {
      const currentUrl = window.location.href
      await navigator.clipboard.writeText(currentUrl)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error('复制URL失败:', err)
    }
  }

  const handleDownload = () => {
    if (specsData && filename) {
      const blob = new Blob([JSON.stringify(specsData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            返回主页
          </button>
        </div>
      </div>
    )
  }

  if (!specsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">文件数据不可用</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast 通知 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          已复制到剪切板，发给别的ai吧～
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary btn-sm mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </button>
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {filename}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyUrl}
              className="btn btn-secondary btn-sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              应用
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-primary btn-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {/* 完整JSON内容 */}
            <div className="bg-gray-50 rounded-lg p-6 border">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto font-mono">
                {JSON.stringify(specsData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}