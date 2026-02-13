import React, { useState } from 'react';

const YouTubeFetcher = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState(null);
    const [cookieStatus, setCookieStatus] = useState(false);
    const [embedThumbnail, setEmbedThumbnail] = useState(false);
    const [embedRomajiLyrics, setEmbedRomajiLyrics] = useState(false);

    React.useEffect(() => {
        fetch('http://localhost:3001/api/ytdl/status')
            .then(res => res.json())
            .then(data => setCookieStatus(data.cookiesFound))
            .catch(err => console.error("Failed to check cookies", err));
    }, []);

    const handleInspect = async (e) => {
        e.preventDefault();
        if (!url) return;
        setLoading(true);
        setError(null);
        setVideoInfo(null);
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

    const handleDownload = (type) => {
        if (!url) return;
        window.location.href = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&embedThumbnail=${embedThumbnail}&embedRomajiLyrics=${embedRomajiLyrics}`;
    };

    return (
        <div className="youtube-fetcher-container fadeIn">
            <div className="status-bar" style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span className={`cookie-badge ${cookieStatus ? 'active' : 'inactive'}`}>
                    {cookieStatus ? '🍪 Premium/Cookies Detected' : '⚪ No Cookies Detected'}
                </span>
            </div>

            <form onSubmit={handleInspect} className="search-form" style={{ maxWidth: '600px', margin: '0 auto 30px auto' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Paste YouTube Link here..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <button type="submit" className="search-button" disabled={loading}>
                    {loading ? 'Checking...' : 'Check'}
                </button>
            </form>

            {error && <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>}

            {videoInfo && (
                <div className="yt-card glass-card" style={{ maxWidth: '600px', margin: '0 auto', flexDirection: 'column', padding: '20px', alignItems: 'center' }}>
                    <img src={videoInfo.thumbnail} alt={videoInfo.title} className="yt-thumbnail" />

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
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#b3b3b3', marginLeft: '20px' }}>
                            <input
                                type="checkbox"
                                checked={embedRomajiLyrics}
                                onChange={e => setEmbedRomajiLyrics(e.target.checked)}
                            />
                            Embed Romaji Lyrics (MP3/Opus)
                        </label>
                    </div>

                    <div className="button-group" style={{ marginTop: '20px' }}>
                        <button className="action-button" onClick={() => handleDownload('video')}>
                            Download Video (MP4)
                        </button>
                        <button className="action-button download-button" onClick={() => handleDownload('audio')}>
                            Download Audio (MP3)
                        </button>
                        <button className="action-button download-button" onClick={() => handleDownload('opus')}>
                            Download Audio (Opus)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YouTubeFetcher;
