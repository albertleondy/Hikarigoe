import React from 'react';

const DownloadModal = ({ isOpen, jobData, onClose }) => {
    if (!isOpen) return null;

    const progress = jobData?.progress || 0;
    const status = jobData?.status || 'Processing...';
    const title = jobData?.title || 'Unknown Video';
    const eta = jobData?.eta || '';
    const speed = jobData?.speed || '';

    return (
        <div className="modal modal-open">
            <div className="modal-box bg-base-300 border border-white/10 shadow-2xl max-w-md">
                <h3 className="font-bold text-xl text-white mb-2 flex items-center gap-2">
                    {status === 'Completing' ? '✅ Complete' : (status.startsWith('Error') ? '❌ Error' : '📥 Processing Download')}
                </h3>

                <div className="flex flex-col gap-4 mt-4">
                    <div className="bg-base-200 p-4 rounded-xl border border-white/5">
                        <p className="text-white font-semibold truncate text-sm mb-1">{title}</p>
                        <div className="flex justify-between text-[0.65rem] text-base-content/60 uppercase tracking-widest font-bold">
                            <span>{status}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <progress
                            className={`progress w-full mt-2 h-3 shadow-inner ${status.startsWith('Error') ? 'progress-error' : 'progress-primary'}`}
                            value={progress}
                            max="100"
                        ></progress>
                    </div>

                    {(speed || eta) && status === 'Downloading' && (
                        <div className="flex justify-between px-2 text-xs font-mono text-base-content/70">
                            <div className="flex items-center gap-1">
                                <span className="opacity-50">Speed:</span> {speed}
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="opacity-50">ETA:</span> {eta}
                            </div>
                        </div>
                    )}

                    {status.startsWith('Error') && (
                        <div className="alert alert-error text-xs py-2">
                            {status}
                        </div>
                    )}

                    <div className="modal-action mt-2">
                        {(status === 'Completing' || status.startsWith('Error')) ? (
                            <button className="btn btn-primary btn-sm rounded-lg" onClick={onClose}>Close</button>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-base-content/50 italic animate-pulse">
                                Please wait, the browser will prompt you to save once ready...
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={status.startsWith('Error') ? onClose : undefined}></div>
        </div>
    );
};

export default DownloadModal;
