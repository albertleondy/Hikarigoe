import React from 'react';
import VideoTrimmer from './VideoTrimmer';
import MarqueeTitle from './MarqueeTitle';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Plus, Check, ChevronLeft, Download, Music, Video, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const VideoView = ({
    activeVideo,
    activeVideoUrl,
    videoId,
    handleDownload,
    embedThumbnail,
    setEmbedThumbnail,
    trimRange,
    setTrimRange,
    addToQueue,
    queuedVideos,
    onBackToPlaylist,
    recommendations,
    onRecommendationClick,
    backButtonText = "Back"
}) => {
    const handleVideoDownload = (type) => handleDownload(type, activeVideoUrl, activeVideo);

    return (
        <div className="flex flex-col gap-8 w-full h-full min-h-0 overflow-y-auto custom-scrollbar pr-2 mt-2 pb-10">
            {/* Back Button at Top */}
            {onBackToPlaylist && (
                <div className="flex justify-start">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={onBackToPlaylist}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> {backButtonText}
                    </Button>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 w-full shrink-0">
                {/* LEFT: MEDIA SIDE */}
                <div className="w-full lg:w-1/2 flex flex-col gap-6 shrink-0">
                    <div className="group relative w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/5 ring-1 ring-white/10">
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
                            <img src={activeVideo.thumbnail} alt={activeVideo.title} className="w-full h-full object-contain" />
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="bg-white/[0.02] border-white/5 shadow-xl">
                            <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</span>
                                    <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">YouTube</Badge>
                                </div>
                                <Button variant="outline" size="sm" className="w-full rounded-xl" asChild>
                                    <a href={activeVideoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                                        Open Original <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/[0.02] border-white/5 shadow-xl">
                            <CardContent className="p-4 flex flex-col gap-3 justify-center">
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
                                        <Button
                                            className={cn(
                                                "w-full rounded-xl transition-all shadow-lg",
                                                inQueue ? "bg-emerald-500 hover:bg-emerald-600" : "shadow-primary/10"
                                            )}
                                            onClick={() => addToQueue(fullVideo)}
                                            disabled={!fullVideo.id || inQueue}
                                        >
                                            {inQueue ? <><Check className="w-4 h-4 mr-2" /> In Queue</> : <><Plus className="w-4 h-4 mr-2" /> Add to Queue</>}
                                        </Button>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Download Options */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Download className="w-5 h-5 text-primary" /> Download
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button variant="outline" className="h-20 flex flex-col gap-1 rounded-2xl hover:bg-primary/5 hover:border-primary/50 transition-all border-white/5 bg-white/[0.02]" onClick={() => handleVideoDownload('video')}>
                                <Video className="w-5 h-5 text-blue-400" />
                                <span className="font-bold">MP4</span>
                                <span className="text-[10px] opacity-40 uppercase tracking-tighter">High Quality</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-1 rounded-2xl hover:bg-primary/5 hover:border-primary/50 transition-all border-white/5 bg-white/[0.02]" onClick={() => handleVideoDownload('audio')}>
                                <Music className="w-5 h-5 text-emerald-400" />
                                <span className="font-bold">MP3</span>
                                <span className="text-[10px] opacity-40 uppercase tracking-tighter">Standard</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-1 rounded-2xl hover:bg-primary/5 hover:border-primary/50 transition-all border-white/5 bg-white/[0.02]" onClick={() => handleVideoDownload('opus')}>
                                <Zap className="w-5 h-5 text-primary" />
                                <span className="font-bold">OPUS</span>
                                <span className="text-[10px] opacity-40 uppercase tracking-tighter">Lossless</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: METADATA & ACTIONS */}
                <div className="w-full lg:w-1/2 flex flex-col gap-6 h-fit">
                    <Card className="bg-transparent border-none shadow-none">
                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{activeVideo.title}</h2>
                            <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-primary">{activeVideo.channel}</p>
                                {activeVideo.duration && (
                                    <Badge variant="outline" className="font-mono text-xs border-white/10 text-muted-foreground">
                                        {new Date(activeVideo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-white/[0.02] border-white/5 shadow-xl">
                        <CardHeader className="p-6 pb-0">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-4 flex flex-col gap-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-bold">Embed Metadata</span>
                                    <span className="text-[10px] text-muted-foreground">Attach thumbnail & lyrics to file</span>
                                </div>
                                <Switch
                                    checked={embedThumbnail}
                                    onCheckedChange={setEmbedThumbnail}
                                />
                            </div>

                            {activeVideo.duration && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                                        <Zap className="w-3 h-3" /> Trim Segment
                                    </div>
                                    <VideoTrimmer
                                        duration={activeVideo.duration}
                                        onTrimChange={setTrimRange}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recommendations Section */}
            {recommendations && recommendations.length > 0 && (
                <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1 bg-white/5" />
                        <h3 className="text-xl font-black tracking-tight uppercase italic opacity-60">Similar Vibes</h3>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
                        {recommendations.map(video => {
                            const inQueue = queuedVideos.find(v => v.id === video.id);
                            return (
                                <Card 
                                    key={video.id} 
                                    className="group relative overflow-hidden border-transparent bg-black/20 hover:bg-black/40 hover:border-primary/30 transition-all cursor-pointer h-fit" 
                                    onClick={() => onRecommendationClick && onRecommendationClick(video)}
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
                                                addToQueue({
                                                    id: video.id,
                                                    title: video.title,
                                                    url: video.url,
                                                    thumbnail: video.thumbnail,
                                                    duration: video.duration,
                                                    channel: video.channel
                                                });
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
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoView;
