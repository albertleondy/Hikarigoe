import React, { useState } from 'react';

const YouTubeSearch = ({ addToQueue, queuedVideos }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState(null);
    const [cookieStatus, setCookieStatus] = useState(false);
    const [embedThumbnail, setEmbedThumbnail] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    React.useEffect(() => {
        fetch('http://localhost:3001/api/ytdl/status')
            .then(res => res.json())
            .then(data => setCookieStatus(data.cookiesFound))
            .catch(err => console.error("Failed to check cookies", err));
    }, []);

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
        window.location.href = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&embedThumbnail=${embedThumbnail}`;
    };

    const selectVideo = (video) => {
        setVideoInfo({
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            channel: video.channel
        });
        setQuery(video.url);
    };

    const handleAddToQueue = (e, video) => {
        e.stopPropagation();
        addToQueue(video);
    };

    const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
    const currentResults = searchResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="youtube-fetcher-container fadeIn" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
            <div className="status-bar" style={{ textAlign: 'center', marginBottom: '10px', flexShrink: 0 }}>
                <span className={`cookie-badge ${cookieStatus ? 'active' : 'inactive'}`}>
                    {cookieStatus ? '🍪 Premium/Cookies Detected' : '⚪ No Cookies Detected'}
                </span>
            </div>

            <form onSubmit={handleSearch} className="search-form" style={{ maxWidth: '600px', margin: '0 auto 20px auto', width: '100%', flexShrink: 0 }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search YouTube..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="search-button" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && <div className="error-message" style={{ textAlign: 'center', flexShrink: 0 }}>{error}</div>}

            <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {searchResults.length > 0 && !videoInfo && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' }}>
                            <div className="search-results" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                gap: '15px',
                                width: '100%',
                                margin: '0',
                                overflowY: 'auto',
                                paddingRight: '5px'
                            }}>
                                {currentResults.map(video => {
                                    const inQueue = queuedVideos.find(v => v.id === video.id);
                                    return (
                                        <div key={video.id} className="yt-search-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => selectVideo(video)}>
                                            <button
                                                onClick={(e) => handleAddToQueue(e, video)}
                                                style={{
                                                    position: 'absolute', top: '15px', right: '15px',
                                                    background: inQueue ? 'rgba(46,204,113,0.8)' : 'rgba(0,0,0,0.6)',
                                                    color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '50%', width: '30px', height: '30px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: inQueue ? 'default' : 'pointer', zIndex: 2, fontSize: '18px',
                                                    paddingBottom: '2px', transition: 'all 0.2s ease',
                                                    pointerEvents: inQueue ? 'none' : 'auto'
                                                }}
                                                title={inQueue ? "In Queue" : "Add to Download Queue"}
                                                onMouseEnter={e => { if (!inQueue) { e.target.style.background = 'rgba(127,90,240,0.8)'; e.target.style.transform = 'scale(1.1)'; } }}
                                                onMouseLeave={e => { if (!inQueue) { e.target.style.background = 'rgba(0,0,0,0.6)'; e.target.style.transform = 'scale(1)'; } }}
                                            >
                                                {inQueue ? '✓' : '+'}
                                            </button>
                                            <img src={video.thumbnail} alt={video.title} style={{ width: '100%', borderRadius: '8px', aspectRatio: '16/9', objectFit: 'cover', marginBottom: '10px' }} />
                                            <div style={{ padding: '0 5px' }}>
                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>
                                                    {video.title}
                                                </h4>
                                                <p style={{ margin: '0', fontSize: '0.8rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.channel}</p>
                                                {video.duration ? <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#777' }}>{new Date(video.duration * 1000).toISOString().substr(14, 5)}</p> : null}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px', paddingBottom: '10px', flexShrink: 0 }}>
                                    <button
                                        className="action-button"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        style={{ padding: '8px 16px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Page {currentPage} of {totalPages}</span>
                                    <button
                                        className="action-button"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        style={{ padding: '8px 16px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {videoInfo && (
                        <div className="yt-card glass-card" style={{ maxWidth: '600px', margin: '0 auto', flexDirection: 'column', padding: '20px', alignItems: 'center', overflowY: 'auto', flex: 1 }}>
                            <img src={videoInfo.thumbnail} alt={videoInfo.title} className="yt-thumbnail" style={{ maxHeight: '250px', objectFit: 'contain' }} />

                            <h3 className="yt-title">{videoInfo.title}</h3>
                            <p className="yt-channel">{videoInfo.channel}</p>

                            {videoInfo.duration && (
                                <p className="yt-duration">
                                    Length: {new Date(videoInfo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                                </p>
                            )}

                            <div className="options-container" style={{ marginTop: '15px' }}>
                                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#b3b3b3' }}>
                                    <input
                                        type="checkbox"
                                        checked={embedThumbnail}
                                        onChange={e => setEmbedThumbnail(e.target.checked)}
                                    />
                                    Embed Thumbnail (Audio)
                                </label>
                            </div>

                            <div className="button-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                                <button className="action-button" onClick={() => handleDownload('video')}>
                                    Download Video (MP4)
                                </button>
                                <button className="action-button download-button" onClick={() => handleDownload('audio')}>
                                    Download Audio (MP3)
                                </button>
                                <button className="action-button" onClick={() => handleDownload('opus')}>
                                    Download Audio (Opus)
                                </button>
                            </div>
                            <button className="secondary-button" style={{ marginTop: '20px', background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setVideoInfo(null)}>
                                Back to Search Results
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubeSearch;
