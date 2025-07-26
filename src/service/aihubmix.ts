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

  async processFile(
    file: File
  ): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
    const startTime = Date.now();

    try {
      // 读取文件内容
      const fileContent = await this.readFileContent(file);

      // 调用aihubmix API进行文件分析
      const compressedContextData = await this.callAihubmixAPI(
        file.name,
        fileContent
      );

      const processingTime = Date.now() - startTime;

      // 智能解析API响应 - 支持多种格式
      let contextAnalysis: any;
      const parsedData = this.parseApiResponse(compressedContextData);

      if (parsedData.success && parsedData.data) {
        // 成功解析为聊天压缩格式
        contextAnalysis = {
          metadata: {
            name: parsedData.data.context_summary?.main_topic || "聊天记录压缩",
            task_type: "chat_compression",
          },
          compressed_context: parsedData.data,
          raw_response: compressedContextData,
          parsing_method: parsedData.method,
        };
      } else {
        // 解析失败，保留原始响应用于调试
        contextAnalysis = {
          raw_response: compressedContextData,
          metadata: { name: "原始API响应", task_type: "debug" },
          assets: { files: {} },
          history: [],
          parsing_error: parsedData.error,
        };
      }

      return {
        summary: `原始API响应 (${compressedContextData.length} 字符)`,
        generatedAt: new Date().toISOString(),
        processingTime,
        contextAnalysis,
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

  /**
   * 智能解析API响应 - 支持JSON、YAML和结构化文本格式
   */
  private parseApiResponse(responseText: string): {
    success: boolean;
    data?: any;
    method?: string;
    error?: string;
  } {
    if (!responseText || typeof responseText !== "string") {
      return { success: false, error: "响应为空或格式错误" };
    }

    // 方法1: 尝试JSON解析
    try {
      const jsonData = JSON.parse(responseText);
      if (this.isValidCompressionFormat(jsonData)) {
        return { success: true, data: jsonData, method: "JSON" };
      }
    } catch (jsonError) {
      // JSON解析失败，继续尝试其他方法
    }

    // 方法2: 尝试YAML解析（简单实现）
    try {
      const yamlData = this.parseSimpleYaml(responseText);
      if (yamlData && this.isValidCompressionFormat(yamlData)) {
        return { success: true, data: yamlData, method: "YAML" };
      }
    } catch (yamlError) {
      // YAML解析失败，继续尝试其他方法
    }

    // 方法3: 尝试结构化文本解析
    try {
      const structuredData = this.parseStructuredText(responseText);
      if (structuredData && this.isValidCompressionFormat(structuredData)) {
        return {
          success: true,
          data: structuredData,
          method: "StructuredText",
        };
      }
    } catch (textError) {
      // 结构化文本解析失败
    }

    // 🔧 优化：最后尝试基础解析，创建最小可用的.specs格式
    try {
      const fallbackData = this.createFallbackSpecsFormat(responseText);
      if (fallbackData) {
        return {
          success: true,
          data: fallbackData,
          method: "Fallback",
        };
      }
    } catch (fallbackError) {
      // 最后的降级解析也失败
    }

    return {
      success: false,
      error: "无法解析为预期的.specs格式",
    };
  }

  /**
   * 验证是否为有效的.specs格式 - 优化版本，所有字段可选
   */
  private isValidCompressionFormat(data: any): boolean {
    if (!data || typeof data !== "object") return false;

    // 🔧 优化：放宽验证标准，适应灵活的.specs格式
    
    // 检查基本结构：至少要有一个有意义的顶级字段
    const validTopLevelFields = [
      "metadata", "instructions", "assets", "history", 
      "compressed_context", "context_summary", "user_profile",
      "examples", "version"
    ];
    
    const hasValidTopLevel = validTopLevelFields.some(field => 
      data[field] && (typeof data[field] === "object" || typeof data[field] === "string")
    );

    if (!hasValidTopLevel) return false;

    // 如果有metadata，检查基本结构
    if (data.metadata) {
      // metadata存在时，至少要有name或task_type之一
      const hasBasicMetadata = data.metadata.name || data.metadata.task_type;
      if (!hasBasicMetadata) return false;
    }

    // 如果是compressed_context类型，检查关键字段（放宽要求）
    if (data.compressed_context) {
      const contextSummary = data.compressed_context.context_summary;
      if (contextSummary) {
        // 至少要有主题或任务之一
        const hasMinimalContext = contextSummary.main_topic || 
                                 contextSummary.current_task || 
                                 contextSummary.user_intent;
        if (!hasMinimalContext) return false;
      }
    }

    // 🎯 核心原则：宽进严出，只要有合理结构就接受
    return true;
  }

  /**
   * 简单YAML解析器（仅支持基本结构）
   */
  private parseSimpleYaml(yamlText: string): any {
    const result: any = {};
    const lines = yamlText.split("\n");
    let currentSection: any = result;
    let currentKey = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:/)) {
        // 顶级键
        const [key, value] = trimmed.split(":", 2);
        currentKey = key.trim();
        const val = value?.trim();

        if (val && val !== "") {
          result[currentKey] = this.parseYamlValue(val);
        } else {
          result[currentKey] = {};
          currentSection = result[currentKey];
        }
      } else if (line.match(/^  [a-zA-Z_][a-zA-Z0-9_]*:/)) {
        // 二级键
        const [key, value] = trimmed.split(":", 2);
        const cleanKey = key.trim();
        const val = value?.trim();

        if (currentSection && typeof currentSection === "object") {
          currentSection[cleanKey] = val ? this.parseYamlValue(val) : {};
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * 解析YAML值
   */
  private parseYamlValue(value: string): any {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      return value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim());
    }
    if (value === "true") return true;
    if (value === "false") return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  /**
   * 解析结构化文本格式
   */
  private parseStructuredText(text: string): any {
    const result: any = {};
    const sections = text.split(/\n(?=\d+\.\s|\w+:)/);

    for (const section of sections) {
      const lines = section.trim().split("\n");
      if (lines.length === 0) continue;

      const headerLine = lines[0].trim();

      // 匹配 "2. 核心上下文摘要" 或 "context_summary:" 格式
      let sectionKey = "";
      if (headerLine.match(/^\d+\.\s*(.+)/)) {
        const match = headerLine.match(/^\d+\.\s*(.+)/);
        sectionKey = this.textToKey(match![1]);
      } else if (headerLine.includes(":")) {
        sectionKey = headerLine.split(":")[0].trim();
      }

      if (sectionKey) {
        result[sectionKey] = this.parseTextSection(lines.slice(1));
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * 将中文文本转换为键名
   */
  private textToKey(text: string): string {
    const keyMap: { [key: string]: string } = {
      元数据层: "metadata",
      核心上下文摘要: "context_summary",
      关键实体和概念: "key_entities",
      用户画像快照: "user_profile",
      决策和结论记录: "decisions_made",
      待解决问题: "pending_issues",
      工具和资源使用: "resources_used",
      对话流程关键节点: "conversation_flow",
      上下文恢复指令: "context_restoration",
      接收方使用要求: "receiver_instructions",
    };

    return keyMap[text] || text.toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * 解析文本段落 - 优化版本，更灵活的字段提取
   */
  private parseTextSection(lines: string[]): any {
    const result: any = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes(":")) {
        const [key, ...valueParts] = trimmed.split(":");
        const cleanKey = key.trim().replace(/^\s*-\s*/, "");
        const cleanValue = valueParts.join(":").trim().replace(/^["']|["']$/g, "");

        // 🔧 优化：即使值为空也保留字段，用于灵活的.specs格式
        if (cleanKey) {
          result[cleanKey] = cleanValue || "";
        }
      } else if (trimmed.startsWith("-")) {
        // 处理列表项
        const listKey = "items";
        if (!result[listKey]) result[listKey] = [];
        result[listKey].push(trimmed.replace(/^\s*-\s*/, ""));
      }
    }

    // 🎯 优化：保持结构化数据，即使某些字段为空
    return Object.keys(result).length > 0 ? result : { content: lines.join("\n") };
  }

  /**
   * 创建降级的.specs格式 - 当所有解析方法都失败时使用
   */
  private createFallbackSpecsFormat(responseText: string): any {
    // 提取可能的标题作为name
    const lines = responseText.split("\n").filter(line => line.trim());
    const firstLine = lines[0]?.trim() || "";
    
    // 简单启发式方法提取主题
    let extractedName = "AI分析结果";
    if (firstLine.length > 0 && firstLine.length < 100) {
      extractedName = firstLine.replace(/^#+\s*/, "").replace(/[:：].*$/, "");
    }

    // 判断可能的任务类型
    let taskType: "general_chat" | "document_analysis" | "code_project" | "chat_compression" = "general_chat";
    const lowerText = responseText.toLowerCase();
    if (lowerText.includes("代码") || lowerText.includes("code") || lowerText.includes("函数")) {
      taskType = "code_project";
    } else if (lowerText.includes("文档") || lowerText.includes("document") || lowerText.includes("分析")) {
      taskType = "document_analysis";
    } else if (lowerText.includes("压缩") || lowerText.includes("上下文") || lowerText.includes("context")) {
      taskType = "chat_compression";
    }

    return {
      version: "1.0",
      metadata: {
        name: extractedName,
        task_type: taskType,
        createdAt: new Date().toISOString(),
        analysis_model: "fallback-parser"
      },
      instructions: {
        role_and_goal: "基于AI分析结果生成的上下文信息"
      },
      // 将原始响应作为内容保存
      raw_api_response: responseText.length > 10000 ? 
        responseText.substring(0, 10000) + "... [内容过长已截断]" : 
        responseText
    };
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
export async function processFileWithAihubmix(
  file: File
): Promise<ProcessingResult & { contextAnalysis: ContextAnalysisResult }> {
  return aihubmixApi.processFile(file);
}
