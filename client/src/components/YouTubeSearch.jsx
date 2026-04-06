import React, { useState } from 'react';
import MarqueeTitle from './MarqueeTitle';
import VideoTrimmer from './VideoTrimmer';

const YouTubeSearch = ({ addToQueue, queuedVideos, externalSelectedVideo }) => {
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
        let downloadUrl = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&embedThumbnail=${embedThumbnail}`;

        // Only add trim parameters if user has actually trimmed the video and values are valid
        const hasValidTrim = trimRange.endTime > 0 &&
            trimRange.startTime < trimRange.endTime &&
            (trimRange.startTime > 0 || trimRange.endTime < (videoInfo?.duration || Infinity));

        if (hasValidTrim) {
            downloadUrl += `&startTime=${trimRange.startTime}&endTime=${trimRange.endTime}`;
        }

        console.log('Downloading with URL:', downloadUrl);
        window.location.href = downloadUrl;
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
        if (!video) return;
        setLoadingRecs(true);
        try {
            const res = await fetch(`http://localhost:3001/api/ytdl/related?id=${encodeURIComponent(video.id)}&channel=${encodeURIComponent(video.channel)}`);
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
                    className="input input-bordered input-primary flex-1 shadow-sm"
                    placeholder="Search YouTube..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary shadow-md shadow-primary/20" disabled={loading}>
                    {loading ? <span className="loading loading-spinner"></span> : 'Search'}
                </button>
            </form>

            {error && <div className="alert alert-error max-w-2xl mx-auto shadow-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
            </div>}

            <div className="flex-1 overflow-hidden flex min-h-0 bg-base-200/30 rounded-3xl border border-white/5 p-4 shadow-inner">
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
                                            <img src={video.thumbnail} alt={video.title} className="w-full object-cover" />
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
                                <span className="text-sm font-medium text-base-content/70">Page {currentPage} of {totalPages}</span>
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

                    const handleVideoDownload = (type) => {
                        handleDownload(type, videoUrl);
                    };

                    return (
                        <>
                            <div className="flex flex-col gap-6 w-full h-full min-h-0 overflow-y-auto custom-scrollbar pr-2 mt-4">
                                <div className="flex flex-col lg:flex-row gap-6 w-full shrink-0">
                                    {/* LEFT: MEDIA SIDE */}
                                    <div className="w-full lg:w-1/2 flex flex-col gap-4">
                                        <div className="card bg-black shadow-2xl border border-white/10 overflow-hidden w-full aspect-video rounded-2xl relative">
                                            {videoId ? (
                                                <iframe
                                                    width="100%" height="100%"
                                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
                                                    title="YouTube video player"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="absolute inset-0"
                                                ></iframe>
                                            ) : (
                                                <figure className="h-full w-full">
                                                    <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-full h-full object-contain" />
                                                </figure>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-3 bg-base-300/50 p-5 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base-content/60 font-semibold">Watch on YouTube</span>
                                                <a href={videoUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-info shadow-md shadow-info/20">
                                                    Open Link ↗
                                                </a>
                                            </div>
                                            {(() => {
                                                const fullVideo = {
                                                    id: videoInfo.id,
                                                    title: videoInfo.title,
                                                    url: videoUrl,
                                                    thumbnail: videoInfo.thumbnail,
                                                    duration: videoInfo.duration,
                                                    channel: videoInfo.channel
                                                };
                                                const inQueue = queuedVideos.find(v => v.id === videoInfo.id);
                                                return (
                                                    <button
                                                        className={`btn w-full shadow-md ${inQueue ? 'btn-success text-white pointer-events-none' : 'btn-outline btn-primary'}`}
                                                        onClick={() => addToQueue(fullVideo)}
                                                    >
                                                        {inQueue ? '✓ Added to Queue' : '+ Add to Download Queue'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* RIGHT: METADATA & ACTIONS */}
                                    <div className="w-full lg:w-1/2 flex flex-col h-fit">
                                        <div className="card w-full bg-base-300 shadow-2xl overflow-hidden border border-white/5">
                                            <div className="card-body px-6 md:px-8 py-8">
                                                <h2 className="card-title text-2xl text-white mb-0 leading-tight">{videoInfo.title}</h2>
                                                <p className="text-base-content/70 font-bold m-0 mt-1 text-lg">{videoInfo.channel}</p>

                                                {videoInfo.duration && (
                                                    <div className="badge badge-primary badge-outline mt-3 px-3 py-3 font-mono font-bold text-sm">
                                                        Length: {new Date(videoInfo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                                                    </div>
                                                )}

                                                <div className="divider opacity-30 my-6">Download Options</div>

                                                <label className="label cursor-pointer justify-center gap-3 hover:bg-white/5 p-3 rounded-xl transition-colors w-full border border-base-100 bg-base-100/30">
                                                    <span className="label-text text-base font-semibold">Embed Thumbnail (Audio)</span>
                                                    <input
                                                        type="checkbox"
                                                        className="toggle toggle-primary toggle-md"
                                                        checked={embedThumbnail}
                                                        onChange={e => setEmbedThumbnail(e.target.checked)}
                                                    />
                                                </label>

                                                {videoInfo.duration && (
                                                    <VideoTrimmer
                                                        duration={videoInfo.duration}
                                                        onTrimChange={setTrimRange}
                                                    />
                                                )}

                                                <div className="card-actions flex-col sm:flex-row justify-center gap-3 mt-6 w-full">
                                                    <button className="btn btn-neutral flex-1 py-3 h-auto" onClick={() => handleVideoDownload('video')}>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold">MP4</span>
                                                            <span className="text-[0.65rem] opacity-60">High Quality Video</span>
                                                        </div>
                                                    </button>
                                                    <button className="btn btn-secondary shadow-lg shadow-secondary/20 flex-1 py-3 h-auto" onClick={() => handleVideoDownload('audio')}>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold">MP3</span>
                                                            <span className="text-[0.65rem] opacity-80">Standard Audio</span>
                                                        </div>
                                                    </button>
                                                    <button className="btn btn-primary shadow-lg shadow-primary/20 flex-1 py-3 h-auto" onClick={() => handleVideoDownload('opus')}>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-white">Opus</span>
                                                            <span className="text-[0.65rem] text-white/80">Highest Quality Audio</span>
                                                        </div>
                                                    </button>
                                                </div>

                                                <button className="btn btn-ghost mt-8 text-base-content/50 hover:text-white w-full" onClick={() => setVideoInfo(null)}>
                                                    ← Back to Search Results
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations Section - Now under both */}
                                {recommendations.length > 0 && (
                                    <div className="w-full mt-2 pb-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="text-xl font-bold text-white">Similar Videos</h3>
                                            {loadingRecs && <span className="loading loading-spinner loading-sm"></span>}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                            {recommendations.map(video => {
                                                const inQueue = queuedVideos.find(v => v.id === video.id);
                                                return (
                                                    <div key={video.id} className="card bg-base-300 shadow-xl cursor-pointer hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/50 border border-transparent transition-all duration-300 overflow-hidden group" onClick={() => selectVideo(video)}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToQueue({
                                                                    id: video.id,
                                                                    title: video.title,
                                                                    url: video.url,
                                                                    thumbnail: video.thumbnail,
                                                                    duration: video.duration,
                                                                    channel: video.channel
                                                                });
                                                            }}
                                                            className={`absolute top-2 right-2 btn btn-circle btn-sm z-10 ${inQueue ? 'btn-success text-white pointer-events-none' : 'btn-neutral opacity-0 group-hover:opacity-100'}`}
                                                            title={inQueue ? "In Queue" : "Add to Download Queue"}
                                                        >
                                                            {inQueue ? '✓' : '+'}
                                                        </button>
                                                        <figure className="aspect-video relative">
                                                            <img src={video.thumbnail} alt={video.title} className="w-full object-cover" />
                                                            {video.duration ? <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-mono">{new Date(video.duration * 1000).toISOString().substr(14, 5)}</div> : null}
                                                        </figure>
                                                        <div className="px-3 py-2">
                                                            <MarqueeTitle text={video.title} className="font-bold text-sm text-white" />
                                                            <p className="text-xs text-base-content/60 truncate mt-0.5">{video.channel}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </>
                    );
                })()}
            </div>
        </div>
    );
};

export default YouTubeSearch;
