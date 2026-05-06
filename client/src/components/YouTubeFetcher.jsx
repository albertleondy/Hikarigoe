import React, { useState } from 'react';
import VideoTrimmer from './VideoTrimmer';
import MarqueeTitle from './MarqueeTitle';
import VideoView from './VideoView';
import { Play, Settings2, Cookie, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const YouTubeFetcher = ({ addToQueue, queuedVideos, triggerDownload }) => {
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
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

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
            } catch (err) {
                console.error('Failed to upload cookies');
            }
            setUploading(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const handleBrowserChange = async (val) => {
        setUploading(true);
        try {
            await fetch('http://localhost:3001/api/ytdl/cookie_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browser: val })
            });
            fetchStatus();
        } catch (err) {
            console.error('Failed to update browser setting');
        }
        setUploading(false);
    };

    const handleInspect = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!url) return;
        setLoading(true);
        setError(null);
        setVideoInfo(null);
        setRecommendations([]);
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
            fetchRecommendations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async (video) => {
        if (!video || !video.id) return;
        setLoadingRecs(true);
        try {
            const channel = video.channel || '';
            const res = await fetch(`http://localhost:3001/api/ytdl/related?id=${encodeURIComponent(video.id)}&channel=${encodeURIComponent(channel)}`);
            const data = await res.json();
            if (res.ok) {
                const filtered = data.filter(v => v.id !== video.id);
                setRecommendations(filtered.slice(0, 12));
            }
        } catch (err) {
            console.error('Failed to fetch recommendations:', err);
        } finally {
            setLoadingRecs(false);
        }
    };

    const handleDownload = (type, currentVideoUrl = url, currentVideoInfo = videoInfo) => {
        if (!currentVideoUrl) return;

        const hasValidTrim = trimRange.endTime > 0 &&
            trimRange.startTime < trimRange.endTime &&
            (trimRange.startTime > 0 || trimRange.endTime < (currentVideoInfo?.duration || Infinity));

        const options = {
            embedThumbnail,
            startTime: hasValidTrim ? trimRange.startTime : undefined,
            endTime: hasValidTrim ? trimRange.endTime : undefined
        };

        triggerDownload(currentVideoUrl, type, options);
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
        fetchRecommendations(video);
    };

    const isShowingPlaylist = videoInfo && videoInfo.isPlaylist && !playlistSelectedVideo;
    const isShowingVideo = (videoInfo && !videoInfo.isPlaylist) || playlistSelectedVideo;
    const activeVideo = playlistSelectedVideo || videoInfo;
    const activeVideoUrl = playlistSelectedVideo ? playlistSelectedVideo.url : url;

    const totalPages = videoInfo && videoInfo.isPlaylist ? Math.ceil(videoInfo.videos.length / ITEMS_PER_PAGE) : 0;
    const currentResults = videoInfo && videoInfo.isPlaylist ? videoInfo.videos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : [];

    return (
        <div className="flex flex-col h-full flex-1 min-h-0 animate-fade-in gap-6">
            <div className="flex justify-center shrink-0">
                <Button
                    variant="glass"
                    size="sm"
                    className={cn(
                        "rounded-full gap-2 px-4 border shadow-xl transition-all",
                        (cookieStatus || browserCookie) ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-white/10"
                    )}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Cookie className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {browserCookie ? `Cookies: ${browserCookie}` : (cookieStatus ? 'Premium Active' : 'No Cookies')}
                    </span>
                    <Settings2 className="w-3.5 h-3.5 opacity-50 ml-1" />
                </Button>
            </div>

            {showSettings && (
                <Card className="max-w-2xl mx-auto w-full glass-card border-white/5 shadow-2xl animate-in slide-in-from-top-4">
                    <CardContent className="p-6 flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <h4 className="text-lg font-bold">Cookie Settings</h4>
                            <p className="text-xs text-muted-foreground">
                                Use cookies to bypass age restrictions or download premium content in high quality.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload cookies.txt</label>
                                <Input type="file" className="bg-black/20" accept=".txt" onChange={handleFileUpload} disabled={uploading} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Use Browser Cookies</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                                    value={browserCookie} 
                                    onChange={(e) => handleBrowserChange(e.target.value)} 
                                    disabled={uploading}
                                >
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
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleInspect} className="max-w-2xl mx-auto w-full flex gap-3 shrink-0 px-2">
                <Input
                    className="flex-1 bg-black/20 h-12 text-lg border-white/10 focus-visible:ring-primary/50"
                    placeholder="Enter YouTube Link or Playlist URL..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <Button size="lg" disabled={loading} className="px-8 shadow-xl shadow-primary/20">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'FETCH'}
                </Button>
            </form>

            {error && (
                <div className="max-w-2xl mx-auto w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className={cn(
                "flex-1 overflow-hidden flex flex-col min-h-0 rounded-[2.5rem] transition-all",
                videoInfo ? "bg-card/20 border p-6 shadow-inner" : "bg-transparent border-none p-0"
            )}>
                {!videoInfo && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <Play className="w-24 h-24 text-muted-foreground mb-6" />
                        <h3 className="text-2xl font-black tracking-tight">Ready to Fetch</h3>
                        <p className="text-sm font-medium mt-2">Paste a YouTube link above to start downloading</p>
                    </div>
                )}
                
                {isShowingPlaylist && (
                    <div className="flex flex-col h-full flex-1 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 min-h-0 auto-rows-min custom-scrollbar pr-2 pb-6 pt-2">
                            {currentResults.map(video => {
                                const inQueue = queuedVideos && queuedVideos.find(v => v.id === video.id);
                                return (
                                    <Card 
                                        key={video.id} 
                                        className="relative group overflow-hidden border-transparent bg-black/20 hover:bg-black/40 hover:border-primary/50 transition-all cursor-pointer h-fit"
                                        onClick={() => handleVideoClick(video)}
                                    >
                                        <div className="aspect-video relative overflow-hidden">
                                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            {video.duration && (
                                                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums">
                                                    {new Date(video.duration * 1000).toISOString().substr(14, 5)}
                                                </div>
                                            )}
                                            <Button
                                                variant={inQueue ? "default" : "secondary"}
                                                size="icon"
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (addToQueue) addToQueue({ ...video, url: video.url || `https://www.youtube.com/watch?v=${video.id}` }); 
                                                }}
                                                className={cn(
                                                    "absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg z-10 transition-all",
                                                    inQueue ? "bg-emerald-500 hover:bg-emerald-500 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                                )}
                                            >
                                                {inQueue ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <div className="p-3">
                                            <MarqueeTitle text={video.title} className="text-xs font-bold" />
                                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{video.channel}</p>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                        
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-6 mt-4 pt-4 border-t border-white/5 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                </Button>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {isShowingVideo && (() => {
                    const videoId = activeVideoUrl.match(/[?&]v=([^&]+)/)?.[1] || activeVideoUrl.match(/youtu\.be\/([^?]+)/)?.[1] || activeVideo.id;

                    return (
                        <VideoView
                            activeVideo={activeVideo}
                            activeVideoUrl={activeVideoUrl}
                            videoId={videoId}
                            handleDownload={handleDownload}
                            embedThumbnail={embedThumbnail}
                            setEmbedThumbnail={setEmbedThumbnail}
                            trimRange={trimRange}
                            setTrimRange={setTrimRange}
                            addToQueue={addToQueue}
                            queuedVideos={queuedVideos}
                            onBackToPlaylist={videoInfo && videoInfo.isPlaylist && playlistSelectedVideo ? () => setPlaylistSelectedVideo(null) : null}
                            recommendations={recommendations}
                            onRecommendationClick={(video) => {
                                setUrl(video.url);
                                handleInspect({ preventDefault: () => { } });
                            }}
                            backButtonText="Back to Playlist"
                        />
                    );
                })()}
            </div>
        </div>
    );
};

export default YouTubeFetcher;
