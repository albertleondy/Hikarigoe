import React, { useState } from 'react';

const YouTubeFetcher = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState(null);
    const [cookieStatus, setCookieStatus] = useState(false);
    const [browserCookie, setBrowserCookie] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [embedThumbnail, setEmbedThumbnail] = useState(false);

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
        window.location.href = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&embedThumbnail=${embedThumbnail}`;
    };

    return (
        <div className="youtube-fetcher-container fadeIn">
            <div className="status-bar" style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span className={`cookie-badge ${cookieStatus || browserCookie ? 'active' : 'inactive'}`} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }} onClick={() => setShowSettings(!showSettings)}>
                    {browserCookie ? `🍪 Browser Cookies: ${browserCookie}` : (cookieStatus ? '🍪 Premium/Cookies Detected' : '⚪ No Cookies Detected')} ⚙️
                </span>
            </div>

            {showSettings && (
                <div className="glass-card fadeIn" style={{ maxWidth: '600px', margin: '0 auto 20px auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                    <h4 style={{ margin: 0, color: '#fff' }}>Cookie Settings</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#b3b3b3' }}>
                        Providing cookies allows downloading age-restricted or premium content in the highest quality.
                    </p>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#fff' }}>Upload cookies.txt</label>
                            <input type="file" accept=".txt" onChange={handleFileUpload} disabled={uploading} style={{ color: '#b3b3b3', fontSize: '0.9rem', width: '100%' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#fff' }}>Or Use Browser Cookies</label>
                            <select value={browserCookie} onChange={handleBrowserChange} disabled={uploading} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <option value="" style={{ color: '#000' }}>-- None --</option>
                                <option value="chrome" style={{ color: '#000' }}>Chrome</option>
                                <option value="edge" style={{ color: '#000' }}>Edge</option>
                                <option value="firefox" style={{ color: '#000' }}>Firefox</option>
                                <option value="zen" style={{ color: '#000' }}>Zen Browser</option>
                                <option value="brave" style={{ color: '#000' }}>Brave</option>
                                <option value="opera" style={{ color: '#000' }}>Opera</option>
                                <option value="safari" style={{ color: '#000' }}>Safari</option>
                                <option value="vivaldi" style={{ color: '#000' }}>Vivaldi</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

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
                    </div>

                    <div className="button-group" style={{ marginTop: '20px' }}>
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
                </div>
            )}
        </div>
    );
};

export default YouTubeFetcher;
