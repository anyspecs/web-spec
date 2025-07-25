import type { ProcessingResult } from '@/types/context'
import type { ContextAnalysisResult } from '@/types/specs'

export interface KimiApiConfig {
  apiKey?: string
  baseUrl?: string
}

export class KimiApiService {
  private config: KimiApiConfig

  constructor(config: KimiApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_KIMI_API_KEY || 'sk-7hIpkoYCNZ6GdKVadMtlGtU2NZ8sz4TbTVI33VvisT3SwUE0',
      baseUrl: config.baseUrl || import.meta.env.VITE_KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
      ...config
    }
  }

  async processFile(content: string, fileName: string): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
    const startTime = Date.now()
    
    try {
      // 调用真实的Kimi API进行聊天压缩分析
      const compressedContextData = await this.callRealKimiAPI(content, fileName)
      
      const processingTime = Date.now() - startTime
      
      // 解析JSON响应
      const contextAnalysis: ContextAnalysisResult = JSON.parse(compressedContextData)
      
      return {
        summary: this.extractSummaryFromAnalysis(contextAnalysis),
        generatedAt: new Date().toISOString(),
        processingTime,
        contextAnalysis
      }
    } catch (error) {
      throw new Error(`Kimi API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private extractSummaryFromAnalysis(analysis: ContextAnalysisResult): string {
    // 从分析结果中提取摘要信息
    const projectName = analysis.metadata?.name || '上下文分析'
    const taskType = analysis.metadata?.task_type || 'general_chat'
    const fileCount = Object.keys(analysis.assets?.files || {}).length
    
    let summary = `项目: ${projectName} (${taskType})`
    
    if (fileCount > 0) {
      summary += `，包含 ${fileCount} 个资产文件`
    }
    
    if (analysis.history?.length > 0) {
      summary += `，${analysis.history.length} 轮对话记录`
    }
    
    return summary
  }

  private async callRealKimiAPI(content: string, fileName: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_KIMI_MODEL || 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的代码和文档分析专家，能够深入理解各种编程语言和文档格式。请提供准确、详细的分析结果，并严格按照要求的JSON格式返回。'
          },
          {
            role: 'user',
            content: `你是专业的对话上下文重构专家。请将聊天记录转换为带有状态链的项目上下文文件。

任务：分析聊天记录，识别其中涉及的文件/资产变化，构建状态链时间线。

返回JSON格式：
{
  "metadata": {
    "name": "从聊天记录提取的项目名称",
    "task_type": "根据内容判断(general_chat/document_analysis/code_project)"
  },
  "instructions": {
    "role_and_goal": "AI助手的角色定位和目标"
  },
  "assets": {
    "files": {
      "文件路径": {
        "asset_id": "file-001", 
        "state_chain": [
          {
            "state_id": "s0",
            "timestamp": "时间戳",
            "summary": "状态变更原因说明",
            "content": "初始内容"
          }
        ]
      }
    }
  },
  "examples": [
    {
      "context": "关键信息点",
      "usage": "使用说明"
    }
  ],
  "history": [
    {
      "role": "user/assistant/system",
      "content": "对话内容，可引用[asset: file-001, state: s0]",
      "timestamp": "时间戳",
      "metadata": {
        "asset_reference": "file-001:s0"
      }
    }
  ]
}

分析要点：
1. 识别聊天中涉及的文件、代码、文档等资产
2. 追踪每个资产的状态变化时间线
3. 将对话与具体的资产状态绑定
4. 提取项目演化的关键节点
5. 保持时间线的连续性和可追溯性

文件信息：
- 原始文件: ${fileName}
- 处理模型: kimi-k2-0711-preview

聊天记录：
\`\`\`
${content}
\`\`\``
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  private async mockApiCall(content: string, fileName: string): Promise<void> {
    // 模拟网络延迟
    const delay = 2000 + Math.random() * 3000 // 2-5秒随机延迟
    await new Promise(resolve => setTimeout(resolve, delay))

    // 模拟API调用可能的错误
    if (Math.random() < 0.1) { // 10% 概率出错
      throw new Error('网络连接错误')
    }
  }



  async testConnection(): Promise<boolean> {
    try {
      await this.mockApiCall('test', 'test.txt')
      return true
    } catch {
      return false
    }
  }
}

// 导出默认实例
export const kimiApi = new KimiApiService()

// 便捷函数
export async function processFileWithKimi(content: string, fileName: string): Promise<ProcessingResult> {
  return kimiApi.processFile(content, fileName)
}

export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string)
      } else {
        reject(new Error('文件读取失败'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取出错'))
    }
    
    reader.readAsText(file, 'UTF-8')
  })
}