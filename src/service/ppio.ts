import type { ProcessingResult } from "@/types/context";
import type { ContextAnalysisResult } from "@/types/specs";
import { PROMPTS } from "@/config/prompts";

export interface PpioApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class PpioApiService {
  private config: PpioApiConfig;

  constructor(config: PpioApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_PPIO_API_KEY,
      baseUrl:
        config.baseUrl ||
        import.meta.env.VITE_PPIO_BASE_URL ||
        "https://api.ppinfra.com/v3/openai",
      model:
        config.model || import.meta.env.VITE_PPIO_MODEL || "deepseek/deepseek-r1",
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

      // 调用PPIO API进行文件分析
      const rawResponse = await this.callPpioAPI(file.name, fileContent);

      const processingTime = Date.now() - startTime;

      return {
        rawResponse,
        processingTime,
        generatedAt: new Date().toISOString(),
        fileName: file.name,
      };
    } catch (error) {
      throw new Error(
        `PPIO API调用失败: ${
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

  private async callPpioAPI(
    fileName: string,
    fileContent: string
  ): Promise<string> {
    // 生成提示词内容
    const systemContent = PROMPTS.SYSTEM;
    const userContent =
      PROMPTS.CONTEXT_ANALYSIS(fileName) + `\n\n文件内容：\n${fileContent}`;

    console.log("🔍 PPIO API调用参数:", {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
      apiKeyPreview: this.config.apiKey?.substring(0, 10) + "...",
      messageCount: 2,
      systemContentLength: systemContent.length,
      userContentLength: userContent.length,
      fileContentPreview: fileContent.substring(0, 200) + "...",
    });

    // 调用PPIO API分析文件 - 使用OpenAI兼容格式
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
        stream: false,
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });

    console.log("🔍 PPIO API响应状态:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 PPIO API错误响应:", errorText);
      throw new Error(
        `PPIO API分析请求失败: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const responseData = await response.json();
    console.log("🔍 PPIO API完整响应:", responseData);

    // 检查响应结构 - OpenAI兼容格式
    console.log("🔍 PPIO 响应结构检查:", {
      hasChoices: !!responseData.choices,
      choicesLength: responseData.choices?.length || 0,
      firstChoice: responseData.choices?.[0],
      hasMessage: !!responseData.choices?.[0]?.message,
      messageKeys: responseData.choices?.[0]?.message
        ? Object.keys(responseData.choices[0].message)
        : [],
    });

    const content = responseData.choices?.[0]?.message?.content;
    console.log("🔍 PPIO 提取的内容:", {
      contentType: typeof content,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) || "null/undefined",
      isEmptyString: content === "",
      isNull: content === null,
      isUndefined: content === undefined,
    });

    // 如果content为空，尝试其他可能的字段
    if (!content) {
      console.log("🔍 尝试其他PPIO响应字段:", {
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
        console.log("🔍 找到PPIO替代内容:", {
          type: typeof alternative,
          length: alternative.length,
          preview: alternative.substring(0, 200),
        });
        return alternative;
      }
    }

    return content || "空响应 - 检查PPIO API响应格式";
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("🔍 开始PPIO API连接测试...");

      const testResponse = await fetch(`${this.config.baseUrl}/chat/completions`, {
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
              content: "您是一个专业的AI助手。",
            },
            {
              role: "user",
              content: "测试连接",
            },
          ],
          stream: false,
          max_tokens: 10,
        }),
      });

      console.log("🔍 PPIO 连接测试响应:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log("🔍 PPIO 测试响应:", data);
      }

      return testResponse.ok;
    } catch (error) {
      console.error("🔍 PPIO 连接测试失败:", error);
      return false;
    }
  }
}

// 导出默认实例
export const ppioApi = new PpioApiService();

// 便捷函数
export async function processFileWithPpio(file: File): Promise<{
  rawResponse: string;
  processingTime: number;
  generatedAt: string;
  fileName: string;
}> {
  return ppioApi.processFile(file);
}