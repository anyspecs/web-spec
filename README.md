# Web-Spec

A modern web application for managing and sharing context files with a clean, GitHub-inspired interface.

## Features

- **Clean Design**: GitHub-inspired design language with clear interface
- **File Upload**: Support for drag-and-drop upload of .specs files
- **File Download**: One-click download of .specs files
- **Smart Search**: Search by filename and description
- **Sorting**: Sort by update time, filename, and size
- **File Management**: View, download, delete, and share functionality
- **Content Preview**: Click cards to view complete context content
- **Online Editing**: Edit system prompts and conversation history directly in the interface
- **Theme Switching**: Support for light/dark mode switching

## Main Pages

### 1. Homepage (Context List Page)
- Display all .specs files (card format)
- Support for search and sorting
- File operations: view, download, delete, share

### 2. Upload Modal
- Drag and drop or click to upload .specs files
- Support for multiple file uploads
- File status display

### 3. Context Viewer
- **Preview Mode**: View complete context content
- **Edit Mode**: Online editing of system prompts and conversation history
- **Collapsible Areas**: System Prompt, conversation history, attachment list
- **Real-time Save**: Save directly to list after editing

## Tech Stack

- **React 18** - User interface framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool
- **React Router** - Route management
- **Lucide React** - Icon library

## Quick Start

### Install Dependencies
```bash
cd frontend
npm install
```

### Development Mode
```bash
npm run dev
```

The application will start at `http://localhost:3000`.

### Build Production Version
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Components
│   │   ├── Header.tsx      # Page header
│   │   ├── UploadModal.tsx # Upload modal
│   │   ├── ContextCard.tsx # File card
│   │   └── ContextViewer.tsx # Context viewer
│   ├── pages/              # Pages
│   │   └── ContextList.tsx # File list page
│   ├── types/              # Type definitions
│   │   └── context.ts      # Context file types
│   ├── utils/              # Utility functions
│   │   └── cn.ts           # CSS class name merging
│   ├── styles/             # Style files
│   │   └── index.css       # Global styles
│   ├── App.tsx             # Main application
│   └── main.tsx            # Application entry
├── package.json            # Project configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## Data Structure

```typescript
interface ContextFile {
  id: string
  name: string
  description: string
  updated_at: string
  size: string
  system_prompt?: string
  conversation?: Message[]
  assets?: Asset[]
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface Asset {
  id: string
  name: string
  type: string
  size: string
  url?: string
}
```

## Usage Guide

### View Context Content
1. Click the "View" button on any card in the file list
2. Browse the complete content in the popup viewer
3. Expand/collapse different content areas

### Edit Context Content
1. Click the "Edit" button in the viewer
2. Modify system prompts, descriptions, or conversation history
3. Click the "Save" button to apply changes

### Manage Conversation History
- Add new messages in edit mode
- Delete unwanted messages
- Support for modifying message content

## Design Features

- **GitHub Style**: Clean card design and layout
- **Responsive**: Support for desktop and mobile devices
- **User-friendly**: Clear buttons and status feedback
- **Performance Optimized**: Fast search and sorting
- **Collapsible Interface**: Space-saving, improved browsing efficiency 