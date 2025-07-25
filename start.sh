#!/bin/bash

echo "🚀 Starting ContextHub Frontend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🌐 Starting development server..."
npm run dev 