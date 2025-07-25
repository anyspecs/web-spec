import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '@/utils/authService'
import type { User } from '@/types/user'

interface AuthCallbackProps {
  onLogin: (user: User) => void
}

export function AuthCallback({ onLogin }: AuthCallbackProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          throw new Error(errorDescription || `认证错误: ${error}`)
        }

        if (!code) {
          throw new Error('未收到授权码')
        }

        // 从路径中获取提供商信息
        const pathParts = window.location.pathname.split('/')
        const provider = pathParts[pathParts.indexOf('auth') + 1]

        if (!provider || !['google', 'microsoft', 'github'].includes(provider)) {
          throw new Error('无效的认证提供商')
        }

        // 处理OAuth回调
        console.log('开始处理OAuth回调，提供商:', provider, '授权码:', code.substring(0, 20) + '...')
        const result = await authService.handleCallback(provider, code)
        console.log('OAuth回调成功，用户:', result.user, '令牌长度:', result.token?.length)
        
        // 存储认证信息
        authService.storeAuth(result.user, result.token)
        console.log('认证信息已存储到localStorage')

        // 登录成功
        onLogin(result.user)
        navigate('/')

      } catch (err) {
        console.error('认证回调处理失败:', err)
        setError(err instanceof Error ? err.message : '认证失败')
      } finally {
        setIsLoading(false)
      }
    }

    processCallback()
  }, [searchParams, navigate, onLogin])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在处理登录...</h2>
          <p className="text-gray-600">请稍候，我们正在验证您的身份</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">登录失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回登录页
          </button>
        </div>
      </div>
    )
  }

  return null
}