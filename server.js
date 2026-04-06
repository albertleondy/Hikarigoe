const express = require('express');
const cors = require('cors');
const NeteaseApi = require("netease-cloud-music-api");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const nodePath = require('path');
const fs = require('fs');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001;




app.use(cors());
app.use(express.json({ limit: '10mb' }));

let browserCookieSetting = '';

function getCookieArgs() {
    if (browserCookieSetting) {
        return ['--cookies-from-browser', browserCookieSetting];
    }
    const cookiesPath = nodePath.join(__dirname, 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
        return ['--cookies', cookiesPath];
    }
    return [];
}

// Genius helper functions
async function searchGenius(query) {
    try {
        const response = await fetch(`https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Genius search failed: ${response.status}`);
        }

        const data = await response.json();
        const songs = data.response.sections.find(section => section.type === 'song')?.hits || [];

        return songs.map(hit => ({
            id: hit.result.id.toString(),
            url: hit.result.url,
            title: hit.result.title,
            artist: hit.result.primary_artist.name,
            album: hit.result.album?.name || 'Unknown',
            thumbnail: hit.result.song_art_image_thumbnail_url,
            duration: null // Genius doesn't provide duration
        }));
    } catch (error) {
        console.error("⚠️ Genius Search Error:", error.message);
        return [];
    }
}

async function getGeniusLyrics(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Genius page fetch failed: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract song title and artist
        const title = $('h1').first().text().trim() || '';
        const artist = $('.header_with_cover_art-primary_info-primary_artist').first().text().trim() || '';

        // Genius stores lyrics in a div with data-lyrics-container attribute
        const lyricsContainer = $('[data-lyrics-container="true"]');

        if (lyricsContainer.length === 0) {
            return { lyrics: null, title, artist };
        }

        // Get the text content and clean it up
        let lyrics = lyricsContainer.first().text();

        // Find where the actual lyrics start by looking for common patterns
        const lyricsPatterns = [
            /\[Verse 1\]/i,
            /\[Verse\]/i,
            /\[Chorus\]/i,
            /\[Intro\]/i,
            /Lyrics\s+/i,
            /Read More\s+/i
        ];

        let lyricsStart = -1;
        for (const pattern of lyricsPatterns) {
            const match = lyrics.match(pattern);
            if (match && (lyricsStart === -1 || match.index < lyricsStart)) {
                lyricsStart = match.index + match[0].length; // Start after the pattern
            }
        }

        // If we found a pattern, extract from that point
        if (lyricsStart !== -1) {
            lyrics = lyrics.substring(lyricsStart);
        }

        // Clean up the lyrics - be more careful with regex patterns
        lyrics = lyrics.replace(/\d+\s+Contributors[\s\S]*?Lyrics/i, ''); // Remove contributor info up to "Lyrics"
        lyrics = lyrics.replace(/Translations[\s\S]*?Lyrics/i, ''); // Remove translation info up to "Lyrics"
        lyrics = lyrics.replace(/Read More[\s\S]*?Lyrics/i, ''); // Remove "Read More" up to "Lyrics"
        lyrics = lyrics.replace(/^[\s\S]*?Lyrics/i, ''); // Remove everything up to and including "Lyrics"

        // Clean up extra whitespace but preserve line structure
        lyrics = lyrics.trim();

        return { lyrics, title, artist };
    } catch (error) {
        console.error("Genius lyrics fetch error:", error.message);
        return { lyrics: null, title: '', artist: '' };
    }
}

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

    // 3. Search Genius
    try {
        const geniusSongs = await searchGenius(query);
        const formattedGeniusSongs = geniusSongs.slice(0, 10).map(song => ({
            id: song.id,
            source: 'Genius',
            name: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            url: song.url // Store URL for lyrics fetching
        }));
        results = [...results, ...formattedGeniusSongs];
    } catch (error) {
        console.error("⚠️ Genius Search Error:", error.message);
    }

    res.json(results);
});

app.get('/api/lyrics', async (req, res) => {
    const { id, source, url } = req.query;

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
        } else if (source === 'Genius') {
            try {
                if (url) {
                    const geniusResult = await getGeniusLyrics(url);
                    rawLyrics = geniusResult.lyrics;
                    songName = geniusResult.title;
                    artistName = geniusResult.artist;
                } else {
                    console.error("Genius URL not provided");
                }
            } catch (e) {
                console.error("Genius fetch error", e);
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
const os = require('os');

const isWindows = os.platform() === 'win32';
const ytDlpBinaryPath = nodePath.join(__dirname, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
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
        const stdout = await ytDlpWrap.execPromise([url, '--dump-json', '--flat-playlist', ...getCookieArgs()]);
        const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length > 1) {
            // It's a playlist!
            const results = lines.map(line => {
                try {
                    const meta = JSON.parse(line);
                    return {
                        id: meta.id,
                        title: meta.title,
                        url: `https://www.youtube.com/watch?v=${meta.id}`,
                        thumbnail: meta.thumbnails?.[0]?.url || meta.thumbnail || "",
                        duration: meta.duration,
                        channel: meta.uploader || meta.channel || meta.uploader_id
                    };
                } catch (e) {
                    return null;
                }
            }).filter(item => item !== null && item.id);
            res.json({ isPlaylist: true, videos: results });
        } else if (lines.length === 1) {
            const metadata = JSON.parse(lines[0]);
            
            if (metadata._type === 'playlist' && metadata.entries) {
                 const results = metadata.entries.map(meta => ({
                    id: meta.id,
                    title: meta.title,
                    url: `https://www.youtube.com/watch?v=${meta.id}`,
                    thumbnail: meta.thumbnails?.[0]?.url || meta.thumbnail || "",
                    duration: meta.duration,
                    channel: meta.uploader || meta.channel || meta.uploader_id
                 })).filter(item => item.id);
                 res.json({ isPlaylist: true, videos: results });
                 return;
            }

            res.json({
                isPlaylist: false,
                id: metadata.id,
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                channel: metadata.uploader
            });
        } else {
             res.status(404).json({ error: 'No data returned' });
        }
    } catch (error) {
        console.error("yt-dlp info error:", error);
        res.status(500).json({ error: 'Failed to fetch video info. ' + error.message });
    }
});

app.get('/api/ytdl/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    console.log(`\n🔍 YouTube Search: ${q}`);
    try {
        let args = [`ytsearch80:${q}`, '--dump-json', '--flat-playlist', ...getCookieArgs()];

        const stdout = await ytDlpWrap.execPromise(args);
        const results = stdout.trim().split('\n').map(line => {
            try {
                const meta = JSON.parse(line);
                return {
                    id: meta.id,
                    title: meta.title,
                    url: `https://www.youtube.com/watch?v=${meta.id}`,
                    thumbnail: meta.thumbnails?.[0]?.url || "",
                    duration: meta.duration,
                    channel: meta.uploader || meta.channel
                };
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null);

        res.json(results);
    } catch (error) {
        console.error("yt-dlp search error:", error);
        res.status(500).json({ error: 'Failed to search YouTube. ' + error.message });
    }
});

app.get('/api/ytdl/related', async (req, res) => {
    const { url, channel, id } = req.query;
    if (!url && !channel && !id) return res.status(400).json({ error: 'URL, channel or id parameter is required' });

    try {
        let videoId = id;
        if (!videoId && url) {
            videoId = url.match(/[?&]v=([^&]+)/)?.[1] || url.match(/youtu\.be\/([^?]+)/)?.[1];
        }

        if (videoId) {
            console.log(`\n🎬 Fetching similar videos for: ${videoId}`);
            // Fetch similar videos using YouTube's Mix playlist (list=RD<video_id>)
            let args = [`https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`, '--dump-json', '--flat-playlist', '--playlist-end', '15', ...getCookieArgs()];
            try {
                const stdout = await ytDlpWrap.execPromise(args);
                const results = stdout.trim().split('\n').filter(Boolean).map(line => {
                    try {
                        const meta = JSON.parse(line);
                        return {
                            id: meta.id,
                            title: meta.title,
                            url: `https://www.youtube.com/watch?v=${meta.id}`,
                            thumbnail: meta.thumbnails?.[0]?.url || meta.thumbnail || "",
                            duration: meta.duration,
                            channel: meta.uploader || meta.channel
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(item => item !== null);

                // Check if we actually got results back
                if (results.length > 0) {
                    return res.json(results);
                }
            } catch (e) {
                console.log("Mix playlist fetch failed:", e.message, "Falling back to channel search...");
            }
        }

        // Fallback to channel
        let searchQuery = channel;
        if (!searchQuery && url) {
            const metaArgs = [url, '--dump-json', ...getCookieArgs()];
            try {
                const metaStdout = await ytDlpWrap.execPromise(metaArgs);
                const meta = JSON.parse(metaStdout);
                searchQuery = meta.uploader || meta.channel;
            } catch (e) { }
        }

        if (!searchQuery) {
            return res.status(404).json({ error: 'Could not determine channel for fallback' });
        }

        console.log(`\n🎬 Fetching fallback recommendations for channel: ${searchQuery}`);
        let args = [`ytsearch15:${searchQuery}`, '--dump-json', '--flat-playlist', ...getCookieArgs()];
        const stdout = await ytDlpWrap.execPromise(args);
        const results = stdout.trim().split('\n').filter(Boolean).map(line => {
            try {
                const meta = JSON.parse(line);
                return {
                    id: meta.id,
                    title: meta.title,
                    url: `https://www.youtube.com/watch?v=${meta.id}`,
                    thumbnail: meta.thumbnails?.[0]?.url || meta.thumbnail || "",
                    duration: meta.duration,
                    channel: meta.uploader || meta.channel
                };
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null);

        res.json(results);
    } catch (error) {
        console.error("yt-dlp related error:", error);
        res.status(500).json({ error: 'Failed to fetch related videos. ' + error.message });
    }
});

app.get('/api/ytdl/status', (req, res) => {
    const cookiesPath = nodePath.join(__dirname, 'cookies.txt');
    const cookiesFound = fs.existsSync(cookiesPath);
    res.json({ cookiesFound, browserCookie: browserCookieSetting });
});

app.post('/api/ytdl/cookie_settings', (req, res) => {
    const { browser, cookieText } = req.body;
    try {
        if (cookieText) {
            fs.writeFileSync(nodePath.join(__dirname, 'cookies.txt'), cookieText);
            browserCookieSetting = '';
        } else if (browser !== undefined) {
            browserCookieSetting = browser;
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const { spawnSync } = require('child_process');

// Lyrics Job Store
const lyricsJobs = new Map();

app.post('/api/ytdl/prepare_lyrics', (req, res) => {
    const { lyricsData } = req.body;
    if (!lyricsData) return res.status(400).json({ error: 'Missing lyricsData' });
    const jobId = Math.random().toString(36).substring(2, 15);
    lyricsJobs.set(jobId, lyricsData);

    // Auto cleanup after 10 mins
    setTimeout(() => {
        lyricsJobs.delete(jobId);
    }, 10 * 60 * 1000);

    res.json({ jobId });
});

app.get('/api/ytdl/download', async (req, res) => {
    const { url, type, embedThumbnail, jobId, startTime, endTime } = req.query;
    if (!url || !type) return res.status(400).json({ error: 'URL and type are required' });

    const lyricsData = jobId ? lyricsJobs.get(jobId) : null;
    console.log(`\n📥 Downloading ${type} from: ${url} (Embed Thumb: ${embedThumbnail}, Has Lyrics: ${!!lyricsData}, Trim: ${startTime}-${endTime})`);

    const tempDir = nodePath.join(__dirname, 'temp_downloads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    let ext = 'mp4';
    if (type === 'audio') ext = 'mp3';
    else if (type === 'opus') ext = 'opus';

    const tempBasePath = nodePath.join(tempDir, `dl_${uniqueId}`);
    const outputTemplate = `${tempBasePath}.%(ext)s`;

    try {
        let args = [url, ...getCookieArgs()];

        if (embedThumbnail === 'true') {
            args.push('--embed-thumbnail');
        }

        // Add video trimming if requested
        if (startTime !== undefined && endTime !== undefined) {
            const start = parseFloat(startTime);
            const end = parseFloat(endTime);
            if (!isNaN(start) && !isNaN(end) && start < end) {
                // Format: *START-END in seconds
                args.push('--download-sections', `*${start}-${end}`);
                console.log(`🎬 Trimming video from ${start}s to ${end}s`);
            }
        }

        let finalFilename = `download.${ext}`;
        let metaArgs = [url, '--dump-json', ...getCookieArgs()];

        let title = 'download';
        try {
            const metaStdout = await ytDlpWrap.execPromise(metaArgs);
            const meta = JSON.parse(metaStdout);
            title = meta.title.replace(/[<>"\/\\|?*:]/g, '_');
        } catch (e) {
            console.error("Meta fetch failed, using default name", e);
        }

        args.push('--js-runtimes', `node:${process.execPath}`);
        args.push('--add-metadata');

        if (type === 'audio') {
            args.push('-f', 'bestaudio');
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
            args.push('-o', outputTemplate);
            finalFilename = `${title}.mp3`;
        } else if (type === 'opus') {
            args.push('-f', 'bestaudio');
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
        let downloadedFile = files.find(f => f.startsWith(`dl_${uniqueId}`));

        if (!downloadedFile) {
            throw new Error("Downloaded file not found");
        }

        let fullPath = nodePath.join(tempDir, downloadedFile);

        // FFMPEG Embedding Lyrics Post-Process
        if (lyricsData && (type === 'audio' || type === 'opus')) {
            console.log("Adding lyrics metadata via ffmpeg...");

            // For opus format, ffmpeg's opus muxer rejects video streams so mapping existing thumbnail (picture stream)
            // will cause ffmpeg to fail. If we skip mapping it, ffmpeg destroys the thumbnail.
            // If the user checked embedThumbnail for an opus file, we must skip this destructive ffmpeg step.
            if (type === 'opus' && embedThumbnail === 'true') {
                console.log("Skipping ffmpeg post-process for opus to preserve yt-dlp thumbnail.");
            } else {
                const lyricsText = lyricsData.raw;
                const newFullPath = nodePath.join(tempDir, `lyric_${uniqueId}_${downloadedFile}`);

                // For mp3, '-map 0' successfully preserves the thumbnail picture stream
                const ffmpegArgs = [
                    '-i', fullPath,
                    '-map', '0',
                    '-c', 'copy',
                    '-metadata', `lyrics=${lyricsText}`,
                    newFullPath
                ];

                const result = spawnSync('ffmpeg', ffmpegArgs);
                if (result.error || result.status !== 0) {
                    console.error("FFMPEG lyrics embedding failed:", result.stderr ? result.stderr.toString() : 'Unknown Error');
                } else {
                    // Success! Delete old file, set fullPath to new file
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (e) { }
                    fullPath = newFullPath;
                }
            }
        }

        const actualExt = nodePath.extname(fullPath);
        if (type === 'opus' && finalFilename.endsWith('.opus') && actualExt !== '.opus') {
            finalFilename = `${title}${actualExt}`;
        }

        console.log(`Sending file: ${fullPath} as ${finalFilename}`);
        res.download(fullPath, finalFilename, (err) => {
            if (err) console.error("Send file error:", err);
            try {
                fs.unlinkSync(fullPath);
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
