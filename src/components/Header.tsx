import React from 'react'
import { FileText, Upload, Plus, User as UserIcon, Search, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { User } from '@/types/user'

interface HeaderProps {
  onNewContext: () => void
  isDarkMode: boolean
  onToggleTheme: () => void
  user?: User | null
  onLogout?: () => void
}

export function Header({ onNewContext, isDarkMode, onToggleTheme, user, onLogout }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="header flex sticky items-center w-full px-6 top-0 z-10">
      <div className="flex items-center">
        <div 
          className="flex justify-center items-center w-8 h-8 mr-3 rounded-md cursor-pointer"
          style={{ backgroundColor: 'rgba(33, 37, 40, 1)' }}
          onClick={() => navigate('/')}
        >
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h1 
          className="mr-6 text-xl font-medium cursor-pointer"
          style={{ color: 'rgba(7, 11, 17, 1)' }}
          onClick={() => navigate('/')}
        >
          上下文管理
        </h1>
      </div>
      
      <div className="grow max-w-md mx-4">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索所有上下文文件..."
            className="input w-full h-10 pr-10 pl-4"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Search className="w-4 h-4" style={{ color: 'rgba(136, 138, 139, 1)' }} />
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <button
          onClick={() => navigate('/chat')}
          className="btn btn-secondary btn-sm mr-3"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          AI对话
        </button>
        
        <button
          onClick={() => navigate('/processor')}
          className="btn btn-secondary btn-sm mr-3"
        >
          <Upload className="w-4 h-4 mr-2" />
          上传
        </button>
        
        <button
          onClick={onNewContext}
          className="btn btn-primary btn-sm mr-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建上下文
        </button>
        
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
            
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
              >
                退出登录
              </button>
            )}
          </div>
        ) : (
          <div 
            className="flex justify-center items-center w-10 h-10 rounded-full"
            style={{ backgroundColor: 'rgba(244, 246, 248, 1)' }}
          >
            <UserIcon className="w-5 h-5" style={{ color: 'rgba(136, 138, 139, 1)' }} />
          </div>
        )}
      </div>
    </header>
  )
} 