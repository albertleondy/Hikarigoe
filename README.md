# Hikarigoe (光声) - Romaji Lyric Fetcher

Hikarigoe is a modern web application designed to fetch synced lyrics (`.lrc`) for Japanese songs and automatically convert them to Romaji. It features a beautiful glassmorphism UI, a split-view interface for easy browsing, and robust fallback mechanisms to ensure lyrics are always found.

## Features

-   **Search & Select**: Search for songs across multiple sources (NetEase Cloud Music & Lrclib).
-   **Intelligent Fetching**: Automatically tries NetEase first, falling back to Lrclib if blocked or unavailable.
-   **Romaji Conversion**: Converts Japanese lyrics (Kanji/Kana) to Romaji using `kuroshiro` and `kuromoji`.
-   **Split View UI**: Browse search results on the left while reading lyrics on the right.
-   **Download Support**: Download the generated `.lrc` file with a single click.
-   **Premium Design**: Dark-themed, glassmorphism interface with responsive layout.

## Tech Stack

-   **Backend**: Node.js, Express
-   **Frontend**: React, Vite, Vanilla CSS
-   ** lyric Sources**: `netease-cloud-music-api`, `lrclib.net`
-   **Conversion**: `kuroshiro`, `kuroshiro-analyzer-kuromoji`

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/albertleondy/Hikarigoe.git
    cd Hikarigoe
    ```

2.  **Install Backend Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd client
    npm install
    ```

## Usage

1.  **Start the Backend Server**:
    From the root directory:
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3001`.

2.  **Start the Frontend**:
    From the `client` directory:
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173`.

3.  **Search & Download**:
    -   Enter a song title (e.g., "Idol YOASOBI").
    -   Select usage version from the list on the left.
    -   View the Romaji lyrics on the right.
    -   Click "Download .lrc" to save the file.

## Desktop App (Electron)

Hikarigoe can be run as a standalone desktop application for Linux (AppImage) and Windows (.exe).

### Development Mode
```bash
npm run electron:start
```

### Build Executable
To build the application for your current OS:
```bash
npm run dist
```
-   **Linux**: Output in `dist/Hikarigoe-1.0.0.AppImage`
-   **Windows**: Output in `dist/Hikarigoe Setup 1.0.0.exe`

## API Endpoints

-   `GET /api/search?q={query}`: Search for songs.
-   `GET /api/lyrics?id={id}&source={source}`: Fetch and convert lyrics.

## License

MIT
