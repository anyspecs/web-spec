import React, { useState } from 'react'
import { ChevronDown, Settings, Zap, DollarSign, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { AIModel, ChatConfig } from '@/types/chat'

interface ModelSelectorProps {
  models: AIModel[]
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  config: ChatConfig
  onConfigChange: (config: ChatConfig) => void
}

// Mock AI models data
const mockModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: '最强大的语言模型，适合复杂任务',
    maxTokens: 8192,
    supportedFeatures: ['text', 'code', 'analysis'],
    pricing: { inputTokens: 0.03, outputTokens: 0.06 },
    isAvailable: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: '快速且经济的模型，适合日常对话',
    maxTokens: 4096,
    supportedFeatures: ['text', 'code'],
    pricing: { inputTokens: 0.001, outputTokens: 0.002 },
    isAvailable: true
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: '强大的推理能力，适合分析和创作',
    maxTokens: 200000,
    supportedFeatures: ['text', 'analysis', 'reasoning'],
    pricing: { inputTokens: 0.015, outputTokens: 0.075 },
    isAvailable: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: '平衡性能和成本的优秀选择',
    maxTokens: 200000,
    supportedFeatures: ['text', 'analysis'],
    pricing: { inputTokens: 0.003, outputTokens: 0.015 },
    isAvailable: true
  }
]

export function ModelSelector({ 
  models = mockModels, 
  selectedModel, 
  onModelChange, 
  config, 
  onConfigChange 
}: ModelSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const handleConfigChange = (key: keyof ChatConfig, value: number) => {
    onConfigChange({
      ...config,
      [key]: value
    })
  }

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
            >
              {selectedModel.provider.charAt(0)}
            </div>
            <div className="text-left">
              <div className="font-medium text-sm">{selectedModel.name}</div>
              <div className="text-xs text-gray-500">{selectedModel.provider}</div>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isDropdownOpen && "rotate-180"
          )} />
        </button>

        {isDropdownOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
            style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
          >
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model)
                  setIsDropdownOpen(false)
                }}
                className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
                    >
                      {model.provider.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-500 mb-1">{model.provider}</div>
                      <div className="text-xs text-gray-400 line-clamp-2">{model.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {model.pricing && (
                      <div className="text-xs text-gray-400 flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        ${model.pricing.inputTokens}/1K
                      </div>
                    )}
                    {selectedModel.id === model.id && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model Configuration */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">模型参数</span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isConfigOpen && "rotate-180"
          )} />
        </button>

        {isConfigOpen && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Temperature */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">温度 (Temperature)</label>
                <span className="text-sm text-gray-500">{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>精确</span>
                <span>创造性</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">最大令牌数</label>
                <span className="text-sm text-gray-500">{config.maxTokens}</span>
              </div>
              <input
                type="range"
                min="100"
                max={selectedModel.maxTokens}
                step="100"
                value={config.maxTokens}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Top P */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Top P</label>
                <span className="text-sm text-gray-500">{config.topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.topP}
                onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Model Info */}
      <div 
        className="p-3 rounded-lg text-sm"
        style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
      >
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4" />
          <span className="font-medium">模型信息</span>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>最大令牌数: {selectedModel.maxTokens.toLocaleString()}</div>
          <div>支持功能: {selectedModel.supportedFeatures.join(', ')}</div>
          {selectedModel.pricing && (
            <div>
              定价: 输入${selectedModel.pricing.inputTokens}/1K · 输出${selectedModel.pricing.outputTokens}/1K
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 