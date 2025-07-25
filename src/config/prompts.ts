// 提示词配置
export const PROMPTS = {
  // 系统提示词
  SYSTEM: '你是一个专业的代码和文档分析专家，能够深入理解各种编程语言和文档格式。请提供准确、详细的分析结果，并严格按照要求的JSON格式返回。',
  
  // 状态链分析提示词
  CONTEXT_ANALYSIS: (fileName: string) => `你是专业的对话上下文重构专家。请将聊天记录转换为带有状态链的项目上下文文件。

任务：分析聊天记录，识别其中涉及的文件/资产变化，构建状态链时间线。

返回JSON格式：
{
  "metadata": {
    "name": "从聊天记录提取的项目名称",
    "task_type": "根据内容判断(general_chat/document_analysis/code_project)"
  },
  "instructions": {
    "role_and_goal": "AI助手的角色定位和目标"
  },
  "assets": {
    "files": {
      "文件路径": {
        "asset_id": "file-001", 
        "state_chain": [
          {
            "state_id": "s0",
            "timestamp": "时间戳",
            "summary": "状态变更原因说明",
            "content": "初始内容"
          }
        ]
      }
    }
  },
  "examples": [
    {
      "context": "关键信息点",
      "usage": "使用说明"
    }
  ],
  "history": [
    {
      "role": "user/assistant/system",
      "content": "对话内容，可引用[asset: file-001, state: s0]",
      "timestamp": "时间戳",
      "metadata": {
        "asset_reference": "file-001:s0"
      }
    }
  ]
}

分析要点：
1. 识别聊天中涉及的文件、代码、文档等资产
2. 追踪每个资产的状态变化时间线
3. 将对话与具体的资产状态绑定
4. 提取项目演化的关键节点
5. 保持时间线的连续性和可追溯性

文件信息：
- 原始文件: ${fileName}
- 处理模型: kimi-k2-0711-preview

请分析上传的文件内容并按照上述JSON格式返回结果。`
}