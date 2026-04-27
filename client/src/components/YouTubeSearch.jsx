import React, { useState } from 'react';
import MarqueeTitle from './MarqueeTitle';
import VideoTrimmer from './VideoTrimmer';
import VideoView from './VideoView';
import { Search } from 'lucide-react';

const YouTubeSearch = ({ addToQueue, queuedVideos, externalSelectedVideo, triggerDownload }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState(null);
    const [cookieStatus, setCookieStatus] = useState(false);
    const [browserCookie, setBrowserCookie] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [embedThumbnail, setEmbedThumbnail] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [trimRange, setTrimRange] = useState({ startTime: 0, endTime: 0 });
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const ITEMS_PER_PAGE = 8;

    const fetchStatus = () => {
        fetch('http://localhost:3001/api/ytdl/status')
            .then(res => res.json())
            .then(data => {
                setCookieStatus(data.cookiesFound);
                setBrowserCookie(data.browserCookie || '');
            })
            .catch(err => console.error("Failed to check cookies", err));
    };

    React.useEffect(() => {
        fetchStatus();
    }, []);

    React.useEffect(() => {
        if (externalSelectedVideo) {
            selectVideo(externalSelectedVideo);
        }
    }, [externalSelectedVideo]);

    // Clear recommendations when changing views
    React.useEffect(() => {
        if (!videoInfo) {
            setRecommendations([]);
        }
    }, [videoInfo]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            try {
                await fetch('http://localhost:3001/api/ytdl/cookie_settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cookieText: text })
                });
                fetchStatus();
                alert('Cookies updated successfully!');
            } catch (err) {
                alert('Failed to upload cookies');
            }
            setUploading(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const handleBrowserChange = async (e) => {
        const browser = e.target.value;
        setUploading(true);
        try {
            await fetch('http://localhost:3001/api/ytdl/cookie_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browser })
            });
            fetchStatus();
        } catch (err) {
            alert('Failed to update browser setting');
        }
        setUploading(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        setError(null);
        setVideoInfo(null);
        setSearchResults([]);
        setCurrentPage(1);

        try {
            const res = await fetch(`http://localhost:3001/api/ytdl/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to search YouTube.');
            setSearchResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (type, url = query) => {
        if (!url) return;

        // Only add trim parameters if user has actually trimmed the video and values are valid
        const hasValidTrim = trimRange.endTime > 0 &&
            trimRange.startTime < trimRange.endTime &&
            (trimRange.startTime > 0 || trimRange.endTime < (videoInfo?.duration || Infinity));

        const options = {
            embedThumbnail,
            startTime: hasValidTrim ? trimRange.startTime : undefined,
            endTime: hasValidTrim ? trimRange.endTime : undefined
        };

        triggerDownload(url, type, options);
    };

    const selectVideo = (video) => {
        setVideoInfo({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            channel: video.channel
        });

        // Fetch recommendations
        fetchRecommendations(video);
    };

    const fetchRecommendations = async (video) => {
        if (!video || !video.id) return;
        setLoadingRecs(true);
        try {
            const channel = video.channel || '';
            const res = await fetch(`http://localhost:3001/api/ytdl/related?id=${encodeURIComponent(video.id)}&channel=${encodeURIComponent(channel)}`);
            const data = await res.json();
            if (res.ok) {
                // Filter out the current video from recommendations
                const filtered = data.filter(v => v.id !== video.id);
                setRecommendations(filtered.slice(0, 12));
            }
        } catch (err) {
            console.error('Failed to fetch recommendations:', err);
        } finally {
            setLoadingRecs(false);
        }
    };

    const handleAddToQueue = (e, video) => {
        e.stopPropagation();
        addToQueue(video);
    };

    const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
    const currentResults = searchResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col h-full flex-1 min-h-0 animate-fade-in gap-4">
            <div className="text-center shrink-0">
                <button
                    className={`badge badge-lg gap-2 cursor-pointer hover:scale-105 transition-transform ${cookieStatus || browserCookie ? 'badge-success badge-outline' : 'badge-neutral'}`}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    {browserCookie ? `🍪 Browser Cookies: ${browserCookie}` : (cookieStatus ? '🍪 Premium/Cookies Detected' : '⚪ No Cookies Detected')} ⚙️
                </button>
            </div>

            {showSettings && (
                <div className="max-w-2xl mx-auto w-full p-6 bg-base-300/50 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col gap-4 shadow-xl">
                    <h4 className="text-xl font-bold text-white m-0">Cookie Settings</h4>
                    <p className="text-sm text-base-content/70 m-0">
                        Providing cookies allows downloading age-restricted or premium content in the highest quality.
                    </p>
                    <div className="flex flex-wrap gap-6 items-end">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                            <label className="text-sm font-semibold text-white">Upload cookies.txt</label>
                            <input type="file" className="file-input file-input-bordered file-input-primary w-full max-w-xs" accept=".txt" onChange={handleFileUpload} disabled={uploading} />
                        </div>
                        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                            <label className="text-sm font-semibold text-white">Or Use Browser Cookies</label>
                            <select className="select select-bordered select-primary w-full" value={browserCookie} onChange={handleBrowserChange} disabled={uploading}>
                                <option value="">-- None --</option>
                                <option value="chrome">Chrome</option>
                                <option value="edge">Edge</option>
                                <option value="firefox">Firefox</option>
                                <option value="zen">Zen Browser</option>
                                <option value="brave">Brave</option>
                                <option value="opera">Opera</option>
                                <option value="safari">Safari</option>
                                <option value="vivaldi">Vivaldi</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto w-full flex gap-2 shrink-0 px-2">
                <input
                    type="text"
                    className="input input-bordered input-primary flex-1 shadow-sm text-lg py-2 h-auto"
                    placeholder="Search YouTube..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-lg shadow-md shadow-primary/20" disabled={loading}>
                    {loading ? <span className="loading loading-spinner"></span> : 'Search'}
                </button>
            </form>

            {error && <div className="alert alert-error max-w-2xl mx-auto shadow-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
            </div>}

            <div className={`flex-1 overflow-hidden flex min-h-0 bg-base-200/30 rounded-3xl border border-white/5 shadow-inner ${(searchResults.length > 0 || videoInfo) ? 'p-4' : 'p-0 border-none bg-transparent'}`}>
                {searchResults.length === 0 && !videoInfo && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="max-w-md">
                            <Search className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Search YouTube</h3>
                            <p className="text-base-content/60">Enter keywords above to find videos, music, and more</p>
                        </div>
                    </div>
                )}
                {searchResults.length > 0 && !videoInfo && (
                    <div className="flex flex-col h-full flex-1 overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4 pt-2">
                            {currentResults.map(video => {
                                const inQueue = queuedVideos.find(v => v.id === video.id);
                                return (
                                    <div key={video.id} className="card bg-base-300 shadow-xl cursor-pointer hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/50 border border-transparent transition-all duration-300 overflow-hidden group" onClick={() => selectVideo(video)}>
                                        <button
                                            onClick={(e) => handleAddToQueue(e, video)}
                                            className={`absolute top-2 right-2 btn btn-circle btn-sm z-10 ${inQueue ? 'btn-success text-white pointer-events-none' : 'btn-neutral opacity-0 group-hover:opacity-100'}`}
                                            title={inQueue ? "In Queue" : "Add to Download Queue"}
                                        >
                                            {inQueue ? '✓' : '+'}
                                        </button>
                                        <figure className="aspect-video relative">
                                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                            {video.duration ? <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-mono">{new Date(video.duration * 1000).toISOString().substr(14, 5)}</div> : null}
                                        </figure>
                                        <div className="px-3 py-2 flex flex-col justify-center">
                                            <MarqueeTitle text={video.title} className="font-bold text-sm text-white w-full" />
                                            <p className="text-xs text-base-content/60 truncate mt-0.5 w-full">{video.channel}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-4 pt-2 pb-2 shrink-0 border-t border-white/5">
                                <button
                                    className="btn btn-sm btn-outline btn-primary"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-base-content/70">Page {currentPage} of {totalPages} ({searchResults.length} items)</span>
                                <button
                                    className="btn btn-sm btn-outline btn-primary"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {videoInfo && (() => {
                    const videoUrl = typeof query === 'string' && query.includes('youtube.com') ? query : `https://www.youtube.com/watch?v=${videoInfo.id}`;
                    const videoId = videoInfo.id || videoUrl.match(/[?&]v=([^&]+)/)?.[1] || videoUrl.match(/youtu\.be\/([^?]+)/)?.[1];

                    return (
                        <VideoView
                            activeVideo={videoInfo}
                            activeVideoUrl={videoUrl}
                            videoId={videoId}
                            handleDownload={handleDownload}
                            embedThumbnail={embedThumbnail}
                            setEmbedThumbnail={setEmbedThumbnail}
                            trimRange={trimRange}
                            setTrimRange={setTrimRange}
                            addToQueue={addToQueue}
                            queuedVideos={queuedVideos}
                            onBackToPlaylist={() => setVideoInfo(null)}
                            recommendations={recommendations}
                            onRecommendationClick={(video) => selectVideo(video)}
                            backButtonText="Back to Search"
                        />
                    );
                })()}
            </div>
        </div>
    );
};

export default YouTubeSearch;
