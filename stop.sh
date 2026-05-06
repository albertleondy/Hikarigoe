#!/bin/bash
echo "🛑 Stopping Hikarigoe processes..."

# Kill processes by port
if command -v fuser > /dev/null; then
  fuser -k 3001/tcp 2>/dev/null
  fuser -k 5173/tcp 2>/dev/null
else
  # Fallback to lsof
  lsof -ti:3001,5173 | xargs kill -9 2>/dev/null
fi

echo "✅ All processes stopped."
