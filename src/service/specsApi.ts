// Specs文件上传API服务

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface UploadSpecsResponse {
  success: boolean
  message: string
  fileId?: string
  fileInfo?: any
  error?: string
}

export const uploadSpecsFile = async (
  specsFile: File,
  userId?: string
): Promise<UploadSpecsResponse> => {
  try {
    // 获取用户token
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      throw new Error('用户未登录')
    }

    // 创建FormData用于文件上传
    const formData = new FormData()
    formData.append('file', specsFile)

    // 调用后端上传接口
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '服务器错误' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    
    return {
      success: result.success || true,
      message: result.message || '文件上传成功',
      fileId: result.file_info?.timestamp,
      fileInfo: result.file_info
    }

  } catch (error) {
    console.error('Specs文件上传失败:', error)
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '上传失败，请重试',
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// 获取用户的specs文件列表
export const getUserSpecsFiles = async (userId?: string): Promise<any[]> => {
  try {
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      throw new Error('用户未登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/uploads/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    // 过滤出.specs文件
    const specsFiles = (result.files || []).filter((file: any) => 
      file.saved_name?.endsWith('.specs') || file.specs_file
    )
    
    return specsFiles

  } catch (error) {
    console.error('获取specs文件列表失败:', error)
    return []
  }
}