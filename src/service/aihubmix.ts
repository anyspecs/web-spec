import type { ProcessingResult } from "@/types/context";
import type { ContextAnalysisResult } from "@/types/specs";
import { PROMPTS } from "@/config/prompts";

export interface AihubmixApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class AihubmixApiService {
  private config: AihubmixApiConfig;

  constructor(config: AihubmixApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_AIHUBMIX_API_KEY,
      baseUrl:
        config.baseUrl ||
        import.meta.env.VITE_AIHUBMIX_BASE_URL ||
        "https://aihubmix.com/v1",
      model:
        config.model || import.meta.env.VITE_AIHUBMIX_MODEL || "gpt-4o-mini",
      ...config,
    };
  }

  async processFile(file: File): Promise<{
    rawResponse: string;
    processingTime: number;
    generatedAt: string;
    fileName: string;
  }> {
    const startTime = Date.now();

    try {
      // 读取文件内容
      const fileContent = await this.readFileContent(file);

      // 调用aihubmix API进行文件分析
      const rawResponse = await this.callAihubmixAPI(file.name, fileContent);

      const processingTime = Date.now() - startTime;

      return {
        rawResponse,
        processingTime,
        generatedAt: new Date().toISOString(),
        fileName: file.name,
      };
    } catch (error) {
      throw new Error(
        `Aihubmix API调用失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }


  private async callAihubmixAPI(
    fileName: string,
    fileContent: string
  ): Promise<string> {
    // 生成提示词内容
    const systemContent = PROMPTS.SYSTEM;
    const userContent =
      PROMPTS.CONTEXT_ANALYSIS(fileName) + `\n\n文件内容：\n${fileContent}`;

    console.log("🔍 API调用参数:", {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
      apiKeyPreview: this.config.apiKey?.substring(0, 10) + "...",
      messageCount: 2,
      systemContentLength: systemContent.length,
      userContentLength: userContent.length,
      fileContentPreview: fileContent.substring(0, 200) + "...",
    });

    // 移除内容长度限制，处理完整输入

    // 调用aihubmix API分析文件
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.3,
        max_tokens: 10000, // 增加输出限制，支持更长的压缩结果
        // response_format: { type: 'json_object' }, // 暂时注释，部分模型不支持
      }),
    });

    console.log("🔍 API响应状态:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 API错误响应:", errorText);
      throw new Error(
        `API分析请求失败: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const responseData = await response.json();
    console.log("🔍 API完整响应:", responseData);

    // 检查响应结构
    console.log("🔍 响应结构检查:", {
      hasChoices: !!responseData.choices,
      choicesLength: responseData.choices?.length || 0,
      firstChoice: responseData.choices?.[0],
      hasMessage: !!responseData.choices?.[0]?.message,
      messageKeys: responseData.choices?.[0]?.message
        ? Object.keys(responseData.choices[0].message)
        : [],
    });

    const content = responseData.choices?.[0]?.message?.content;
    console.log("🔍 提取的内容:", {
      contentType: typeof content,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) || "null/undefined",
      isEmptyString: content === "",
      isNull: content === null,
      isUndefined: content === undefined,
    });

    // 如果content为空，尝试其他可能的字段
    if (!content) {
      console.log("🔍 尝试其他响应字段:", {
        hasChoicesArray: Array.isArray(responseData.choices),
        choicesLength: responseData.choices?.length,
        firstChoiceKeys: responseData.choices?.[0]
          ? Object.keys(responseData.choices[0])
          : [],
        messageObject: responseData.choices?.[0]?.message,
        alternativeContent:
          responseData.content ||
          responseData.text ||
          responseData.output ||
          responseData.result,
      });

      // 尝试不同的路径获取内容
      const alternative =
        responseData.content ||
        responseData.text ||
        responseData.output ||
        responseData.result ||
        responseData.choices?.[0]?.text ||
        responseData.choices?.[0]?.delta?.content;

      if (alternative) {
        console.log("🔍 找到替代内容:", {
          type: typeof alternative,
          length: alternative.length,
          preview: alternative.substring(0, 200),
        });
        return alternative;
      }
    }

    return content || "空响应 - 检查API响应格式";
  }










  async testConnection(): Promise<boolean> {
    try {
      console.log("🔍 开始API连接测试...");

      const testResponse = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      console.log("🔍 连接测试响应:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log("🔍 可用模型:", data);
      }

      return testResponse.ok;
    } catch (error) {
      console.error("🔍 连接测试失败:", error);
      return false;
    }
  }
}

// 导出默认实例
export const aihubmixApi = new AihubmixApiService();

// 便捷函数
export async function processFileWithAihubmix(file: File): Promise<{
  rawResponse: string;
  processingTime: number;
  generatedAt: string;
  fileName: string;
}> {
  return aihubmixApi.processFile(file);
}
