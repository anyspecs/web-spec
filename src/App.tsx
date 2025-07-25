import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ContextList } from '@/pages/ContextList'
import { Chat } from '@/pages/Chat'
import { ContextProcessor } from '@/pages/ContextProcessor'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import type { User } from '@/types/user'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储中的用户信息
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('解析用户信息失败:', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
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
        path="/chat" 
        element={
          <ProtectedRoute isAuthenticated={!!user}>
            <Chat user={user} onLogout={handleLogout} />
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