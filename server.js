const express = require('express');
const cors = require('cors');
const NeteaseApi = require("netease-cloud-music-api");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
