import type {
  SpecsFile,
  ContextAnalysisResult,
} from "@/types/specs";

/**
 * 生成.specs文件名 - 智能命名基于解析内容
 */
export function generateSpecsFileName(
  originalFileName: string,
  projectName?: string
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-") // 替换冒号和点号
    .replace("T", "_") // 替换T为下划线
    .split(".")[0]; // 去掉毫秒部分

  // 智能提取项目名称
  let baseName = extractProjectName(originalFileName, projectName);

  // 清理文件名中的特殊字符
  baseName = sanitizeFileName(baseName);

  return `${baseName}_context_${timestamp}.specs`;
}

/**
 * 智能提取项目名称
 */
function extractProjectName(originalFileName: string, parsedProjectName?: string): string {
  // 优先使用解析出的项目名称
  if (parsedProjectName && parsedProjectName.trim() && parsedProjectName !== "未知项目") {
    return parsedProjectName.trim();
  }

  // 从原始文件名提取有意义的名称
  if (originalFileName && originalFileName.trim()) {
    const safeOriginalName = originalFileName.trim();
    
    // 移除文件扩展名
    let extracted = safeOriginalName.replace(/\.[^/.]+$/, "");
    
    // 移除常见的时间戳模式
    extracted = extracted.replace(/_\d{4}-\d{2}-\d{2}.*$/, "");
    extracted = extracted.replace(/_\d{8}_\d{6}.*$/, "");
    extracted = extracted.replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*$/, "");
    
    // 移除常见的前缀
    extracted = extracted.replace(/^(conversation|chat|context|export)[-_]?/i, "");
    
    // 如果提取后还有有意义的内容，使用它
    if (extracted.length > 0 && extracted.length < 50) {
      return extracted;
    }
  }

  // 默认名称
  return "AI分析结果";
}

/**
 * 清理文件名中的特殊字符
 */
function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return "未命名";
  
  return name
    // 保留中文、英文、数字、下划线、短横线
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-\s]/g, "_")
    // 将多个空格或特殊字符替换为单个下划线
    .replace(/[\s_-]+/g, "_")
    // 移除开头和结尾的下划线
    .replace(/^_+|_+$/g, "")
    // 限制长度
    .substring(0, 30);
}


/**
 * 将.specs文件保存到本地（浏览器下载）
 */
export function downloadSpecsFile(
  specsData: SpecsFile,
  fileName?: string
): void {
  try {
    // 格式化JSON内容
    const jsonContent = JSON.stringify(specsData, null, 2);

    // 创建Blob对象
    const blob = new Blob([jsonContent], { type: "application/json" });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // 设置下载文件名
    const projectName = specsData.metadata?.name || "未命名项目";
    link.download = fileName || generateSpecsFileName("chat", projectName);
    link.href = url;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`已下载.specs文件: ${link.download}`);
  } catch (error) {
    console.error("下载.specs文件失败:", error);
    throw new Error(
      `文件下载失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}







/**
 * Specs处理结果接口
 */
export interface SpecsProcessingResult {
  specsFile: SpecsFile;
  specsFileName: string;
  contextAnalysis: ContextAnalysisResult;
  summary: string;
  parsingMethod: 'JSON' | 'Text';
}

/**
 * 简化版本：直接将API响应包装为Specs文件
 */
export function parseApiResponseToSpecs(
  rawResponse: string,
  fileName: string
): SpecsProcessingResult {
  if (!rawResponse || typeof rawResponse !== "string") {
    throw new Error("API响应为空或格式错误");
  }

  // 尝试解析JSON，如果失败就用原始文本
  let specsFile: SpecsFile;
  let parsingMethod: 'JSON' | 'Text' = 'Text';
  
  try {
    const jsonData = JSON.parse(rawResponse);
    specsFile = jsonData; // 直接使用解析出的JSON作为specs文件
    parsingMethod = 'JSON';
  } catch (error) {
    // JSON解析失败，包装为基本specs格式
    specsFile = {
      version: "1.0",
      metadata: {
        name: extractProjectName(fileName, undefined),
        task_type: "general_chat",
        createdAt: new Date().toISOString(),
        source_file: fileName
      },
      raw_api_response: rawResponse
    };
  }

  // 生成文件名
  const specsFileName = generateSpecsFileName(fileName, specsFile.metadata?.name);
  
  // 创建简化的contextAnalysis
  const contextAnalysis: ContextAnalysisResult = {
    metadata: specsFile.metadata,
    instructions: specsFile.instructions,
    assets: specsFile.assets,
    examples: specsFile.examples,
    history: specsFile.history,
  };

  const summary = `文件已处理 (${parsingMethod}格式)`;

  return {
    specsFile,
    specsFileName,
    contextAnalysis,
    summary,
    parsingMethod,
  };
}

