import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, Shield, Users } from 'lucide-react'

interface LoginProps {
  onLogin: (user: any) => void
}

export function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const ssoProviders = [
    {
      id: 'google',
      name: 'Google SSO',
      icon: '🔍',
      description: '使用 Google 账户登录',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'microsoft',
      name: 'Microsoft SSO',
      icon: '🏢',
      description: '使用 Microsoft 账户登录',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'github',
      name: 'GitHub SSO',
      icon: '📱',
      description: '使用 GitHub 账户登录',
      color: 'bg-gray-800 hover:bg-gray-900'
    }
  ]

  const handleSSOLogin = async (providerId: string) => {
    setIsLoading(true)
    setSelectedProvider(providerId)
    
    try {
      // 检查是否配置了对应的Client ID
      const hasConfig = checkSSOConfig(providerId)
      if (!hasConfig) {
        alert(`${providerId.toUpperCase()} SSO 未配置，请检查环境变量`)
        return
      }

      // 导入认证服务
      const { authService } = await import('@/utils/authService')
      
      // 根据提供商进行SSO登录
      switch (providerId) {
        case 'google':
          await authService.loginWithGoogle()
          break
        case 'microsoft':
          await authService.loginWithMicrosoft()
          break
        case 'github':
          await authService.loginWithGitHub()
          break
        default:
          throw new Error(`不支持的登录方式: ${providerId}`)
      }
      
      // 注意: 实际的用户回调会在OAuth重定向后处理
      // 这里不需要调用onLogin，因为页面会重定向
      
    } catch (error) {
      console.error('SSO登录失败:', error)
      alert(`登录失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
      setSelectedProvider(null)
    }
  }

  const checkSSOConfig = (providerId: string): boolean => {
    switch (providerId) {
      case 'google':
        return !!import.meta.env.VITE_GOOGLE_CLIENT_ID
      case 'microsoft':
        return !!import.meta.env.VITE_MICROSOFT_CLIENT_ID
      case 'github':
        return !!import.meta.env.VITE_GITHUB_CLIENT_ID
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-xl"
              style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
            >
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            web-spec
          </h2>
          <p className="text-gray-600">
            AI上下文文件管理平台
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            平台特性
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              AI智能文档分析和总结
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              多格式文件上传和处理
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
              实时AI对话和交互
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              上下文文件管理和编辑
            </li>
          </ul>
        </div>

        {/* SSO Login Options */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <LogIn className="w-5 h-5 mr-2" />
            选择登录方式
          </h3>
          
          <div className="space-y-3">
            {ssoProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSSOLogin(provider.id)}
                disabled={isLoading}
                className={`
                  w-full flex items-center justify-center px-4 py-3 rounded-lg
                  text-white font-medium transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${provider.color}
                `}
              >
                {isLoading && selectedProvider === provider.id ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    正在登录...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{provider.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm opacity-90">{provider.description}</div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>登录即表示您同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  )
}