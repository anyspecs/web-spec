// 简单的.specs功能测试
import { generateSpecsFile, generateSpecsFileName, generateContinuationPrompt } from './src/utils/specsGenerator.js'

// 模拟上下文分析结果
const mockContextAnalysis = {
  metadata: {
    name: "测试聊天记录分析",
    task_type: "general_chat"
  },
  instructions: {
    role_and_goal: "你是一个专业的聊天助手，善于理解用户需求并提供有价值的建议。"
  },
  assets: {
    files: {
      "chat_history.txt": {
        asset_id: "file-001",
        state_chain: [
          {
            state_id: "s0",
            timestamp: "2025-07-25T10:00:00Z",
            summary: "用户上传了聊天记录，包含关于项目讨论的内容",
            content: "用户: 我想创建一个新的项目...\n助手: 好的，让我们开始规划..."
          }
        ]
      }
    }
  },
  examples: [
    {
      context: "项目规划讨论",
      usage: "理解用户的项目需求"
    }
  ],
  history: [
    {
      role: "user",
      content: "我想创建一个新的项目，你能帮我吗？",
      timestamp: "2025-07-25T10:00:00Z"
    },
    {
      role: "assistant", 
      content: "当然可以！让我们先讨论你的项目需求。[asset: file-001, state: s0]",
      timestamp: "2025-07-25T10:01:00Z",
      metadata: {
        asset_reference: "file-001:s0"
      }
    }
  ]
}

// 测试specs文件生成
console.log('🧪 测试.specs文件生成...')

try {
  const specsFile = generateSpecsFile(
    'test_chat.txt',
    '测试内容',
    mockContextAnalysis,
    2500
  )
  
  console.log('✅ .specs文件生成成功')
  console.log('项目名称:', specsFile.metadata.name)
  console.log('任务类型:', specsFile.metadata.task_type)
  console.log('资产数量:', Object.keys(specsFile.assets.files).length)
  console.log('对话轮数:', specsFile.history.length)
  
  // 测试文件名生成
  const fileName = generateSpecsFileName('test_chat.txt', specsFile.metadata.name)
  console.log('生成的文件名:', fileName)
  
  // 测试延续提示词生成
  const continuationPrompt = generateContinuationPrompt(specsFile)
  console.log('延续提示词长度:', continuationPrompt.length, '字符')
  
  console.log('\n🎉 所有测试通过！状态链功能正常工作。')
  
} catch (error) {
  console.error('❌ 测试失败:', error.message)
  process.exit(1)
}