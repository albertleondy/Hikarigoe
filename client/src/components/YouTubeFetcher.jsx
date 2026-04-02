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
        <div className="flex flex-col h-full flex-1 min-h-0 animate-fade-in gap-4 w-full max-w-3xl mx-auto overflow-y-auto custom-scrollbar pr-2 pb-6 pt-2">
            <div className="text-center shrink-0">
                <button
                    className={`badge badge-lg gap-2 cursor-pointer hover:scale-105 transition-transform ${cookieStatus || browserCookie ? 'badge-success badge-outline' : 'badge-neutral'}`}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    {browserCookie ? `🍪 Browser Cookies: ${browserCookie}` : (cookieStatus ? '🍪 Premium/Cookies Detected' : '⚪ No Cookies Detected')} ⚙️
                </button>
            </div>

            {showSettings && (
                <div className="w-full p-6 bg-base-300/50 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col gap-4 shadow-xl shrink-0">
                    <h4 className="text-xl font-bold text-white m-0">Cookie Settings</h4>
                    <p className="text-sm text-base-content/70 m-0">
                        Providing cookies allows downloading age-restricted or premium content in the highest quality.
                    </p>
                    <div className="flex flex-wrap gap-6 items-end">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                            <label className="text-sm font-semibold text-white">Upload cookies.txt</label>
                            <input type="file" className="file-input file-input-bordered file-input-primary w-full" accept=".txt" onChange={handleFileUpload} disabled={uploading} />
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

            <form onSubmit={handleInspect} className="w-full flex gap-2 shrink-0">
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
                <div className="alert alert-error shadow-lg shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                </div>
            )}

            {videoInfo && (
                <div className="card w-full bg-base-300/80 backdrop-blur-md shadow-2xl border border-white/5 shrink-0 mt-4 overflow-hidden">
                    <figure className="bg-black/60 pt-6 px-6">
                        <img src={videoInfo.thumbnail} alt={videoInfo.title} className="max-h-80 w-auto object-contain rounded-xl shadow-2xl shadow-black border border-white/10" />
                    </figure>
                    <div className="card-body items-center text-center p-8">
                        <h2 className="card-title text-3xl font-bold text-white leading-tight mb-2">{videoInfo.title}</h2>
                        <p className="text-base-content/70 font-medium text-lg m-0">{videoInfo.channel}</p>

                        {videoInfo.duration && (
                            <div className="badge badge-primary badge-outline mt-2 px-3 py-3 font-mono font-bold">
                                Length: {new Date(videoInfo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                            </div>
                        )}

                        <label className="label cursor-pointer justify-center gap-3 mt-6 hover:bg-white/5 p-3 rounded-xl transition-colors w-full border border-base-100 bg-base-100/30">
                            <span className="label-text text-base font-semibold">Embed Thumbnail (Audio)</span>
                            <input
                                type="checkbox"
                                className="toggle toggle-primary toggle-lg"
                                checked={embedThumbnail}
                                onChange={e => setEmbedThumbnail(e.target.checked)}
                            />
                        </label>

                        <div className="card-actions flex flex-col sm:flex-row justify-center gap-4 mt-8 w-full">
                            <button className="btn btn-neutral flex-1 py-4 h-auto shadow-md hover:shadow-lg" onClick={() => handleDownload('video')}>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-lg">MP4</span>
                                    <span className="text-xs opacity-60">High Quality Video</span>
                                </div>
                            </button>
                            <button className="btn btn-secondary flex-1 py-4 h-auto shadow-lg shadow-secondary/20 hover:shadow-secondary/40" onClick={() => handleDownload('audio')}>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-lg">MP3</span>
                                    <span className="text-xs opacity-80">Standard Audio</span>
                                </div>
                            </button>
                            <button className="btn btn-primary flex-1 py-4 h-auto shadow-lg shadow-primary/20 hover:shadow-primary/40" onClick={() => handleDownload('opus')}>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-lg text-white">Opus</span>
                                    <span className="text-xs text-white/80">Highest Quality Audio</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YouTubeFetcher;
