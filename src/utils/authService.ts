import type { User } from '@/types/user'

export interface AuthConfig {
  google: {
    clientId: string
    redirectUri: string
  }
  microsoft: {
    clientId: string
    redirectUri: string
  }
  github: {
    clientId: string
    redirectUri: string
  }
}

export class AuthService {
  private config: AuthConfig

  constructor() {
    this.config = {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/google/callback`
      },
      microsoft: {
        clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/microsoft/callback`
      },
      github: {
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/github/callback`
      }
    }
  }

  // Google SSO 登录
  async loginWithGoogle(): Promise<void> {
    if (!this.config.google.clientId) {
      throw new Error('Google Client ID 未配置')
    }

    try {
      // 从后端获取授权URL
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/google/url`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('获取授权URL失败')
      }

      const data = await response.json()
      
      // 存储state用于后续验证
      sessionStorage.setItem('oauth_state', data.state)
      
      // 重定向到Google授权页面
      window.location.href = data.auth_url
      
    } catch (error) {
      throw new Error(`Google登录失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // Microsoft SSO 登录
  async loginWithMicrosoft(): Promise<void> {
    if (!this.config.microsoft.clientId) {
      throw new Error('Microsoft Client ID 未配置')
    }

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${this.config.microsoft.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.config.microsoft.redirectUri)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `response_mode=query`

    window.location.href = authUrl
  }

  // GitHub SSO 登录
  async loginWithGitHub(): Promise<void> {
    if (!this.config.github.clientId) {
      throw new Error('GitHub Client ID 未配置')
    }

    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${this.config.github.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.config.github.redirectUri)}&` +
      `scope=user:email`

    window.location.href = authUrl
  }

  // 处理OAuth回调
  async handleCallback(provider: string, code: string): Promise<{ user: User, token: string }> {
    try {
      const state = sessionStorage.getItem('oauth_state')
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          code,
          state 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `${provider} 认证失败`)
      }
      
      const data = await response.json()
      
      if (!data.success || !data.user || !data.token) {
        throw new Error('认证响应数据无效')
      }
      
      // 清除临时state
      sessionStorage.removeItem('oauth_state')
      
      return {
        user: data.user,
        token: data.token
      }
      
    } catch (error) {
      // 清除临时state
      sessionStorage.removeItem('oauth_state')
      throw new Error(`${provider} 认证处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 验证用户令牌
  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.user
    } catch (error) {
      console.error('Token验证失败:', error)
      return null
    }
  }

  // 登出
  async logout(): Promise<void> {
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (error) {
        console.error('登出请求失败:', error)
      }
    }
    
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  // 获取存储的用户信息
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch (error) {
      console.error('解析用户信息失败:', error)
      localStorage.removeItem('user')
      return null
    }
  }

  // 存储用户信息和令牌
  storeAuth(user: User, token: string): void {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('authToken', token)
  }
}

// 导出单例实例
export const authService = new AuthService()