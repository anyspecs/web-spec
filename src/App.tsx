import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ContextList } from '@/pages/ContextList'
import { ContextProcessor } from '@/pages/ContextProcessor'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { authService } from '@/utils/authService'
import type { User } from '@/types/user'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 检查本地存储中的用户信息和令牌
        const savedUser = authService.getStoredUser()
        const token = localStorage.getItem('authToken')
        
        if (savedUser && token) {
          // 验证令牌是否仍然有效
          const validUser = await authService.validateToken(token)
          if (validUser) {
            setUser(validUser)
          } else {
            // 令牌无效，清除本地存储
            authService.logout()
          }
        }
      } catch (error) {
        console.error('认证初始化失败:', error)
        // 清除可能损坏的认证数据
        authService.logout()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      setUser(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      
      {/* OAuth回调路由 */}
      <Route path="/auth/google/callback" element={<AuthCallback onLogin={handleLogin} />} />
      <Route path="/auth/microsoft/callback" element={<AuthCallback onLogin={handleLogin} />} />
      <Route path="/auth/github/callback" element={<AuthCallback onLogin={handleLogin} />} />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute isAuthenticated={!!user}>
            <ContextList user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/contexts" 
        element={
          <ProtectedRoute isAuthenticated={!!user}>
            <ContextList user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/processor" 
        element={
          <ProtectedRoute isAuthenticated={!!user}>
            <ContextProcessor user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App 