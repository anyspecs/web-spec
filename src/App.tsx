import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ContextList } from '@/pages/ContextList'
import { Chat } from '@/pages/Chat'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ContextList />} />
      <Route path="/contexts" element={<ContextList />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  )
}

export default App 