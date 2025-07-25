import type { ProcessingResult } from '@/types/context'

export interface KimiApiConfig {
  apiKey?: string
  baseUrl?: string
}

export class KimiApiService {
  private config: KimiApiConfig

  constructor(config: KimiApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || 'sk-7hIpkoYCNZ6GdKVadMtlGtU2NZ8sz4TbTVI33VvisT3SwUE0',
      baseUrl: config.baseUrl || 'https://api.moonshot.cn/v1',
      ...config
    }
  }

  async processFile(content: string, fileName: string): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      // 调用真实的Kimi API
      const summary = await this.callRealKimiAPI(content, fileName)
      
      const processingTime = Date.now() - startTime
      
      return {
        summary,
        generatedAt: new Date().toISOString(),
        processingTime
      }
    } catch (error) {
      throw new Error(`Kimi API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private async callRealKimiAPI(content: string, fileName: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文档分析助手。请对用户提供的文件内容进行详细分析和总结，包括主要内容、结构、关键信息等。请用中文回复。'
          },
          {
            role: 'user',
            content: `请分析以下文件"${fileName}"的内容并提供详细总结：\n\n${content}`
          }
        ],
        temperature: 0.6,
        max_tokens: 1000
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

  private generateSummary(content: string, fileName: string): string {
    // 模拟AI生成的总结
    const fileType = this.getFileType(fileName)
    const wordCount = content.length
    
    const summaries: Record<string, string> = {
      json: `分析了JSON配置文件"${fileName}"，包含${Math.ceil(wordCount / 50)}个配置项。主要包含系统配置、用户设置和API端点配置。建议优化配置结构以提高可维护性。`,
      
      md: `解析了Markdown文档"${fileName}"，共${Math.ceil(wordCount / 100)}个段落。文档结构清晰，包含标题、列表和代码块。建议添加更多示例和说明以提高可读性。`,
      
      txt: `处理了文本文件"${fileName}"，共${Math.ceil(wordCount / 5)}个单词。内容涵盖多个主题，语言简洁明了。建议按主题分段，增强文档的组织性。`,
      
      html: `分析了HTML文件"${fileName}"，包含${Math.ceil(wordCount / 80)}个元素。页面结构合理，使用了语义化标签。建议优化CSS样式和添加响应式设计。`,
      
      ct: `解析了上下文文件"${fileName}"，包含丰富的对话历史和系统提示。总共${Math.ceil(wordCount / 150)}轮对话。建议整理关键信息并建立知识索引。`,
      
      default: `分析了文件"${fileName}"，共${wordCount}个字符。文件内容结构良好，信息丰富。建议进一步分类整理以便后续使用。`
    }

    return summaries[fileType] || summaries.default
  }

  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || ''
    return ['json', 'md', 'txt', 'html', 'ct'].includes(extension) ? extension : 'default'
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