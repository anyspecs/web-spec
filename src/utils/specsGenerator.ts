import type {
  SpecsFile,
  ContextAnalysisResult,
  SpecsGenerationOptions,
} from "@/types/specs";

/**
 * 生成.specs文件名 - 基于项目名称的新规则
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

  // 使用项目名称或从原文件名提取
  let baseName = projectName || originalFileName.replace(/\.[^/.]+$/, "");

  // 清理文件名中的特殊字符
  baseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");

  return `${baseName}_context_${timestamp}.specs`;
}

/**
 * 从ContextAnalysisResult生成完整的SpecsFile
 */
export function generateSpecsFile(
  originalFileName: string,

  contextAnalysis: ContextAnalysisResult,

  options: SpecsGenerationOptions = {}
): SpecsFile {
  const now = new Date().toISOString();

  const specsFile: SpecsFile = {
    version: "1.0",
    metadata: {
      name: contextAnalysis.metadata.name,
      task_type: contextAnalysis.metadata.task_type,
      createdAt: now,
      source_file: options.includeSourceFile ? originalFileName : undefined,
      processing_model: "kimi-k2-0711-preview",
    },
    instructions: {
      role_and_goal: contextAnalysis.instructions.role_and_goal,
    },
    assets: {
      files: contextAnalysis.assets.files,
    },
    examples: contextAnalysis.examples || [],
    history: contextAnalysis.history.map((item) => ({
      role: item.role,
      content: item.content,
      timestamp: item.timestamp,
      metadata: item.metadata,
    })),
  };

  return specsFile;
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
    link.download =
      fileName || generateSpecsFileName("chat", specsData.metadata.name);
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
 * 从.specs文件生成用于新对话的上下文提示词
 */
export function generateContinuationPrompt(specsData: SpecsFile): string {
  const { metadata, instructions, assets, history } = specsData;

  let prompt = `基于以下项目上下文继续协助用户：

## 项目信息
- 项目名称: ${metadata.name}
- 任务类型: ${metadata.task_type}
- 创建时间: ${metadata.createdAt}

## 角色定位
${instructions.role_and_goal}

`;

  // 添加资产状态信息
  const fileEntries = Object.entries(assets.files);
  if (fileEntries.length > 0) {
    prompt += `## 项目资产
`;
    fileEntries.forEach(([filePath, fileAsset]) => {
      const latestState =
        fileAsset.state_chain[fileAsset.state_chain.length - 1];
      prompt += `### ${filePath} (${fileAsset.asset_id})
最新状态: ${latestState.state_id} - ${latestState.summary}
`;

      // 显示状态变迁历史
      if (fileAsset.state_chain.length > 1) {
        prompt += `状态历史:
`;
        fileAsset.state_chain.forEach((state) => {
          prompt += `- ${state.state_id}: ${state.summary}
`;
        });
      }
      prompt += `
`;
    });
  }

  // 添加关键对话历史
  if (history.length > 0) {
    prompt += `## 对话历史摘要
`;
    // 只显示最后几轮关键对话
    const recentHistory = history.slice(-5);
    recentHistory.forEach((item) => {
      const assetRef = item.metadata?.asset_reference
        ? ` [引用: ${item.metadata.asset_reference}]`
        : "";
      prompt += `**${item.role}**: ${item.content}${assetRef}
`;
    });
    prompt += `
`;
  }

  prompt += `## 继续协作指导
请基于以上项目上下文，以自然的方式继续协助用户。保持一致的角色设定和专业水准，并能够引用具体的项目资产状态。

当需要引用文件时，请使用格式: [asset: asset_id, state: state_id]
当对文件进行修改时，请在对话中明确说明变更内容和原因。`;

  return prompt;
}

/**
 * 解析.specs文件中的资产引用
 * 格式: [asset: file-001, state: s1]
 */
export function parseAssetReference(content: string): Array<{
  assetId: string;
  stateId: string;
  fullMatch: string;
}> {
  const regex = /\[asset:\s*([^,]+),\s*state:\s*([^\]]+)\]/g;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      assetId: match[1].trim(),
      stateId: match[2].trim(),
      fullMatch: match[0],
    });
  }

  return matches;
}

/**
 * 获取指定资产的特定状态内容
 */
export function getAssetStateContent(
  specsData: SpecsFile,
  assetId: string,
  stateId: string
): string | null {
  // 查找对应的资产
  for (const [filePath, fileAsset] of Object.entries(specsData.assets.files)) {
    if (fileAsset.asset_id === assetId) {
      // 查找对应的状态
      const state = fileAsset.state_chain.find((s) => s.state_id === stateId);
      if (state) {
        return state.content || state.patch || null;
      }
    }
  }

  return null;
}

/**
 * 验证.specs文件结构的完整性
 */
export function validateSpecsFile(specsData: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查基本结构
  if (!specsData.version) errors.push("缺少version字段");
  if (!specsData.metadata) errors.push("缺少metadata字段");
  if (!specsData.instructions) errors.push("缺少instructions字段");
  if (!specsData.assets) errors.push("缺少assets字段");
  if (!specsData.history) errors.push("缺少history字段");

  // 检查metadata
  if (specsData.metadata) {
    if (!specsData.metadata.name) errors.push("metadata缺少name字段");
    if (!specsData.metadata.task_type) errors.push("metadata缺少task_type字段");
    if (!specsData.metadata.createdAt) errors.push("metadata缺少createdAt字段");
  }

  // 检查assets结构
  if (specsData.assets?.files) {
    Object.entries(specsData.assets.files).forEach(
      ([filePath, fileAsset]: [string, any]) => {
        if (!fileAsset.asset_id) errors.push(`文件${filePath}缺少asset_id`);
        if (!fileAsset.state_chain || !Array.isArray(fileAsset.state_chain)) {
          errors.push(`文件${filePath}的state_chain无效`);
        } else if (fileAsset.state_chain.length === 0) {
          errors.push(`文件${filePath}的state_chain为空`);
        }
      }
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
