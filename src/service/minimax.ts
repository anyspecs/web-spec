import type { ProcessingResult } from "@/types/context";
import type { ContextAnalysisResult } from "@/types/specs";
import { PROMPTS } from "@/config/prompts";

export interface MinimaxApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  groupId?: string;
}

export class MinimaxApiService {
  private config: MinimaxApiConfig;

  constructor(config: MinimaxApiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_MINIMAX_API_KEY,
      baseUrl:
        config.baseUrl ||
        import.meta.env.VITE_MINIMAX_BASE_URL ||
        "https://api.minimaxi.com/v1",
      model:
        config.model || import.meta.env.VITE_MINIMAX_MODEL || "MiniMax-Text-01",
      groupId: config.groupId || import.meta.env.VITE_MINIMAX_GROUP_ID,
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

      // 调用MiniMax API进行文件分析
      const rawResponse = await this.callMinimaxAPI(file.name, fileContent);

      const processingTime = Date.now() - startTime;

      return {
        rawResponse,
        processingTime,
        generatedAt: new Date().toISOString(),
        fileName: file.name,
      };
    } catch (error) {
      throw new Error(
        `MiniMax API调用失败: ${
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

  private async callMinimaxAPI(
    fileName: string,
    fileContent: string
  ): Promise<string> {
    // 生成提示词内容
    const systemContent = PROMPTS.SYSTEM;
    const userContent =
      PROMPTS.CONTEXT_ANALYSIS(fileName) + `\n\n文件内容：\n${fileContent}`;

    console.log("🔍 MiniMax API调用参数:", {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      groupId: this.config.groupId,
      hasApiKey: !!this.config.apiKey,
      apiKeyPreview: this.config.apiKey?.substring(0, 10) + "...",
      messageCount: 2,
      systemContentLength: systemContent.length,
      userContentLength: userContent.length,
      fileContentPreview: fileContent.substring(0, 200) + "...",
    });

    // 检查必要参数
    if (!this.config.groupId) {
      throw new Error("MiniMax API需要groupId参数，请在环境变量中设置VITE_MINIMAX_GROUP_ID");
    }

    // 调用MiniMax API分析文件 - 使用正确的端点格式
    const url = `${this.config.baseUrl}/text/chatcompletion_pro?GroupId=${this.config.groupId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        tokens_to_generate: 8192,
        reply_constraints: {
          sender_type: "BOT",
          sender_name: "MM智能助理",
        },
        messages: [
          {
            sender_type: "USER",
            sender_name: "用户",
            text: systemContent + "\n\n" + userContent,
          },
        ],
        bot_setting: [
          {
            bot_name: "MM智能助理",
            content: "你是一个专业的文件分析助手，能够分析各种类型的文件并提供结构化的总结。请以JSON格式返回分析结果。",
          },
        ],
      }),
    });

    console.log("🔍 MiniMax API响应状态:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 MiniMax API错误响应:", errorText);
      throw new Error(
        `MiniMax API分析请求失败: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const responseData = await response.json();
    console.log("🔍 MiniMax API完整响应:", responseData);

    // 检查响应结构 - MiniMax API返回格式
    console.log("🔍 MiniMax 响应结构检查:", {
      hasChoices: !!responseData.choices,
      choicesLength: responseData.choices?.length || 0,
      firstChoice: responseData.choices?.[0],
      hasMessages: !!responseData.choices?.[0]?.messages,
      messagesLength: responseData.choices?.[0]?.messages?.length || 0,
      baseResp: responseData.base_resp,
    });

    // MiniMax API响应格式: 优先使用reply字段，然后尝试choices结构
    const reply = responseData.reply;
    const choicesContent = responseData.choices?.[0]?.messages?.[0]?.text;
    
    console.log("🔍 MiniMax 响应内容解析:", {
      hasReply: !!reply,
      replyType: typeof reply,
      replyLength: reply?.length || 0,
      hasChoices: !!responseData.choices,
      choicesContent: choicesContent,
      choicesType: typeof choicesContent,
      choicesLength: choicesContent?.length || 0,
    });

    // 优先使用reply字段
    if (reply && typeof reply === 'string' && reply.trim()) {
      console.log("🔍 使用reply字段:", {
        preview: reply.substring(0, 200),
      });
      return reply;
    }

    // 备选：使用choices结构
    if (choicesContent && typeof choicesContent === 'string' && choicesContent.trim()) {
      console.log("🔍 使用choices内容:", {
        preview: choicesContent.substring(0, 200),
      });
      return choicesContent;
    }

    // 如果都为空，尝试其他可能的字段
    console.log("🔍 尝试其他MiniMax响应字段:", {
      alternativeFields: {
        output_text: responseData.output_text,
        text: responseData.text,
        content: responseData.content,
      },
      fullResponseKeys: Object.keys(responseData),
    });

    const alternative =
      responseData.output_text ||
      responseData.text ||
      responseData.content;

    if (alternative && typeof alternative === 'string' && alternative.trim()) {
      console.log("🔍 找到MiniMax替代内容:", {
        type: typeof alternative,
        length: alternative.length,
        preview: alternative.substring(0, 200),
      });
      return alternative;
    }

    return "空响应 - 检查MiniMax API响应格式";
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("🔍 开始MiniMax API连接测试...");

      // 检查GroupId
      if (!this.config.groupId) {
        console.error("🔍 MiniMax连接测试失败: 缺少groupId");
        return false;
      }

      // MiniMax使用简单的聊天请求来测试连接
      const testUrl = `${this.config.baseUrl}/text/chatcompletion_pro?GroupId=${this.config.groupId}`;
      const testResponse = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          tokens_to_generate: 10,
          reply_constraints: {
            sender_type: "BOT",
            sender_name: "MM智能助理",
          },
          messages: [
            {
              sender_type: "USER",
              sender_name: "用户",
              text: "测试连接",
            },
          ],
          bot_setting: [
            {
              bot_name: "MM智能助理",
              content: "你是一个AI助手。",
            },
          ],
        }),
      });

      console.log("🔍 MiniMax 连接测试响应:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log("🔍 MiniMax 测试响应:", data);
      }

      return testResponse.ok;
    } catch (error) {
      console.error("🔍 MiniMax 连接测试失败:", error);
      return false;
    }
  }
}

// 导出默认实例
export const minimaxApi = new MinimaxApiService();

// 便捷函数
export async function processFileWithMinimax(file: File): Promise<{
  rawResponse: string;
  processingTime: number;
  generatedAt: string;
  fileName: string;
}> {
  return minimaxApi.processFile(file);
}