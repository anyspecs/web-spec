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
  const safeOriginalName = originalFileName || '未知文件';
  let baseName = projectName || safeOriginalName.replace(/\.[^/.]+$/, "");

  // 清理文件名中的特殊字符
  baseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");

  return `${baseName}_context_${timestamp}.specs`;
}

/**
 * 从ContextAnalysisResult生成完整的SpecsFile - 支持可选字段
 */
export function generateSpecsFile(
  originalFileName: string,
  contextAnalysis: ContextAnalysisResult,
  options: SpecsGenerationOptions = {}
): SpecsFile {
  const now = new Date().toISOString();

  // 基础specs文件结构，所有字段可选
  const specsFile: SpecsFile = {
    version: "1.0",
  };

  // 安全构建metadata - 支持prompt中所有可选字段
  if (contextAnalysis.metadata || originalFileName) {
    specsFile.metadata = {
      name: contextAnalysis.metadata?.name || originalFileName || "未命名文件",
      task_type: contextAnalysis.metadata?.task_type || "general_chat",
      createdAt: now,
    };

    // 添加所有可选的metadata字段
    if (options.includeSourceFile || originalFileName) {
      specsFile.metadata.source_file = originalFileName;
    }
    
    if (contextAnalysis.metadata?.source_platform) {
      specsFile.metadata.source_platform = contextAnalysis.metadata.source_platform;
    }
    
    if (contextAnalysis.metadata?.analysis_model) {
      specsFile.metadata.analysis_model = contextAnalysis.metadata.analysis_model;
    }
    
    if (contextAnalysis.metadata?.processing_model || (contextAnalysis as any).processing_model) {
      specsFile.metadata.processing_model = contextAnalysis.metadata?.processing_model || (contextAnalysis as any).processing_model;
    }
    
    if (contextAnalysis.metadata?.project) {
      specsFile.metadata.project = contextAnalysis.metadata.project;
    }
    
    if (contextAnalysis.metadata?.project_path) {
      specsFile.metadata.project_path = contextAnalysis.metadata.project_path;
    }
    
    if (contextAnalysis.metadata?.session_id) {
      specsFile.metadata.session_id = contextAnalysis.metadata.session_id;
    }
    
    if (contextAnalysis.metadata?.original_date) {
      specsFile.metadata.original_date = contextAnalysis.metadata.original_date;
    }
  }

  // 如果有instructions，添加它们 - 支持完整的instructions结构
  if (contextAnalysis.instructions) {
    specsFile.instructions = {};
    
    if (contextAnalysis.instructions.role_and_goal) {
      specsFile.instructions.role_and_goal = contextAnalysis.instructions.role_and_goal;
    }
    
    if (contextAnalysis.instructions.context) {
      specsFile.instructions.context = contextAnalysis.instructions.context;
    }
    
    if (contextAnalysis.instructions.key_topics && contextAnalysis.instructions.key_topics.length > 0) {
      specsFile.instructions.key_topics = contextAnalysis.instructions.key_topics;
    }
  }

  // 如果有assets，添加它们
  if (contextAnalysis.assets?.files && Object.keys(contextAnalysis.assets.files).length > 0) {
    specsFile.assets = {
      files: contextAnalysis.assets.files,
    };
  }

  // 如果有examples，添加它们
  if (contextAnalysis.examples && contextAnalysis.examples.length > 0) {
    specsFile.examples = contextAnalysis.examples;
  }

  // 如果有history，添加它们
  if (contextAnalysis.history && contextAnalysis.history.length > 0) {
    specsFile.history = contextAnalysis.history;
  }

  // 检查是否为聊天压缩格式
  if ((contextAnalysis as any).compressed_context) {
    specsFile.compressed_context = (contextAnalysis as any).compressed_context;
    
    // 确保task_type为chat_compression
    if (specsFile.metadata) {
      specsFile.metadata.task_type = "chat_compression";
    }
    
    // 为聊天压缩格式添加默认的receiver_instructions
    if (!specsFile.compressed_context.receiver_instructions) {
      specsFile.compressed_context.receiver_instructions = {
        context_understanding: "请仔细阅读上述压缩的上下文信息，理解当前的对话状态、用户需求和项目背景。",
        response_requirements: [
          "基于上下文保持角色一致性",
          "参考用户画像调整沟通风格",
          "关注待解决问题并提供帮助",
          "遵循已确定的决策和约束条件"
        ],
        mandatory_reply: "我已理解上述上下文信息，将基于这些信息继续为您提供帮助。有什么我可以协助您的吗？",
        forbidden_actions: "不要忽略上下文中的重要信息，不要改变已建立的角色设定，不要重复解决已完成的问题。"
      };
    }
  }

  // 如果有原始API响应，添加它（调试用）
  if ((contextAnalysis as any).raw_response || (contextAnalysis as any).raw_api_response) {
    specsFile.raw_api_response = (contextAnalysis as any).raw_response || (contextAnalysis as any).raw_api_response;
  }

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
 * 从.specs文件生成用于新对话的上下文提示词 - 支持可选字段
 */
export function generateContinuationPrompt(specsData: SpecsFile): string {
  // 安全获取基础信息
  const projectName = specsData.metadata?.name || "未知项目";
  const taskType = specsData.metadata?.task_type || "general_chat";
  const createdAt = specsData.metadata?.createdAt || "未知时间";

  let prompt = `基于以下项目上下文继续协助用户：

## 项目信息
- 项目名称: ${projectName}
- 任务类型: ${taskType}
- 创建时间: ${createdAt}

`;

  // 添加指令信息（如果存在）
  if (specsData.instructions) {
    prompt += `## 指令信息
`;
    
    if (specsData.instructions.role_and_goal) {
      prompt += `### AI角色定位
${specsData.instructions.role_and_goal}
`;
    }
    
    if (specsData.instructions.context) {
      prompt += `### 上下文说明
${specsData.instructions.context}
`;
    }
    
    if (specsData.instructions.key_topics && specsData.instructions.key_topics.length > 0) {
      prompt += `### 关键主题
${specsData.instructions.key_topics.join(', ')}
`;
    }
    
    prompt += `
`;
  }

  // 添加资产状态信息（如果存在）
  const files = specsData.assets?.files;
  if (files && Object.keys(files).length > 0) {
    prompt += `## 项目资产
`;
    Object.entries(files).forEach(([filePath, fileAsset]) => {
      if (fileAsset?.state_chain && fileAsset.state_chain.length > 0) {
        const latestState = fileAsset.state_chain[fileAsset.state_chain.length - 1];
        const assetId = fileAsset.asset_id || "unknown";
        const stateId = latestState?.state_id || "unknown";
        const summary = latestState?.summary || "无描述";

        prompt += `### ${filePath} (${assetId})
最新状态: ${stateId} - ${summary}
`;

        // 显示状态变迁历史
        if (fileAsset.state_chain.length > 1) {
          prompt += `状态历史:
`;
          fileAsset.state_chain.forEach((state) => {
            if (state?.state_id && state?.summary) {
              prompt += `- ${state.state_id}: ${state.summary}
`;
            }
          });
        }
        prompt += `
`;
      }
    });
  }

  // 添加关键对话历史（如果存在）
  const history = specsData.history;
  if (history && history.length > 0) {
    prompt += `## 对话历史摘要
`;
    // 只显示最后几轮关键对话
    const recentHistory = history.slice(-5);
    recentHistory.forEach((item) => {
      if (item?.role && item?.content) {
        const assetRef = item.metadata?.asset_reference
          ? ` [引用: ${item.metadata.asset_reference}]`
          : "";
        prompt += `**${item.role}**: ${item.content}${assetRef}
`;
      }
    });
    prompt += `
`;
  }

  // 添加聊天压缩信息（如果存在）- 支持所有可选字段
  const compressedContext = specsData.compressed_context;
  if (compressedContext) {
    prompt += `## 聊天压缩上下文
`;
    
    // 核心摘要
    if (compressedContext.context_summary) {
      prompt += `### 核心摘要
`;
      if (compressedContext.context_summary.main_topic) {
        prompt += `- 主要话题: ${compressedContext.context_summary.main_topic}
`;
      }
      if (compressedContext.context_summary.current_task) {
        prompt += `- 当前任务: ${compressedContext.context_summary.current_task}
`;
      }
      if (compressedContext.context_summary.user_intent) {
        prompt += `- 用户意图: ${compressedContext.context_summary.user_intent}
`;
      }
      if (compressedContext.context_summary.conversation_stage) {
        prompt += `- 对话阶段: ${compressedContext.context_summary.conversation_stage}
`;
      }
    }
    
    // 关键实体
    if (compressedContext.key_entities) {
      const entities = [];
      if (compressedContext.key_entities.people?.length > 0) {
        entities.push(`人物: ${compressedContext.key_entities.people.join(', ')}`);
      }
      if (compressedContext.key_entities.concepts?.length > 0) {
        entities.push(`概念: ${compressedContext.key_entities.concepts.join(', ')}`);
      }
      if (compressedContext.key_entities.objects?.length > 0) {
        entities.push(`对象: ${compressedContext.key_entities.objects.join(', ')}`);
      }
      
      if (entities.length > 0) {
        prompt += `### 关键实体
${entities.join('\n')}
`;
      }
    }
    
    // 用户画像
    if (compressedContext.user_profile) {
      prompt += `### 用户画像
`;
      if (compressedContext.user_profile.expertise_level) {
        prompt += `- 专业水平: ${compressedContext.user_profile.expertise_level}
`;
      }
      if (compressedContext.user_profile.communication_style) {
        prompt += `- 沟通风格: ${compressedContext.user_profile.communication_style}
`;
      }
      if (compressedContext.user_profile.preferences?.length > 0) {
        prompt += `- 偏好: ${compressedContext.user_profile.preferences.join(', ')}
`;
      }
    }
    
    // 待解决问题
    if (compressedContext.pending_issues?.length > 0) {
      prompt += `### 待解决问题
`;
      compressedContext.pending_issues.slice(0, 3).forEach((issue) => {
        if (issue?.issue) {
          prompt += `- ${issue.issue}${issue.priority ? ` (优先级: ${issue.priority})` : ''}
`;
        }
      });
    }
    
    // 上下文恢复指令
    if (compressedContext.context_restoration) {
      if (compressedContext.context_restoration.next_expected_action) {
        prompt += `### 下一步行动
${compressedContext.context_restoration.next_expected_action}
`;
      }
      if (compressedContext.context_restoration.conversation_tone) {
        prompt += `### 对话语调
${compressedContext.context_restoration.conversation_tone}
`;
      }
    }
    
    // 接收方使用要求
    if (compressedContext.receiver_instructions) {
      if (compressedContext.receiver_instructions.mandatory_reply) {
        prompt += `### 必须回复
${compressedContext.receiver_instructions.mandatory_reply}
`;
      }
      if (compressedContext.receiver_instructions.forbidden_actions) {
        prompt += `### 禁止行为
${compressedContext.receiver_instructions.forbidden_actions}
`;
      }
    }
    
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
 * 获取指定资产的特定状态内容 - 支持可选字段
 */
export function getAssetStateContent(
  specsData: SpecsFile,
  assetId: string,
  stateId: string
): string | null {
  // 安全检查assets结构
  const files = specsData.assets?.files;
  if (!files) return null;

  // 查找对应的资产
  for (const fileAsset of Object.values(files)) {
    if (fileAsset?.asset_id === assetId && fileAsset?.state_chain) {
      // 查找对应的状态
      const state = fileAsset.state_chain.find((s) => s?.state_id === stateId);
      if (state) {
        return state.content || state.patch || null;
      }
    }
  }

  return null;
}

/**
 * 宽松验证.specs文件结构 - 支持可选字段
 */
export function validateSpecsFile(specsData: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本类型检查
  if (!specsData || typeof specsData !== 'object') {
    errors.push("specs数据必须是有效的对象");
    return { isValid: false, errors, warnings };
  }

  // 推荐但不强制的字段检查
  if (!specsData.metadata) {
    warnings.push("建议包含metadata字段");
  } else {
    if (!specsData.metadata.name) {
      warnings.push("建议在metadata中包含name字段");
    }
    if (!specsData.metadata.task_type) {
      warnings.push("建议在metadata中包含task_type字段");
    }
  }

  // 检查assets结构（如果存在）
  if (specsData.assets?.files) {
    if (typeof specsData.assets.files !== 'object') {
      errors.push("assets.files必须是对象");
    } else {
      Object.entries(specsData.assets.files).forEach(
        ([filePath, fileAsset]: [string, any]) => {
          if (fileAsset && typeof fileAsset === 'object') {
            if (fileAsset.state_chain && !Array.isArray(fileAsset.state_chain)) {
              errors.push(`文件${filePath}的state_chain必须是数组`);
            }
          }
        }
      );
    }
  }

  // 检查history结构（如果存在）
  if (specsData.history && !Array.isArray(specsData.history)) {
    errors.push("history字段必须是数组");
  }

  // 检查examples结构（如果存在）
  if (specsData.examples && !Array.isArray(specsData.examples)) {
    errors.push("examples字段必须是数组");
  }

  // 检查instructions结构（如果存在）
  if (specsData.instructions && typeof specsData.instructions !== 'object') {
    errors.push("instructions字段必须是对象");
  }

  // 检查compressed_context结构（如果存在）
  if (specsData.compressed_context && typeof specsData.compressed_context !== 'object') {
    errors.push("compressed_context字段必须是对象");
  } else if (specsData.compressed_context) {
    // 检查compressed_context的可选子字段
    const cc = specsData.compressed_context;
    
    if (cc.metadata && typeof cc.metadata !== 'object') {
      errors.push("compressed_context.metadata必须是对象");
    }
    
    if (cc.context_summary && typeof cc.context_summary !== 'object') {
      errors.push("compressed_context.context_summary必须是对象");
    }
    
    if (cc.key_entities && typeof cc.key_entities !== 'object') {
      errors.push("compressed_context.key_entities必须是对象");
    } else if (cc.key_entities) {
      // 检查key_entities的数组字段
      const arrayFields = ['people', 'concepts', 'objects', 'locations', 'time_references'];
      arrayFields.forEach(field => {
        if (cc.key_entities[field] && !Array.isArray(cc.key_entities[field])) {
          errors.push(`compressed_context.key_entities.${field}必须是数组`);
        }
      });
    }
    
    if (cc.user_profile && typeof cc.user_profile !== 'object') {
      errors.push("compressed_context.user_profile必须是对象");
    }
    
    if (cc.decisions_made && !Array.isArray(cc.decisions_made)) {
      errors.push("compressed_context.decisions_made必须是数组");
    }
    
    if (cc.pending_issues && !Array.isArray(cc.pending_issues)) {
      errors.push("compressed_context.pending_issues必须是数组");
    }
    
    if (cc.conversation_flow && !Array.isArray(cc.conversation_flow)) {
      errors.push("compressed_context.conversation_flow必须是数组");
    }
    
    if (cc.context_restoration && typeof cc.context_restoration !== 'object') {
      errors.push("compressed_context.context_restoration必须是对象");
    }
    
    if (cc.receiver_instructions && typeof cc.receiver_instructions !== 'object') {
      errors.push("compressed_context.receiver_instructions必须是对象");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 安全获取specs文件中的值，提供默认值
 */
export function safeGetSpecsValue<T>(
  specsData: SpecsFile | undefined,
  path: string,
  defaultValue: T
): T {
  if (!specsData) return defaultValue;
  
  const keys = path.split('.');
  let current: any = specsData;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current !== undefined && current !== null ? current : defaultValue;
}

/**
 * 合并specs文件，用于更新现有文件 - 支持所有可选字段
 */
export function mergeSpecsFiles(base: SpecsFile, updates: Partial<SpecsFile>): SpecsFile {
  const merged: SpecsFile = { ...base };

  // 合并version
  if (updates.version) {
    merged.version = updates.version;
  }

  // 合并metadata - 深度合并所有可选字段
  if (updates.metadata) {
    merged.metadata = { ...base.metadata, ...updates.metadata };
  }

  // 合并instructions - 深度合并所有可选字段
  if (updates.instructions) {
    merged.instructions = { ...base.instructions, ...updates.instructions };
  }

  // 合并assets - 保持文件的完整性
  if (updates.assets) {
    merged.assets = {
      ...base.assets,
      ...updates.assets,
    };
    
    // 特别处理files字段的合并
    if (updates.assets.files) {
      merged.assets.files = { ...base.assets?.files, ...updates.assets.files };
    }
  }

  // 合并所有其他可选字段
  if (updates.examples) merged.examples = updates.examples;
  if (updates.history) merged.history = updates.history;
  
  // 深度合并compressed_context的各个可选子字段
  if (updates.compressed_context) {
    merged.compressed_context = {
      ...base.compressed_context,
      ...updates.compressed_context,
    };
    
    // 特别处理嵌套对象的合并
    if (updates.compressed_context.metadata) {
      merged.compressed_context.metadata = {
        ...base.compressed_context?.metadata,
        ...updates.compressed_context.metadata,
      };
    }
    
    if (updates.compressed_context.context_summary) {
      merged.compressed_context.context_summary = {
        ...base.compressed_context?.context_summary,
        ...updates.compressed_context.context_summary,
      };
    }
    
    if (updates.compressed_context.key_entities) {
      merged.compressed_context.key_entities = {
        ...base.compressed_context?.key_entities,
        ...updates.compressed_context.key_entities,
      };
    }
    
    if (updates.compressed_context.user_profile) {
      merged.compressed_context.user_profile = {
        ...base.compressed_context?.user_profile,
        ...updates.compressed_context.user_profile,
      };
    }
    
    if (updates.compressed_context.context_restoration) {
      merged.compressed_context.context_restoration = {
        ...base.compressed_context?.context_restoration,
        ...updates.compressed_context.context_restoration,
      };
    }
    
    if (updates.compressed_context.receiver_instructions) {
      merged.compressed_context.receiver_instructions = {
        ...base.compressed_context?.receiver_instructions,
        ...updates.compressed_context.receiver_instructions,
      };
    }
  }
  
  if (updates.raw_api_response) merged.raw_api_response = updates.raw_api_response;

  return merged;
}