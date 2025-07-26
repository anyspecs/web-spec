import React, { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [specsData, setSpecsData] = useState<SpecsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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




  if (loading) {
    return <div>加载中...</div>
  }

  if (error) {
    return <div>错误: {error}</div>
  }

  if (!specsData) {
    return <div>文件数据不可用</div>
  }

  // 只显示纯JSON文本
  return (
    <pre style={{ margin: 0, padding: 0, fontFamily: 'monospace', fontSize: '14px' }}>
      {JSON.stringify(specsData, null, 2)}
    </pre>
  )
}