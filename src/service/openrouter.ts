import type { ProcessingResult } from '@/types/context'
import type { ContextAnalysisResult } from '@/types/specs'
import { PROMPTS } from '@/config/prompts'

export interface OpenrouterApiConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  siteUrl?: string
  siteName?: string
}

export class OpenrouterApiService {
  private config: OpenrouterApiConfig

  constructor(config: OpenrouterApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
      baseUrl: config.baseUrl || import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: config.model || import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o',
      siteUrl: config.siteUrl || import.meta.env.VITE_OPENROUTER_SITE_URL || 'https://web-spec.dev',
      siteName: config.siteName || import.meta.env.VITE_OPENROUTER_SITE_NAME || 'web-spec',
      ...config,
    }
  }

  async processFile(
    file: File
  ): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
    const startTime = Date.now()

    try {
      const fileContent = await this.readFileContent(file)
      const compressedContextData = await this.callOpenrouterAPI(file.name, fileContent)
      const processingTime = Date.now() - startTime
      const contextAnalysis: ContextAnalysisResult = JSON.parse(compressedContextData)

      return {
        summary: this.extractSummaryFromAnalysis(contextAnalysis),
        generatedAt: new Date().toISOString(),
        processingTime,
        contextAnalysis,
      }
    } catch (error) {
      throw new Error(
        `Openrouter API调用失败: ${
          error instanceof Error ? error.message : '未知错误'
        }`
      )
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  private extractSummaryFromAnalysis(analysis: ContextAnalysisResult): string {
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

  private async callOpenrouterAPI(fileName: string, fileContent: string): Promise<string> {
    const systemContent = PROMPTS.SYSTEM
    const userContent = PROMPTS.CONTEXT_ANALYSIS(fileName) + `\n\n文件内容：\n${fileContent}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }

    if (this.config.siteUrl) {
      headers['HTTP-Referer'] = this.config.siteUrl
    }
    if (this.config.siteName) {
      headers['X-Title'] = this.config.siteName
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(
        `API分析请求失败: ${response.status} ${response.statusText}`
      )
    }

    const responseData = await response.json()
    return responseData.choices[0].message.content
  }

  private async mockApiCall(_content: string, _fileName: string): Promise<void> {
    const delay = 2000 + Math.random() * 3000
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (Math.random() < 0.1) {
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

export const openrouterApi = new OpenrouterApiService()

export async function processFileWithOpenrouter(
  file: File
): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
  return openrouterApi.processFile(file)
}