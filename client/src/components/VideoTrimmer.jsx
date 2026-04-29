import React, { useState, useEffect, useRef } from 'react';

const VideoTrimmer = ({ duration, onTrimChange }) => {
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(duration);
    const [isDragging, setIsDragging] = useState(null); // 'start' or 'end' or null
    const sliderRef = useRef(null);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const parseTime = (timeStr) => {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    };

    useEffect(() => {
        setEndTime(duration);
        console.log('VideoTrimmer: duration set to', duration);
    }, [duration]);

    useEffect(() => {
        if (onTrimChange) {
            console.log('VideoTrimmer: calling onTrimChange with', { startTime, endTime });
            onTrimChange({ startTime, endTime });
        }
    }, [startTime, endTime, onTrimChange]);

    const handleStartInputChange = (e) => {
        const timeStr = e.target.value;
        const newStart = parseTime(timeStr);
        if (newStart >= 0 && newStart < endTime - 1) {
            setStartTime(newStart);
        }
    };

    const handleEndInputChange = (e) => {
        const timeStr = e.target.value;
        const newEnd = parseTime(timeStr);
        if (newEnd > startTime + 1 && newEnd <= duration) {
            setEndTime(newEnd);
        }
    };

    const handleMouseDown = (handle) => (e) => {
        e.preventDefault();
        setIsDragging(handle);
    };

    const updatePosition = (clientX) => {
        if (!isDragging || !sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percentage * duration;

        if (isDragging === 'start') {
            if (newTime < endTime - 1) {
                setStartTime(newTime);
            }
        } else if (isDragging === 'end') {
            if (newTime > startTime + 1) {
                setEndTime(newTime);
            }
        }
    };

    const handleMouseMove = (e) => {
        updatePosition(e.clientX);
    };

    const handleTouchMove = (e) => {
        if (e.touches && e.touches[0]) {
            updatePosition(e.touches[0].clientX);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(null);
    };

    const handleTouchEnd = () => {
        setIsDragging(null);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [isDragging, startTime, endTime, duration]);

    const getProgressStyle = () => {
        const startPercent = (startTime / duration) * 100;
        const endPercent = (endTime / duration) * 100;
        return {
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
        };
    };

    return (
        <div className="w-full bg-base-300/50 p-4 md:p-5 rounded-xl border border-white/5">
            <h4 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Video Trimmer
            </h4>

            <div className="mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-xs md:text-sm font-semibold text-white min-w-[35px]">Start:</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm flex-1 sm:w-24 font-mono text-xs md:text-sm"
                            value={formatTime(startTime)}
                            onChange={handleStartInputChange}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-xs md:text-sm font-semibold text-white min-w-[35px]">End:</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm flex-1 sm:w-24 font-mono text-xs md:text-sm"
                            value={formatTime(endTime)}
                            onChange={handleEndInputChange}
                        />
                    </div>
                </div>
                <div className="text-center text-sm text-base-content/60">
                    Duration: {formatTime(endTime - startTime)}
                </div>
            </div>

            <div
                ref={sliderRef}
                className="relative h-8 bg-base-200 rounded-lg overflow-visible select-none"
            >
                {/* Track background */}
                <div className="absolute inset-0 bg-base-200 rounded-lg">
                    {/* Time markers */}
                    <div className="absolute inset-0 flex justify-between px-1">
                        <span className="text-[10px] text-base-content/50">0:00</span>
                        <span className="text-[10px] text-base-content/50">{formatTime(duration / 2)}</span>
                        <span className="text-[10px] text-base-content/50">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Selected range highlight */}
                <div
                    className="absolute top-0 bottom-0 bg-primary/40 rounded-lg pointer-events-none"
                    style={getProgressStyle()}
                ></div>

                {/* Start handle */}
                <div
                    className={`absolute top-0 bottom-0 cursor-ew-resize z-10 ${isDragging === 'start' ? 'scale-x-150' : 'hover:scale-x-150'} transition-transform`}
                    style={{ left: `${(startTime / duration) * 100}%` }}
                    onMouseDown={handleMouseDown('start')}
                    onTouchStart={handleMouseDown('start')}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-none"></div>
                    <div className="absolute inset-y-0 -left-3 w-7"></div>
                </div>

                {/* End handle */}
                <div
                    className={`absolute top-0 bottom-0 cursor-ew-resize z-10 ${isDragging === 'end' ? 'scale-x-150' : 'hover:scale-x-150'} transition-transform`}
                    style={{ left: `${(endTime / duration) * 100}%` }}
                    onMouseDown={handleMouseDown('end')}
                    onTouchStart={handleMouseDown('end')}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-none"></div>
                    <div className="absolute inset-y-0 -left-3 w-7"></div>
                </div>
            </div>

            <div className="flex justify-between mt-3">
                <button
                    className="btn btn-xs btn-outline btn-primary"
                    onClick={() => { setStartTime(0); setEndTime(duration); }}
                >
                    Reset
                </button>
                <div className="text-xs text-base-content/50 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    Drag handles to trim
                </div>
            </div>
        </div>
    );
};

export default VideoTrimmer;
