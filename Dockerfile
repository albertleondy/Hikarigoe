FROM node:18-bullseye-slim

# Install runtime dependencies for yt-dlp
# yt-dlp requires python3. ffmpeg is needed for media processing.
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Create temp directory for downloads
RUN mkdir -p temp_downloads

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
