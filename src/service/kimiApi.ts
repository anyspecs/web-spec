import type { ProcessingResult } from "@/types/context";
import type { ContextAnalysisResult } from "@/types/specs";
import { PROMPTS } from "@/config/prompts";

export interface KimiApiConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class KimiApiService {
  private config: KimiApiConfig;

  constructor(config: KimiApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_KIMI_API_KEY,
      baseUrl: config.baseUrl || import.meta.env.VITE_KIMI_BASE_URL,
      ...config,
    };
  }

  async processFile(
    file: File
  ): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
    const startTime = Date.now();

    try {
      // 调用真实的Kimi API进行文件分析
      const compressedContextData = await this.callRealKimiAPIWithFile(file);

      const processingTime = Date.now() - startTime;

      // 解析JSON响应
      const contextAnalysis: ContextAnalysisResult = JSON.parse(
        compressedContextData
      );

      return {
        summary: this.extractSummaryFromAnalysis(contextAnalysis),
        generatedAt: new Date().toISOString(),
        processingTime,
        contextAnalysis,
      };
    } catch (error) {
      throw new Error(
        `Kimi API调用失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  private extractSummaryFromAnalysis(analysis: ContextAnalysisResult): string {
    // 从分析结果中提取摘要信息
    const projectName = analysis.metadata?.name || "上下文分析";
    const taskType = analysis.metadata?.task_type || "general_chat";
    const fileCount = Object.keys(analysis.assets?.files || {}).length;

    let summary = `项目: ${projectName} (${taskType})`;

    if (fileCount > 0) {
      summary += `，包含 ${fileCount} 个资产文件`;
    }

    if (analysis.history?.length > 0) {
      summary += `，${analysis.history.length} 轮对话记录`;
    }

    return summary;
  }

  private async callRealKimiAPIWithFile(file: File): Promise<string> {
    // 创建FormData用于文件上传
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "file-extract");

    // 首先上传文件到Kimi
    const uploadResponse = await fetch(`${this.config.baseUrl}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `文件上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    // 生成提示词内容
    const systemContent = PROMPTS.SYSTEM;
    const userContent = PROMPTS.CONTEXT_ANALYSIS(file.name);

    // 然后调用聊天API分析文件
    const analysisResponse = await fetch(
      `${this.config.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_KIMI_MODEL || "kimi-k2-0711-preview",
          messages: [
            {
              role: "system",
              content: systemContent,
            },
            {
              role: "user",
              content: userContent,
              attachments: [
                {
                  type: "file_search",
                  file_id: fileId,
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!analysisResponse.ok) {
      throw new Error(
        `API分析请求失败: ${analysisResponse.status} ${analysisResponse.statusText}`
      );
    }

    const analysisData = await analysisResponse.json();
    return analysisData.choices[0].message.content;
  }

  private async mockApiCall(
    _content: string,
    _fileName: string
  ): Promise<void> {
    // 模拟网络延迟
    const delay = 2000 + Math.random() * 3000; // 2-5秒随机延迟
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 模拟API调用可能的错误
    if (Math.random() < 0.1) {
      // 10% 概率出错
      throw new Error("网络连接错误");
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.mockApiCall("test", "test.txt");
      return true;
    } catch {
      return false;
    }
  }
}

// 导出默认实例
export const kimiApi = new KimiApiService();

// 便捷函数
export async function processFileWithKimi(
  file: File
): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
  return kimiApi.processFile(file);
}
