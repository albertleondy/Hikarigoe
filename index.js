const fs = require("fs");
// Import the entire API object to be safe
const NeteaseApi = require("netease-cloud-music-api");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

// Extract the functions we need manually
const search = NeteaseApi.search;
const lyric = NeteaseApi.lyric;

const kuroshiro = new Kuroshiro();

async function fetchFromLrclib(query) {
  console.log(`\n🔍 Searching Lrclib for: "${query}"...`);
  try {
    const response = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
        throw new Error(`Lrclib API error: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Find the first result with synced lyrics, or fall back to plain lyrics
    const result = data.find(item => item.syncedLyrics) || data.find(item => item.plainLyrics);

    if (!result) {
        console.error("❌ Song not found on Lrclib.");
        return null;
    }

    console.log(`✅ Found on Lrclib: "${result.name}" by ${result.artistName}`);
    return {
        lyrics: result.syncedLyrics || result.plainLyrics,
        name: result.name,
        artist: result.artistName
    };

  } catch (error) {
    console.error("⚠️ Error fetching from Lrclib:", error.message);
    return null;
  }
}

async function main() {
  const query = process.argv.slice(2).join(" ");

  if (!query) {
    console.error("❌ Error: Please provide a song title.");
    return;
  }

  await kuroshiro.init(new KuromojiAnalyzer());

  let rawLyrics = "";
  let songName = "";
  let artistName = "";

  // 1. Try Netease
  console.log(`\n🔍 Searching NetEase for: "${query}"...`);
  try {
    const searchResult = await search({ keywords: query, type: 1, limit: 1 });
    
    if (searchResult && searchResult.body && searchResult.body.result?.songs && searchResult.body.result.songs.length > 0) {
        const song = searchResult.body.result.songs[0];
        console.log(`✅ Found on NetEase: "${song.name}" by ${song.artists[0].name} (ID: ${song.id})`);
        
        const lyricResult = await lyric({ id: song.id });
        const lrc = lyricResult.body?.lrc?.lyric;
        if (lrc) {
             rawLyrics = lrc;
             songName = song.name;
             artistName = song.artists[0].name;
        } else {
            console.error("❌ Found song on NetEase but no lyrics available.");
        }
    } else {
         console.error("❌ NetEase API returned no data or song not found.");
    }

  } catch (error) {
      console.error("⚠️ NetEase API error (likely IP block or network issue).");
  }

  // 2. Fallback to Lrclib if Netease failed
  if (!rawLyrics) {
      console.log("\n⚠️ Falling back to Lrclib...");
      const lrcResult = await fetchFromLrclib(query);
      if (lrcResult) {
          rawLyrics = lrcResult.lyrics;
          songName = lrcResult.name;
          artistName = lrcResult.artist;
      }
  }

  if (!rawLyrics) {
      console.error("\n❌ Could not fetch lyrics from any source.");
      return;
  }

  // 3. Convert
  console.log("🔄 Converting to Romaji...");
  const lines = rawLyrics.split("\n");
  let romajiLrc = "";

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
        romajiLrc += `${timestamp} ${converted}\n`;
      } else {
        romajiLrc += `${line}\n`;
      }
    } else {
      romajiLrc += `${line}\n`;
    }
  }

  // 4. Save
  const safeFilename = `${songName} - ${artistName}.lrc`.replace(
    /[\/\\?%*:|"<>]/g,
    "",
  );
  fs.writeFileSync(safeFilename, romajiLrc);
  console.log(`\n🎉 Success! Saved to: "${safeFilename}"`);
}

main();
