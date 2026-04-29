import React, { useState } from 'react';

const LyricFetcher = ({ queuedVideos = [], onAssignLyrics }) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedLyrics, setSelectedLyrics] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [error, setError] = useState(null);
    const [showQueuePicker, setShowQueuePicker] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoadingSearch(true);
        setError(null);
        setSearchResults([]);
        setSelectedLyrics(null);

        try {
            const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`);
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
            const urlParam = song.source === 'Genius' && song.url ? `&url=${encodeURIComponent(song.url)}` : '';
            const response = await fetch(`http://localhost:3001/api/lyrics?id=${song.id}&source=${song.source}${urlParam}`);
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

    const handleAssignToVideo = (videoId) => {
        const lrcContent = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
        const payload = {
            title: `${selectedLyrics.song} - ${selectedLyrics.artist}`,
            raw: lrcContent
        };
        onAssignLyrics(videoId, payload);
        setShowQueuePicker(false);
        alert('Lyrics assigned to video!');
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full min-h-0 animate-fade-in w-full">
            {/* LEFT PANEL: SEARCH & LIST */}
            <div className={`w-full md:w-1/3 flex-col gap-4 bg-base-200/40 border border-white/5 rounded-[2rem] p-4 md:p-5 shadow-inner shrink-0 ${selectedLyrics ? 'hidden md:flex' : 'flex'}`}>
                <form onSubmit={handleSearch} className="flex gap-2 w-full shrink-0">
                    <input
                        type="text"
                        className="input input-bordered input-primary flex-1 shadow-sm"
                        placeholder="Enter song title..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary shadow-md shadow-primary/20" disabled={loadingSearch}>
                        {loadingSearch ? <span className="loading loading-spinner loading-sm"></span> : 'Search'}
                    </button>
                </form>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
                    {error && <div className="alert alert-error text-sm shadow-md shrink-0 py-2">{error}</div>}

                    {searchResults.length === 0 && !loadingSearch && (
                        <div className="text-center text-base-content/50 italic mt-10">
                            Search for a song to see results here.
                        </div>
                    )}

                    {searchResults.map((song) => (
                        <div
                            key={`${song.source}-${song.id}`}
                            className="bg-base-300/50 hover:bg-base-300 border border-transparent hover:border-primary/50 transition-all duration-200 rounded-xl p-3 cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-primary/10"
                            onClick={() => handleSelectSong(song)}
                        >
                            <div className="flex-1 min-w-0 pr-3">
                                <div className="font-bold text-white text-md truncate group-hover:text-primary transition-colors">{song.name}</div>
                                <div className="text-sm text-base-content/70 truncate">{song.artist}</div>
                                <div className="text-xs text-base-content/50 truncate mt-1">{song.album}</div>
                            </div>
                            <div className="shrink-0 flex items-center">
                                <span className={`badge badge-sm uppercase font-bold tracking-wider ${song.source.toLowerCase() === 'netease' ? 'badge-error badge-outline' : 'badge-success badge-outline'}`}>
                                    {song.source}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: LYRICS DISPLAY */}
            <div className={`w-full md:w-2/3 flex-col bg-base-300/80 backdrop-blur-md rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden relative ${!selectedLyrics && !loadingLyrics ? 'hidden md:flex' : 'flex'}`}>
                {loadingLyrics ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base-300/50 backdrop-blur-sm z-10 transition-all">
                        <span className="loading loading-ring loading-lg text-primary"></span>
                        <p className="font-medium text-primary tracking-widest animate-pulse">Fetching & Converting Lyrics...</p>
                    </div>
                ) : selectedLyrics ? (
                    <div
                        className="flex flex-col h-full items-center p-4 md:p-6 animate-fade-in relative group"
                        draggable
                        onDragStart={(e) => {
                            const lrcContent = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
                            const payload = {
                                title: `${selectedLyrics.song} - ${selectedLyrics.artist}`,
                                raw: lrcContent
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(payload));
                            e.dataTransfer.effectAllowed = 'copy';
                        }}
                        style={{ cursor: 'grab' }}
                        title="Drag me into a video in your Download Queue!"
                    >
                        <div className="w-full flex justify-between items-start mb-2 md:mb-0 shrink-0">
                            <button
                                className="btn btn-ghost btn-sm md:hidden text-base-content/60"
                                onClick={() => setSelectedLyrics(null)}
                            >
                                ← Back
                            </button>
                            <div className="hidden md:flex absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 text-primary px-3 py-1 text-xs rounded-full font-bold items-center gap-2">
                                <span className="animate-bounce">↑</span> Drag to Queue
                            </div>
                        </div>

                        <div className="text-center border-b border-white/10 pb-4 w-full shrink-0 mt-2 md:mt-0">
                            <h2 className="text-2xl md:text-3xl font-bold text-white m-0 tracking-tight">{selectedLyrics.song}</h2>
                            <h3 className="text-md md:text-lg text-base-content/70 m-0 mt-1">{selectedLyrics.artist}</h3>
                            <div className="mt-3 flex flex-col items-center gap-2">
                                <span className="badge badge-neutral shadow-sm">Source: {selectedLyrics.source}</span>
                                <p className="text-xs font-semibold text-secondary animate-pulse m-0 bg-secondary/10 px-3 py-1 rounded-full">
                                    ✨ Drag this card into your queue to embed! ✨
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 w-full overflow-y-auto px-4 py-6 text-center text-lg leading-relaxed relative custom-scrollbar">
                            {selectedLyrics.lyrics.map((line, index) => (
                                <div key={index} className="mb-6 hover:bg-white/5 rounded-lg py-1 transition-colors">
                                    {line.romaji && <div className="text-primary font-medium">{line.romaji}</div>}
                                    {line.original && <div className="text-white/90 text-xl font-bold">{line.original}</div>}
                                    {!line.original && !line.romaji && <div className="h-6"></div>}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2 w-full shrink-0 justify-center pt-4 border-t border-white/10">
                            <button
                                className="btn btn-outline btn-sm md:btn-md hover:text-white"
                                onClick={() => navigator.clipboard.writeText(selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n'))}
                            >
                                Copy
                            </button>

                            {queuedVideos.length > 0 && (
                                <button
                                    className="btn btn-secondary btn-sm md:btn-md shadow-lg shadow-secondary/20"
                                    onClick={() => setShowQueuePicker(true)}
                                >
                                    Apply to Queue
                                </button>
                            )}

                            <button
                                className="btn btn-primary btn-sm md:btn-md shadow-lg shadow-primary/20"
                                onClick={handleDownload}
                            >
                                Download .lrc
                            </button>
                        </div>

                        {/* MOBILE QUEUE PICKER OVERLAY */}
                        {showQueuePicker && (
                            <div className="absolute inset-0 bg-base-300/95 backdrop-blur-md z-50 flex flex-col p-6 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Select Video</h3>
                                    <button className="btn btn-circle btn-ghost" onClick={() => setShowQueuePicker(false)}>×</button>
                                </div>
                                <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                                    {queuedVideos.map(video => (
                                        <div
                                            key={video.id}
                                            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer transition-colors border border-white/5 hover:border-primary/50"
                                            onClick={() => handleAssignToVideo(video.id)}
                                        >
                                            <img src={video.thumbnail} alt="" className="w-16 h-10 object-cover rounded-md" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-sm truncate">{video.title}</div>
                                                <div className="text-xs text-base-content/60">{video.channel}</div>
                                            </div>
                                            {video.lyricsPayload && <span className="badge badge-primary badge-xs">Has Lyrics</span>}
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-neutral mt-6" onClick={() => setShowQueuePicker(false)}>Cancel</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-base-content/40 italic">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19.5V15a2.25 2.25 0 012.25-2.25H15M9 19.5a2.25 2.25 0 002.25 2.25H15M9 19.5L5.25 15.75M15 21.75a2.25 2.25 0 002.25-2.25V15a2.25 2.25 0 00-2.25-2.25h-3.75" />
                        </svg>
                        <p>Select a song from the list to view lyrics</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricFetcher;
