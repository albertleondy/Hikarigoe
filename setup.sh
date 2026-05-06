#!/bin/bash

# Get the absolute path of the current directory
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

# 1. Create start.sh
cat << 'EOF' > start.sh
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
EOF

chmod +x start.sh

# 2. Create stop.sh
cat << 'EOF' > stop.sh
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
EOF

chmod +x stop.sh

# 3. Create Desktop Shortcut
DESKTOP_FILE="$HOME/.local/share/applications/hikarigoe.desktop"
cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=Hikarigoe
Comment=Lyric Fetcher & Music Tool
Exec=$APP_DIR/start.sh
Icon=$APP_DIR/client/public/vite.svg
Terminal=true
Type=Application
Categories=Music;Audio;
EOF

# Also create one on the Desktop if it exists
if [ -d "$HOME/Desktop" ]; then
    cp "$DESKTOP_FILE" "$HOME/Desktop/Hikarigoe.desktop"
    chmod +x "$HOME/Desktop/Hikarigoe.desktop"
    # Mark as trusted (GNOME specific, might not work on all versions but helpful)
    gio set "$HOME/Desktop/Hikarigoe.desktop" metadata::trusted true 2>/dev/null
fi

echo "--------------------------------------------------"
echo "✨ Setup Complete!"
echo "🚀 You can now start the app by:"
echo "   1. Double-clicking 'Hikarigoe' on your Desktop"
echo "   2. Finding 'Hikarigoe' in your Application Menu"
echo "   3. Running ./start.sh in this folder"
echo ""
echo "🛑 To stop everything manually, run ./stop.sh"
echo "--------------------------------------------------"
