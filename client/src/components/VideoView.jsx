import React from 'react';
import VideoTrimmer from './VideoTrimmer';
import MarqueeTitle from './MarqueeTitle';

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
        <div className="flex flex-col gap-6 w-full h-full min-h-0 overflow-y-auto custom-scrollbar pr-2 mt-4">
            {/* Back Button at Top */}
            {onBackToPlaylist && (
                <div className="flex justify-start">
                    <button className="btn btn-ghost btn-sm text-base-content/50 hover:text-white" onClick={onBackToPlaylist}>
                        ← {backButtonText}
                    </button>
                </div>
            )}
            <div className="flex flex-col lg:flex-row gap-6 w-full shrink-0">
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

                    {/* Download Options Card */}
                    <div className="card w-full bg-base-300 shadow-2xl overflow-hidden border border-white/5">
                        <div className="card-body px-4 md:px-6 py-6">
                            <h3 className="card-title text-lg text-white mb-4">Download Options</h3>
                            <div className="card-actions flex flex-col sm:flex-row gap-3 w-full">
                                <button className="btn btn-neutral w-full sm:flex-1 py-3 h-auto" onClick={() => handleVideoDownload('video')}>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">MP4</span>
                                        <span className="text-[0.65rem] opacity-60">High Quality Video</span>
                                    </div>
                                </button>
                                <button className="btn btn-secondary shadow-lg shadow-secondary/20 w-full sm:flex-1 py-3 h-auto" onClick={() => handleVideoDownload('audio')}>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">MP3</span>
                                        <span className="text-[0.65rem] opacity-80">Standard Audio</span>
                                    </div>
                                </button>
                                <button className="btn btn-primary shadow-lg shadow-primary/20 w-full sm:flex-1 py-3 h-auto" onClick={() => handleVideoDownload('opus')}>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-white">Opus</span>
                                        <span className="text-[0.65rem] text-white/80">Highest Quality Audio</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: METADATA & ACTIONS */}
                <div className="w-full lg:w-1/2 flex flex-col gap-4 h-fit">
                    {/* Video Info Card */}
                    <div className="card w-full bg-base-300 shadow-2xl overflow-hidden border border-white/5">
                        <div className="card-body px-4 md:px-8 py-6">
                            <h2 className="card-title text-xl md:text-2xl text-white mb-0 leading-tight">{activeVideo.title}</h2>
                            <p className="text-base-content/70 font-bold m-0 mt-1 text-base md:text-lg">{activeVideo.channel}</p>

                            {activeVideo.duration && (
                                <div className="badge badge-primary badge-outline mt-3 px-3 py-3 font-mono font-bold text-sm">
                                    Length: {new Date(activeVideo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Embed Thumbnail Card */}
                    <div className="card w-full bg-base-300 shadow-2xl overflow-hidden border border-white/5">
                        <div className="card-body px-4 md:px-8 py-6">
                            <h3 className="card-title text-base md:text-lg text-white mb-4">Thumbnail Options</h3>
                            <label className="label cursor-pointer justify-between gap-2 hover:bg-white/5 p-2 md:p-3 rounded-xl transition-colors w-full border border-base-100 bg-base-100/30">
                                <span className="label-text text-[0.7rem] min-[320px]:text-sm md:text-base font-semibold truncate">Embed Thumbnail (Audio)</span>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary toggle-md"
                                    checked={embedThumbnail}
                                    onChange={e => setEmbedThumbnail(e.target.checked)}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Video Trimmer Card */}
                    {activeVideo.duration && (
                        <VideoTrimmer
                            duration={activeVideo.duration}
                            onTrimChange={setTrimRange}
                        />
                    )}

                    {/* Back to Playlist Button */}
                    {onBackToPlaylist && (
                        <button className="btn btn-ghost text-base-content/50 hover:text-white" onClick={onBackToPlaylist}>
                            ← {backButtonText}
                        </button>
                    )}
                </div>
            </div>

            {/* Recommendations Section - Improved Layout */}
            {recommendations && recommendations.length > 0 && (
                <div className="w-full mt-2 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-white">Similar Videos</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 min-h-0 auto-rows-min">
                        {recommendations.map(video => {
                            const inQueue = queuedVideos.find(v => v.id === video.id);
                            return (
                                <div key={video.id} className="card bg-base-300 shadow-xl cursor-pointer hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/50 border border-transparent transition-all duration-300 overflow-hidden group h-fit min-h-[250px] sm:min-h-0" onClick={() => onRecommendationClick && onRecommendationClick(video)}>
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
                                    <figure className="aspect-video relative w-full min-h-[160px]">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                        {video.duration ? <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-mono">{new Date(video.duration * 1000).toISOString().substr(14, 5)}</div> : null}
                                    </figure>
                                    <div className="px-3 py-2 flex flex-col justify-center">
                                        <MarqueeTitle text={video.title} className="font-bold text-sm text-white w-full" />
                                        <p className="text-xs text-base-content/60 truncate mt-0.5 w-full">{video.channel}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoView;
