import React, { useState } from 'react';

const LyricFetcher = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedLyrics, setSelectedLyrics] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoadingSearch(true);
        setError(null);
        setSearchResults([]);
        setSelectedLyrics(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSelectSong = async (song) => {
        setLoadingLyrics(true);
        setError(null);
        setSelectedLyrics(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/api/lyrics?id=${song.id}&source=${song.source}`);
            if (!response.ok) {
                throw new Error('Failed to fetch lyrics');
            }
            const data = await response.json();
            setSelectedLyrics({
                ...data,
                song: data.song || song.name,
                artist: data.artist || song.artist
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingLyrics(false);
        }
    };

    const handleDownload = () => {
        if (!selectedLyrics) return;

        const content = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedLyrics.song} - ${selectedLyrics.artist}.lrc`.replace(/[\/\\?%*:|"<>]/g, '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="main-content fadeIn">
            {/* LEFT PANEL: SEARCH & LIST */}
            <div className="panel left-panel">
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Enter song title..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="search-button" disabled={loadingSearch}>
                        {loadingSearch ? '...' : 'Search'}
                    </button>
                </form>

                <div className="results-list-container">
                    {error && <div className="error-message">{error}</div>}

                    {searchResults.length === 0 && !loadingSearch && (
                        <div className="empty-state-text">Search for a song to see results here.</div>
                    )}

                    <div className="results-list">
                        {searchResults.map((song) => (
                            <div key={`${song.source}-${song.id}`} className="song-item" onClick={() => handleSelectSong(song)}>
                                <div className="song-info">
                                    <div className="song-name">{song.name}</div>
                                    <div className="song-artist">{song.artist}</div>
                                    <div className="song-meta">{song.album}</div>
                                </div>
                                <div className="song-source">
                                    <span className={`source-tag ${song.source.toLowerCase()}`}>{song.source}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: LYRICS DISPLAY */}
            <div className="panel right-panel">
                {loadingLyrics ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Fetching & Converting Lyrics...</p>
                    </div>
                ) : selectedLyrics ? (
                    <div className="result-container fadeIn">
                        <div className="song-header">
                            <h2>{selectedLyrics.song}</h2>
                            <h3>{selectedLyrics.artist}</h3>
                            <span className="source-badge">Source: {selectedLyrics.source}</span>
                        </div>

                        <div className="lyrics-scroll">
                            {selectedLyrics.lyrics.map((line, index) => (
                                <div key={index} className="lyric-line">
                                    {line.romaji && <div className="romaji">{line.romaji}</div>}
                                    {line.original && <div className="original">{line.original}</div>}
                                    {!line.original && !line.romaji && <br />}
                                </div>
                            ))}
                        </div>

                        <div className="button-group">
                            <button
                                className="action-button copy-button"
                                onClick={() => navigator.clipboard.writeText(selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n'))}
                            >
                                Copy to Clipboard
                            </button>
                            <button
                                className="action-button download-button"
                                onClick={handleDownload}
                            >
                                Download .lrc
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Select a song from the list to view lyrics</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricFetcher;
