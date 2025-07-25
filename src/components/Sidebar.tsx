import React from 'react'
import { List, User, SortAsc, Calendar, Scale } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SidebarProps {
  selectedCategory: string
  selectedSort: string
  onCategoryChange: (category: string) => void
  onSortChange: (sort: string) => void
}

export function Sidebar({ selectedCategory, selectedSort, onCategoryChange, onSortChange }: SidebarProps) {
  const categories = [
    { id: 'all', label: '所有上下文', icon: List },
    { id: 'my', label: '我的上下文', icon: User }
  ]

  const sortOptions = [
    { id: 'name', label: '文件名', icon: SortAsc },
    { id: 'updated', label: '更新时间', icon: Calendar },
    { id: 'size', label: '文件大小', icon: Scale }
  ]

  return (
    <aside 
      className="shrink-0 w-64 pt-6 pr-6 pb-6 pl-6"
      style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
    >
      <h2 className="mb-6 text-base font-medium">过滤器</h2>
      
      <div className="mb-8">
        <h3 
          className="mb-3 text-sm"
          style={{ color: 'rgba(136, 138, 139, 1)' }}
        >
          类别
        </h3>
        <ul>
          {categories.map((category, index) => {
            const Icon = category.icon
            const isActive = selectedCategory === category.id
            
            return (
              <li key={category.id} className={index < categories.length - 1 ? 'mb-3' : ''}>
                <button
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "flex items-center text-sm w-full text-left",
                    isActive 
                      ? "font-medium" 
                      : "hover:text-gray-900"
                  )}
                  style={{ 
                    color: isActive 
                      ? 'rgba(33, 37, 40, 1)' 
                      : 'rgba(136, 138, 139, 1)' 
                  }}
                >
                  <Icon className="text-center w-5 mr-3" />
                  <span>{category.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      
      <div>
        <h3 
          className="mb-3 text-sm"
          style={{ color: 'rgba(136, 138, 139, 1)' }}
        >
          排序方式
        </h3>
        <ul>
          {sortOptions.map((option, index) => {
            const Icon = option.icon
            const isActive = selectedSort === option.id
            
            return (
              <li key={option.id} className={index < sortOptions.length - 1 ? 'mb-3' : ''}>
                <button
                  onClick={() => onSortChange(option.id)}
                  className={cn(
                    "flex items-center text-sm w-full text-left",
                    isActive 
                      ? "font-medium" 
                      : "hover:text-gray-900"
                  )}
                  style={{ 
                    color: isActive 
                      ? 'rgba(33, 37, 40, 1)' 
                      : 'rgba(136, 138, 139, 1)' 
                  }}
                >
                  <Icon className="text-center w-5 mr-3" />
                  <span>{option.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
} 