import React, { useState } from 'react';
import VideoTrimmer from './VideoTrimmer';
import MarqueeTitle from './MarqueeTitle';

const YouTubeFetcher = ({ addToQueue, queuedVideos }) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState(null);
    const [cookieStatus, setCookieStatus] = useState(false);
    const [browserCookie, setBrowserCookie] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [embedThumbnail, setEmbedThumbnail] = useState(false);
    const [trimRange, setTrimRange] = useState({ startTime: 0, endTime: 0 });

    const [playlistSelectedVideo, setPlaylistSelectedVideo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
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

    const handleInspect = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!url) return;
        setLoading(true);
        setError(null);
        setVideoInfo(null);
        setPlaylistSelectedVideo(null);
        setCurrentPage(1);
        try {
            const res = await fetch('http://localhost:3001/api/ytdl/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch info. Ensure URL is valid.');
            setVideoInfo(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (type, currentVideoUrl = url, currentVideoInfo = videoInfo) => {
        if (!currentVideoUrl) return;
        let downloadUrl = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(currentVideoUrl)}&type=${type}&embedThumbnail=${embedThumbnail}`;

        const hasValidTrim = trimRange.endTime > 0 &&
                            trimRange.startTime < trimRange.endTime &&
                            (trimRange.startTime > 0 || trimRange.endTime < (currentVideoInfo?.duration || Infinity));

        if (hasValidTrim) {
            downloadUrl += `&startTime=${trimRange.startTime}&endTime=${trimRange.endTime}`;
        }

        console.log('Downloading with URL:', downloadUrl);
        window.location.href = downloadUrl;
    };

    const handleVideoClick = (video) => {
        setPlaylistSelectedVideo({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            channel: video.channel,
            url: video.url || `https://www.youtube.com/watch?v=${video.id}`
        });
    };

    const isShowingPlaylist = videoInfo && videoInfo.isPlaylist && !playlistSelectedVideo;
    const isShowingVideo = (videoInfo && !videoInfo.isPlaylist) || playlistSelectedVideo;
    const activeVideo = playlistSelectedVideo || videoInfo;
    const activeVideoUrl = playlistSelectedVideo ? playlistSelectedVideo.url : url;

    const totalPages = videoInfo && videoInfo.isPlaylist ? Math.ceil(videoInfo.videos.length / ITEMS_PER_PAGE) : 0;
    const currentResults = videoInfo && videoInfo.isPlaylist ? videoInfo.videos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : [];

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
                <div className="max-w-2xl mx-auto w-full p-6 bg-base-300/50 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col gap-4 shadow-xl shrink-0">
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

            <form onSubmit={handleInspect} className="max-w-2xl mx-auto w-full flex gap-2 shrink-0 px-2">
                <input
                    type="text"
                    className="input input-bordered input-primary flex-1 shadow-sm text-lg py-2 h-auto"
                    placeholder="Paste YouTube Link here..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-lg shadow-md shadow-primary/20" disabled={loading}>
                    {loading ? <span className="loading loading-spinner"></span> : 'Check'}
                </button>
            </form>

            {error && (
                <div className="alert alert-error max-w-2xl mx-auto shadow-lg shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                </div>
            )}

            <div className={`flex-1 overflow-hidden flex min-h-0 bg-base-200/30 rounded-3xl border border-white/5 shadow-inner ${videoInfo ? 'p-4' : 'p-0 border-none bg-transparent'}`}>
                {isShowingPlaylist && (
                    <div className="flex flex-col h-full flex-1 overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4 pt-2">
                            {currentResults.map(video => {
                                const inQueue = queuedVideos && queuedVideos.find(v => v.id === video.id);
                                return (
                                    <div key={video.id} className="card bg-base-300 shadow-xl cursor-pointer hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/50 border border-transparent transition-all duration-300 overflow-hidden group" onClick={() => handleVideoClick(video)}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if(addToQueue) addToQueue({...video, url: video.url || `https://www.youtube.com/watch?v=${video.id}`}); }}
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

                {isShowingVideo && (() => {
                    const videoId = activeVideoUrl.match(/[?&]v=([^&]+)/)?.[1] || activeVideoUrl.match(/youtu\.be\/([^?]+)/)?.[1] || activeVideo.id;
                    const handleVideoDownload = (type) => handleDownload(type, activeVideoUrl, activeVideo);

                    return (
                        <div className="flex flex-col lg:flex-row gap-6 w-full h-full min-h-0 overflow-y-auto custom-scrollbar pr-2 mt-4">
                            {/* LEFT: MEDIA SIDE */}
                            <div className="w-full lg:w-1/2 flex flex-col gap-4 shrink-0">
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
                                            <img src={activeVideo.thumbnail} alt={activeVideo.title} className="w-full h-full object-contain" />
                                        </figure>
                                    )}
                                </div>
                                <div className="flex flex-col gap-3 bg-base-300/50 p-5 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base-content/60 font-semibold">Watch on YouTube</span>
                                        <a href={activeVideoUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-info shadow-md shadow-info/20">
                                            Open Link ↗
                                        </a>
                                    </div>
                                    {addToQueue && queuedVideos && (() => {
                                        const fullVideo = {
                                            id: videoId || activeVideo.id,
                                            title: activeVideo.title,
                                            url: activeVideoUrl,
                                            thumbnail: activeVideo.thumbnail,
                                            duration: activeVideo.duration,
                                            channel: activeVideo.channel
                                        };
                                        const inQueue = queuedVideos.find(v => v.id === fullVideo.id);
                                        return (
                                            <button
                                                className={`btn w-full shadow-md ${inQueue ? 'btn-success text-white pointer-events-none' : 'btn-outline btn-primary'}`}
                                                onClick={() => addToQueue(fullVideo)}
                                                disabled={!fullVideo.id}
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
                                        <h2 className="card-title text-2xl text-white mb-0 leading-tight">{activeVideo.title}</h2>
                                        <p className="text-base-content/70 font-bold m-0 mt-1 text-lg">{activeVideo.channel}</p>

                                        {activeVideo.duration && (
                                            <div className="badge badge-primary badge-outline mt-3 px-3 py-3 font-mono font-bold text-sm">
                                                Length: {new Date(activeVideo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
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

                                        {activeVideo.duration && (
                                            <VideoTrimmer
                                                duration={activeVideo.duration}
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

                                        {videoInfo && videoInfo.isPlaylist && playlistSelectedVideo && (
                                            <button className="btn btn-ghost mt-8 text-base-content/50 hover:text-white" onClick={() => setPlaylistSelectedVideo(null)}>
                                                ← Back to Playlist
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default YouTubeFetcher;
