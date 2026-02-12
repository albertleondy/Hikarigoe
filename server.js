const express = require('express');
const cors = require('cors');
const NeteaseApi = require("netease-cloud-music-api");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const nodePath = require('path');
const fs = require('fs');

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

// YouTube Fetcher Logic
const YTDlpWrap = require('yt-dlp-wrap').default;

let ytDlpWrap;
let userDataPath;

async function setupYtDlp(customUserDataPath) {
    userDataPath = customUserDataPath || nodePath.join(__dirname, 'data'); // Fallback for local dev

    // Ensure user data directory exists
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    const ytDlpBinaryPath = nodePath.join(userDataPath, 'yt-dlp');
    ytDlpWrap = new YTDlpWrap();

    try {
        console.log("Checking for yt-dlp binary at:", ytDlpBinaryPath);
        if (!fs.existsSync(ytDlpBinaryPath)) {
            console.log("yt-dlp not found. Downloading latest...");
            await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
            fs.chmodSync(ytDlpBinaryPath, '755');
            console.log("yt-dlp downloaded successfully.");
        } else {
            console.log("yt-dlp found.");
        }

        ytDlpWrap.setBinaryPath(ytDlpBinaryPath);
        const version = await ytDlpWrap.getVersion();
        console.log(`Using yt-dlp version: ${version}`);

    } catch (e) {
        console.error("Failed to setup yt-dlp:", e);
    }
}

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

// Job Queue for Downloads
const downloadJobs = {};

app.get('/api/ytdl/status', (req, res) => {
    const cookiesPath = nodePath.join(userDataPath, 'cookies.txt');
    const cookiesFound = fs.existsSync(cookiesPath);
    res.json({ cookiesFound });
});

app.post('/api/ytdl/prepare-download', async (req, res) => {
    const { url, type, embedThumbnail } = req.body;
    if (!url || !type) return res.status(400).json({ error: 'URL and type are required' });

    const jobId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    downloadJobs[jobId] = {
        id: jobId,
        status: 'pending',
        url,
        type,
        startTime: Date.now()
    };

    // Start background processing
    processDownload(jobId, url, type, embedThumbnail).catch(err => {
        console.error(`Job ${jobId} failed:`, err);
        if (downloadJobs[jobId]) {
            downloadJobs[jobId].status = 'error';
            downloadJobs[jobId].error = err.message;
        }
    });

    res.json({ jobId, status: 'pending' });
});

app.get('/api/ytdl/job-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = downloadJobs[jobId];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

app.get('/api/ytdl/serve-file/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = downloadJobs[jobId];

    if (!job || job.status !== 'ready' || !job.filePath) {
        return res.status(404).send('File not ready or job not found');
    }

    res.download(job.filePath, job.filename, (err) => {
        if (err) console.error("Send file error:", err);
        // Transform job to cleanup state or delete immediately?
        // Let's delete the file after sending to save space
        try {
            fs.unlinkSync(job.filePath);
            console.log(`Cleaned up file for job ${jobId}`);
        } catch (e) {
            console.error("Cleanup failed:", e);
        }
        delete downloadJobs[jobId];
    });
});

async function processDownload(jobId, url, type, embedThumbnail) {
    console.log(`\n📥 Starting Download Job ${jobId}: ${type} from ${url}`);
    const job = downloadJobs[jobId];
    if (!job) return;

    const tempDir = nodePath.join(userDataPath, 'temp_downloads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    let ext = 'mp4';
    if (type === 'audio') ext = 'mp3';
    else if (type === 'opus') ext = 'opus';

    const tempBasePath = nodePath.join(tempDir, `dl_${jobId}`);
    const outputTemplate = `${tempBasePath}.%(ext)s`;

    try {
        let args = [url];
        const cookiesPath = nodePath.join(userDataPath, 'cookies.txt');
        if (fs.existsSync(cookiesPath)) args.push('--cookies', cookiesPath);
        if (embedThumbnail) args.push('--embed-thumbnail');

        let title = 'download';
        try {
            // Quick metadata fetch
            let metaArgs = [url, '--dump-json'];
            if (fs.existsSync(cookiesPath)) metaArgs.push('--cookies', cookiesPath);
            const metaStdout = await ytDlpWrap.execPromise(metaArgs);
            const meta = JSON.parse(metaStdout);
            title = meta.title.replace(/[<>"\/\\|?*:]/g, '_');
        } catch (e) {
            console.error("Meta fetch failed, using default name", e);
        }

        args.push('--js-runtimes', `node:${process.execPath}`);
        args.push('--add-metadata'); // always add metadata

        let finalFilename = `download.${ext}`;

        if (type === 'audio') {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.mp3`;
        } else if (type === 'opus') {
            args.push('-x', '--audio-format', 'opus');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.opus`;
        } else {
            args.push('-f', 'best[ext=mp4]');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.mp4`;
        }

        await ytDlpWrap.execPromise(args);

        const files = fs.readdirSync(tempDir);
        const downloadedFile = files.find(f => f.startsWith(`dl_${jobId}`));

        if (!downloadedFile) throw new Error("Downloaded file not found");

        const fullPath = nodePath.join(tempDir, downloadedFile);

        // Fix extension logic if needed
        const actualExt = nodePath.extname(downloadedFile);
        if (type === 'opus' && finalFilename.endsWith('.opus') && actualExt !== '.opus') {
            finalFilename = `${title}${actualExt}`;
        }

        job.status = 'ready';
        job.filePath = fullPath;
        job.filename = finalFilename;
        console.log(`Job ${jobId} ready: ${finalFilename}`);

    } catch (error) {
        console.error(`Job ${jobId} error:`, error);
        job.status = 'error';
        job.error = error.message;
        throw error;
    }
}


// Legacy/Blocking download logic removed in favor of job system
// app.get('/api/ytdl/download' ... ) removed

// Serve static files from the React app
app.use(express.static(nodePath.join(__dirname, 'client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
    // Check if request is for API, if so don't return index.html (though express handles order)
    // But if it reached here, it didn't match /api/...
    res.sendFile(nodePath.join(__dirname, 'client/dist', 'index.html'));
});

function startServer(config = {}) {
    return new Promise(async (resolve, reject) => {
        // Initialize with provided userDataPath or default
        await setupYtDlp(config.userDataPath);

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
