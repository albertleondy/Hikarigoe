#!/bin/bash
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

echo "🚀 Starting Hikarigoe (Lyric Fetcher)..."

# Run both backend and frontend in the background
npm run dev:all &
APP_PID=$!

# Wait a few seconds for Vite to start, then open the browser
(
  sleep 5
  if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173
  elif command -v open > /dev/null; then
    open http://localhost:5173
  fi
) &

echo "--------------------------------------------------"
echo "✅ App is running!"
echo "🌍 URL: http://localhost:5173"
echo "🛑 To stop the app, press Ctrl+C or close this window."
echo "--------------------------------------------------"

# Wait for the main process
wait $APP_PID
