// 提示词配置 - 支持可选字段的.specs文件格式
export const PROMPTS = {
  // 系统提示词
  SYSTEM:
    "你是一个专业的上下文工程师，擅长将聊天记录转换为结构化的.specs格式。请严格按照要求输出纯净的JSON格式，不要包含任何其他文本。所有字段都是可选的，根据实际内容决定是否包含。",

  // 状态链分析提示词 - 灵活的可选字段版本
  CONTEXT_ANALYSIS: (fileName: string) => `# 聊天记录智能分析器

## 任务目标
将聊天记录转换为结构化的.specs格式，确保在新对话中导入后能完美还原上下文，实现无缝对话延续。

## 重要说明
- **所有字段都是可选的**，只包含有实际内容的字段
- 根据聊天记录的内容和类型，灵活选择包含的字段组合
- 不要强制包含空的或无意义的字段

## .specs文件结构（所有字段可选）

### 基础结构
\`\`\`json
{
  "version": "1.0",  // 可选，默认1.0
  "metadata": {      // 推荐包含
    "name": "聊天主题名称",
    "task_type": "chat_compression|general_chat|document_analysis|code_project",
    "createdAt": "ISO时间戳",
    "source_file": "原始文件名",
    "source_platform": "来源平台",
    "analysis_model": "使用的AI模型"
  },
  "instructions": {  // 如有AI角色定位则包含
    "role_and_goal": "AI应扮演的角色和目标",
    "context": "上下文说明",
    "key_topics": ["关键主题列表"]
  },
  "assets": {        // 如有文件资产则包含
    "files": {
      "文件路径": {
        "asset_id": "唯一ID",
        "state_chain": [
          {
            "state_id": "s0",
            "timestamp": "时间戳",
            "summary": "变更说明",
            "content": "文件内容"
          }
        ]
      }
    }
  },
  ],
 "examples": [       // 如需保留对话历史则包含
    {
      "role": "user|assistant|system",
      "content": "消息内容",
      "timestamp": "时间戳",
      "metadata": {
        "asset_reference": "资产引用"
      }
    }
  ],
  "compressed_context": { 
    "context_summary": {
      "main_topic": "主要话题",
      "current_task": "当前任务",
      "user_intent": "用户意图",
      "conversation_stage": "对话阶段"
    },
    "key_entities": {
      "people": ["人物列表"],
      "concepts": ["概念列表"],
      "objects": ["对象列表"],
      "locations": ["地点列表"],
      "time_references": ["时间引用"]
    },
    "user_profile": {
      "expertise_level": "专业水平",
      "communication_style": "沟通风格",
      "preferences": ["偏好列表"],
      "constraints": ["限制条件"]
    },
    "decisions_made": [
      {
        "decision": "决策内容",
        "reasoning": "决策理由",
        "status": "执行状态"
      }
    ],
    "pending_issues": [
      {
        "issue": "问题描述",
        "context": "问题背景",
        "priority": "优先级"
      }
    ],
    "resources_used": {
      "tools": ["工具列表"],
      "files": ["文件列表"],
      "external_refs": ["外部引用"]
    },
    "conversation_flow": [
      {
        "stage": "阶段名称",
        "key_exchange": "关键对话",
        "outcome": "阶段结果"
      }
    ],
    "context_restoration": {
      "role_continuation": "角色延续",
      "conversation_tone": "对话语调",
      "knowledge_assumptions": "知识假设",
      "next_expected_action": "预期行动"
    },
    "receiver_instructions": {
      "context_understanding": "理解要求",
      "response_requirements": ["回应要求列表"],
      "mandatory_reply": "必须回复内容",
      "forbidden_actions": "禁止行为"
    }
  },
  
}
\`\`\`

## 处理策略

### 1. 判断任务类型
- **chat_compression**: 聊天记录压缩，重点使用 compressed_context
- **code_project**: 代码项目，重点使用 assets.files 和 history
- **document_analysis**: 文档分析，重点使用基础metadata和简单结构
- **general_chat**: 一般聊天，使用最小结构

### 2. 字段选择原则
- 有内容才包含，没有内容直接省略
- compressed_context 仅用于 chat_compression 类型
- assets 仅在有具体文件或代码时包含
- history 根据是否需要保留完整对话决定
- examples 仅在有示例内容时包含

### 3. 质量要求
- 保真度优先：确保核心信息不丢失
- 结构清晰：保持逻辑关系和因果链条
- 上下文连贯：维护对话的自然流畅性
- 个性化保持：保留用户的独特需求和偏好

## 处理指令
请分析以下聊天记录并生成合适的.specs文件：
1. 首先判断内容类型和复杂度
2. 选择合适的task_type
3. 根据内容决定包含哪些字段组合
4. 确保输出的JSON格式正确且完整

文件：${fileName}`,

  // 简化版状态链分析（适用于简单内容）
  SIMPLE_ANALYSIS: (fileName: string) => `请将以下内容转换为.specs格式。

要求：
- 输出纯JSON格式
- 所有字段可选，根据内容决定包含哪些
- 至少包含 metadata.name 和 metadata.task_type
- 选择合适的task_type: general_chat, document_analysis, code_project, chat_compression

文件：${fileName}`,
};
