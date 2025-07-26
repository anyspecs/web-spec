// 全局上下文文件API服务
export interface GlobalContextFile {
  id: string
  timestamp: string
  original_name: string
  saved_name: string
  size: number
  created_at: string
  modified_at: string
  name: string
  task_type: string
  source_file: string
  specs_file?: string | null
  access_url: string
  user_uuid: string
  user_name: string
}

export interface GlobalContextsResponse {
  files: GlobalContextFile[]
  total: number
}

class ContextsApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
  }

  /**
   * 获取所有用户的上下文文件列表
   */
  async getAllContexts(): Promise<GlobalContextsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/contexts/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`获取全局文件列表失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('获取全局文件列表错误:', error)
      throw error
    }
  }

  /**
   * 获取指定specs文件的内容
   */
  async getSpecsContent(userUuid: string, timestamp: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${userUuid}/${timestamp}.html`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`获取specs文件内容失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('获取specs文件内容错误:', error)
      throw error
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  /**
   * 格式化任务类型显示名称
   */
  formatTaskType(taskType: string): string {
    const typeMap: Record<string, string> = {
      'general_chat': '一般对话',
      'document_analysis': '文档分析',
      'code_project': '代码项目',
      'chat_compression': '聊天压缩',
    }
    return typeMap[taskType] || taskType
  }

  /**
   * 获取任务类型对应的颜色
   */
  getTaskTypeColor(taskType: string): string {
    const colorMap: Record<string, string> = {
      'general_chat': 'bg-blue-100 text-blue-800',
      'document_analysis': 'bg-green-100 text-green-800',
      'code_project': 'bg-purple-100 text-purple-800',
      'chat_compression': 'bg-orange-100 text-orange-800',
    }
    return colorMap[taskType] || 'bg-gray-100 text-gray-800'
  }
}

// 导出默认实例
export const contextsApi = new ContextsApiService()