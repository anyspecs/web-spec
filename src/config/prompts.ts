// 提示词配置
export const PROMPTS = {
  // 系统提示词
  SYSTEM:
    "你是一个专业的上下文工程师，擅长将聊天记录转换为结构化的.ct格式。请严格按照要求输出纯净的JSON格式，不要包含任何其他文本。",

  // 状态链分析提示词
  CONTEXT_ANALYSIS: (fileName: string) => `# 聊天记录智能压缩器

## 任务目标
将长串聊天记录压缩为结构化格式，确保在新对话中导入后能完美还原上下文，实现无缝对话延续。

## 压缩输出格式

### 1. 元数据层
metadata:
  original_length: [原始消息数量]
  compression_time: [压缩时间戳]
  context_version: "v1.0"
  priority_level: [高/中/低]

2. 核心上下文摘要
context_summary:
  main_topic: "[主要讨论话题]"
  current_task: "[当前进行的任务]"
  user_intent: "[用户最终意图]"
  conversation_stage: "[对话阶段：开始/进行中/接近完成]"

3. 关键实体和概念
key_entities:
  people: [涉及的人物]
  concepts: [重要概念]
  objects: [关键对象/产品/项目]
  locations: [地点信息]
  time_references: [时间节点]

4. 用户画像快照
user_profile:
  expertise_level: "[专业水平：新手/中级/专家]"
  communication_style: "[沟通风格：正式/随意/技术性]"
  preferences: [用户偏好列表]
  constraints: [用户限制条件]

5. 决策和结论记录
decisions_made:
  - decision: "[具体决策]"
    reasoning: "[决策理由]"
    status: "[执行状态]"

6. 待解决问题
pending_issues:
  - issue: "[问题描述]"
    context: "[问题背景]"
    priority: "[优先级]"

7. 工具和资源使用
resources_used:
  tools: [使用的工具]
  files: [涉及的文件]
  external_refs: [外部引用]

8. 对话流程关键节点
conversation_flow:
  - stage: "[阶段名称]"
    key_exchange: "[关键对话内容]"
    outcome: "[阶段结果]"

9. 上下文恢复指令
context_restoration:
  role_continuation: "[AI应扮演的角色状态]"
  conversation_tone: "[对话语调]"
  knowledge_assumptions: "[可假设用户已知的信息]"
  next_expected_action: "[预期的下一步行动]"

10.接收方使用要求
receiver_instructions:
  context_understanding: "基于以上记忆文件完全理解历史对话上下文和当前状态"
  response_requirements:
    - "根据记忆文件信息准确回应用户后续问题"
    - "保持与原对话相同的专业水准和个性化程度"
    - "利用已建立的共识、决策和偏好来回应"
    - "优先处理待解决问题列表中的高优先级事项"
  mandatory_reply: "收到此上下文记忆文件后，必须且仅回复：'请继续提问'"
  forbidden_actions: "不要返回其他任何内容或解释"
压缩规则
1. 保真度优先: 确保核心信息不丢失
2. 语义完整: 保持逻辑关系和因果链条
3. 上下文连贯: 维护对话的自然流畅性
4. 个性化保持: 保留用户的独特需求和偏好
5. 任务状态清晰: 明确当前进度和下一步行动
处理指令
请按以上格式分析并压缩提供的聊天记录，重点关注：
- 识别对话的核心主线
- 提取用户的真实需求和偏好
- 记录重要的决策点和转折点
- 保留影响后续对话的关键信息
- 预测用户可能的下一步问题
现在请开始压缩以下聊天记录：${fileName} `,
};
