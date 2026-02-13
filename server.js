const express = require('express');
const cors = require('cors');
const NeteaseApi = require("netease-cloud-music-api");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const nodePath = require('path');
const fs = require('fs');
const NodeID3 = require('node-id3');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = 3001;




app.use(cors());
app.use(express.json());

const search = NeteaseApi.search;
const lyric = NeteaseApi.lyric;
const kuroshiro = new Kuroshiro();
let kuroshiroInitialized = false;

async function initKuroshiro() {
    if (!kuroshiroInitialized) {
        await kuroshiro.init(new KuromojiAnalyzer());
        kuroshiroInitialized = true;
    }
}

// Initialize on start
initKuroshiro().catch(console.error);

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log(`\n🔍 Searching for: "${query}"...`);

    let results = [];

    // 1. Search Netease
    try {
        const neteaseResult = await search({ keywords: query, type: 1, limit: 5 });
        if (neteaseResult && neteaseResult.body && neteaseResult.body.result?.songs) {
            const neteaseSongs = neteaseResult.body.result.songs.map(song => ({
                id: song.id,
                source: 'NetEase',
                name: song.name,
                artist: song.artists[0].name,
                album: song.album?.name,
                duration: song.duration
            }));
            results = [...results, ...neteaseSongs];
        }
    } catch (error) {
        console.error("⚠️ NetEase Search Error:", error.message);
    }

    // 2. Search Lrclib
    try {
        const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            // Filter out instrumental if possible, or just map all
            const lrclibSongs = data.slice(0, 10).map(song => ({
                id: song.id,
                source: 'Lrclib',
                name: song.name,
                artist: song.artistName,
                album: song.albumName,
                duration: song.duration * 1000 // standardize to ms
            }));
            results = [...results, ...lrclibSongs];
        }
    } catch (error) {
        console.error("⚠️ Lrclib Search Error:", error.message);
    }

    res.json(results);
});

app.get('/api/lyrics', async (req, res) => {
    const { id, source } = req.query;

    if (!id || !source) {
        return res.status(400).json({ error: 'Parameters "id" and "source" are required' });
    }

    console.log(`\n⬇️ Fetching lyrics from ${source} for ID: ${id}`);

    try {
        await initKuroshiro();
        let rawLyrics = "";
        let songName = "";
        let artistName = "";

        if (source === 'NetEase') {
            const lyricResult = await lyric({ id: id });
            rawLyrics = lyricResult.body?.lrc?.lyric;
            // Ideally we should also fetch song details to return name/artist if needed,
            // but for now we rely on the search result details on client side or just return empty
            // if we can't get it easily.

        } else if (source === 'Lrclib') {
            try {
                const response = await fetch(`https://lrclib.net/api/get/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    rawLyrics = data.syncedLyrics || data.plainLyrics;
                    songName = data.name;
                    artistName = data.artistName;
                }
            } catch (e) {
                console.error("Lrclib fetch error", e);
            }
        }

        if (!rawLyrics) {
            return res.status(404).json({ error: 'Lyrics not found' });
        }

        // Convert
        console.log("🔄 Converting to Romaji...");
        const lines = rawLyrics.split("\n");
        let romajiLines = [];

        for (const line of lines) {
            const match = line.match(/^(\[.*?\])(.*)/);
            if (match) {
                const timestamp = match[1];
                const text = match[2];
                if (text.trim()) {
                    const converted = await kuroshiro.convert(text, {
                        to: "romaji",
                        mode: "spaced",
                        romajiSystem: "hepburn",
                    });
                    romajiLines.push({ timestamp, original: text, romaji: converted });
                } else {
                    romajiLines.push({ timestamp, original: "", romaji: "" });
                }
            } else {
                if (line.trim()) {
                    const converted = await kuroshiro.convert(line, {
                        to: "romaji",
                        mode: "spaced",
                        romajiSystem: "hepburn",
                    });
                    romajiLines.push({ timestamp: "", original: line, romaji: converted });
                }
            }
        }

        res.json({
            song: songName,
            artist: artistName,
            source,
            lyrics: romajiLines,
            raw: rawLyrics
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/convert', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`\n🔄 Converting raw text...`);

    try {
        await initKuroshiro();
        const lines = text.split("\n");
        let results = [];

        for (const line of lines) {
            if (line.trim()) {
                const converted = await kuroshiro.convert(line, {
                    to: "romaji",
                    mode: "spaced",
                    romajiSystem: "hepburn",
                });
                results.push({ original: line, romaji: converted });
            } else {
                results.push({ original: "", romaji: "" });
            }
        }

        res.json({ results });

    } catch (error) {
        console.error("Conversion Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// YouTube Fetcher Logic
const YTDlpWrap = require('yt-dlp-wrap').default;

const ytDlpBinaryPath = nodePath.join(__dirname, 'yt-dlp');
const ytDlpWrap = new YTDlpWrap();

// Ensure binary exists and use local one
(async () => {
    try {
        console.log("Checking for local yt-dlp binary at:", ytDlpBinaryPath);
        if (!fs.existsSync(ytDlpBinaryPath)) {
            console.log("Local yt-dlp not found. Downloading latest...");
            await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
            // Ensure executable permissions
            fs.chmodSync(ytDlpBinaryPath, '755');
            console.log("yt-dlp downloaded successfully.");
        } else {
            console.log("Local yt-dlp found.");
        }

        // Update the wrap instance to use this path
        ytDlpWrap.setBinaryPath(ytDlpBinaryPath);

        const version = await ytDlpWrap.getVersion();
        console.log(`Using yt-dlp version: ${version}`);

    } catch (e) {
        console.error("Failed to setup yt-dlp:", e);
    }
})();

app.post('/api/ytdl/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log(`\n📺 Fetching YouTube Info: ${url}`);
    try {
        const metadata = await ytDlpWrap.getVideoInfo(url);
        res.json({
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            duration: metadata.duration,
            channel: metadata.uploader
        });
    } catch (error) {
        console.error("yt-dlp info error:", error);
        res.status(500).json({ error: 'Failed to fetch video info. ' + error.message });
    }
});

app.get('/api/ytdl/status', (req, res) => {
    const cookiesPath = nodePath.join(__dirname, 'cookies.txt');
    const cookiesFound = fs.existsSync(cookiesPath);
    res.json({ cookiesFound });
});

app.get('/api/ytdl/download', async (req, res) => {
    const { url, type, embedThumbnail } = req.query;
    if (!url || !type) return res.status(400).json({ error: 'URL and type are required' });

    console.log(`\n📥 Downloading ${type} from: ${url} (Embed Thumbnail: ${embedThumbnail})`);

    const tempDir = nodePath.join(__dirname, 'temp_downloads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Generate a unique ID for this download to avoid collisions
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    // Placeholder filename, will be renamed by yt-dlp usually but we force specific output
    // We need to know the extension ahead of time or let yt-dlp handle it.
    // For simplicity, let's determine expected extension.
    let ext = 'mp4';
    if (type === 'audio') ext = 'mp3';
    else if (type === 'opus') ext = 'opus';
    // Note: yt-dlp might output .webm or .ogg for opus, but we can try to force or just use a pattern.

    // We'll use a template for yt-dlp output
    const tempBasePath = nodePath.join(tempDir, `dl_${uniqueId}`);
    // Output template: temp_downloads/dl_12345.%(ext)s
    const outputTemplate = `${tempBasePath}.%(ext)s`;

    try {
        let args = [url];

        // Cookies
        const cookiesPath = nodePath.join(__dirname, 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            console.log("🍪 Found cookies.txt, using for yt-dlp...");
            args.push('--cookies', cookiesPath);
        }

        // Embed Thumbnail
        if (embedThumbnail === 'true') {
            args.push('--embed-thumbnail');
        }

        // Format specific args
        let finalFilename = `download.${ext}`; // Fallback

        // Get Metadata for nice filename (we do this separately or let yt-dlp handle it?
        // We can get metadata from the file later or just request it now.
        // Let's request metadata first to get a nice filename for the User Download.
        let metaArgs = [url, '--dump-json'];
        if (fs.existsSync(cookiesPath)) metaArgs.push('--cookies', cookiesPath);

        let title = 'download';
        try {
            const metaStdout = await ytDlpWrap.execPromise(metaArgs);
            const meta = JSON.parse(metaStdout);
            title = meta.title.replace(/[<>"\/\\|?*:]/g, '_'); // Sanitize
        } catch (e) {
            console.error("Meta fetch failed, using default name", e);
        }

        // Explicitly set Node.js as the runtime for signature challenges
        // We know node is available since we are running in it.
        // yt-dlp might need full path if not in PATH for some reason, but 'node' should work.
        // Actually, let's use process.execPath to be safe.
        args.push('--js-runtimes', `node:${process.execPath}`);

        // Add metadata (Title, Artist, etc.)
        args.push('--add-metadata');

        if (type === 'audio') {
            // MP3
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.mp3`;
        } else if (type === 'opus') {
            // Opus - default bestaudio is often WebM which doesn't support embedding thumbnails well
            // We must transcode/remux to OGG/Opus for thumbnail support.
            args.push('-x', '--audio-format', 'opus');
            args.push('-o', outputTemplate);
            // Result will be .opus
            finalFilename = `${title}.opus`;
        } else {
            // Video
            args.push('-f', 'best[ext=mp4]');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.mp4`;
        }

        console.log("Starting download with args:", args.join(' '));

        await ytDlpWrap.execPromise(args);

        // Find the generated file. Since extension might vary (esp for opus -> webm), find the file matching the ID.
        const files = fs.readdirSync(tempDir);
        const downloadedFile = files.find(f => f.startsWith(`dl_${uniqueId}`));

        if (!downloadedFile) {
            throw new Error("Downloaded file not found");
        }

        const fullPath = nodePath.join(tempDir, downloadedFile);

        // If opus requested and we got webm/ogg, usually browsers handle it, but let's just send what we got
        // correcting the filename extension if needed.
        const actualExt = nodePath.extname(downloadedFile);
        if (type === 'opus' && finalFilename.endsWith('.opus') && actualExt !== '.opus') {
            // Update filename to match actual container if it matters
            // But user asked for opus. .opus is OGG container usually. webm is Matroska.
            // Let's just keep the original safe title and append actual extension
            finalFilename = `${title}${actualExt}`;
        }

        console.log(`Sending file: ${fullPath} as ${finalFilename}`);

        // EMBED ROMAJI LYRICS IF REQUESTED (MP3/Opus)
        const embedRomaji = req.query.embedRomajiLyrics === 'true';

        if (embedRomaji && (type === 'audio' || type === 'opus')) {
            try {
                console.log("🎤 Attempting to fetch and embed Romaji lyrics...");

                // 1. Search for lyrics using the clean title
                const searchQuery = title.replace(/_/g, ' ');
                console.log(`   Searching lyrics for: ${searchQuery}`);

                let rawLyrics = null;

                const lrcSearchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);
                if (lrcSearchRes.ok) {
                    const lrcData = await lrcSearchRes.json();
                    if (lrcData && lrcData.length > 0) {
                        const songId = lrcData[0].id;
                        const lrcGetRes = await fetch(`https://lrclib.net/api/get/${songId}`);
                        if (lrcGetRes.ok) {
                            const songData = await lrcGetRes.json();
                            rawLyrics = songData.syncedLyrics || songData.plainLyrics;
                        }
                    }
                }

                if (rawLyrics) {
                     // 2. Convert to Romaji
                     await initKuroshiro();
                     const lines = rawLyrics.split("\n");
                     let romajiLyrics = "";

                     for (const line of lines) {
                        if (line.trim()) {
                            const match = line.match(/^(\[.*?\])(.*)/);
                            if (match) {
                                const timestamp = match[1];
                                const content = match[2];
                                if (content.trim()) {
                                    const converted = await kuroshiro.convert(content, {
                                        to: "romaji",
                                        mode: "spaced",
                                        romajiSystem: "hepburn",
                                    });
                                    romajiLyrics += `${timestamp} ${converted}\n`;
                                } else {
                                     romajiLyrics += `${line}\n`;
                                }
                            } else {
                                const converted = await kuroshiro.convert(line, {
                                    to: "romaji",
                                    mode: "spaced",
                                    romajiSystem: "hepburn",
                                });
                                romajiLyrics += `${converted}\n`;
                            }
                        } else {
                            romajiLyrics += "\n";
                        }
                     }

                     // 3. Embed
                     if (type === 'audio') { // MP3
                         console.log("   Embedding lyrics into MP3...");
                         const success = NodeID3.update(
                             { unsynchronisedLyrics: { language: "eng", text: romajiLyrics } },
                             fullPath
                         );
                         if (success) console.log("   Lyrics embedded successfully (MP3).");
                         else console.error("   Failed to verify lyrics embedding (MP3).");

                     } else if (type === 'opus') { // Opus
                         console.log("   Embedding lyrics into Opus...");
                         const tempOutputPath = fullPath.replace('.opus', '_temp.opus');
                         // spawn is required from child_process

                         await new Promise((resolve, reject) => {
                             const ffmpegArgs = [
                                 '-y',
                                 '-i', fullPath,
                                 '-c', 'copy',
                                 '-metadata', `lyrics=${romajiLyrics}`,
                                 tempOutputPath
                             ];

                             const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

                             ffmpegProcess.on('close', (code) => {
                                 if (code === 0) {
                                     try {
                                         if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                                         fs.renameSync(tempOutputPath, fullPath);
                                         console.log("   Lyrics embedded successfully (Opus).");
                                         resolve();
                                     } catch (err) { reject(err); }
                                 } else {
                                     reject(new Error(`ffmpeg exited with code ${code}`));
                                 }
                             });
                         });
                     }

                } else {
                    console.log("   No lyrics found to embed.");
                }

            } catch (lyricErr) {
                console.error("   Failed to embed lyrics:", lyricErr);
            }
        }

        // Manually set Content-Disposition to ensure browsers handle UTF-8 filenames correctly
        // content-disposition library used by res.download usually works, but manual fallback helps.
        // Format: attachment; filename="fallback.ext"; filename*=UTF-8''encoded_name.ext
        const encodedFilename = encodeURIComponent(finalFilename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

        res.setHeader('Content-Disposition', `attachment; filename="download.${type === 'audio' ? 'mp3' : 'opus'}"; filename*=UTF-8''${encodedFilename}`);

        res.download(fullPath, finalFilename, (err) => {
            if (err) console.error("Send file error:", err);
            // Cleanup
            try {
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                console.log("Temp file deleted.");
            } catch (e) {
                console.error("Cleanup failed:", e);
            }
        });

    } catch (error) {
        console.error("Download processing error:", error);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed: ' + error.message });
    }
});

// Serve static files from the React app
app.use(express.static(nodePath.join(__dirname, 'client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
    // Check if request is for API, if so don't return index.html (though express handles order)
    // But if it reached here, it didn't match /api/...
    res.sendFile(nodePath.join(__dirname, 'client/dist', 'index.html'));
});

function startServer() {
    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            resolve(server);
        });
        server.on('error', reject);
    });
}

// Only start if run directly
if (require.main === module) {
    startServer();
}

module.exports = { startServer, app };
