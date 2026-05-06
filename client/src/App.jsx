import { useState, useRef, useEffect } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import LyricFetcher from './components/LyricFetcher';
import YouTubeFetcher from './components/YouTubeFetcher';
import YouTubeSearch from './components/YouTubeSearch';
import DownloadModal from './components/DownloadModal';

import MarqueeTitle from './components/MarqueeTitle';

function App() {
  const [currentView, setCurrentView] = useState('lyrics'); // 'lyrics', 'youtube-dl', or 'youtube-search'
  const [queuedVideos, setQueuedVideos] = useState([]);
  const [queueEmbedThumbnail, setQueueEmbedThumbnail] = useState(false);
  const [externalSelectedVideo, setExternalSelectedVideo] = useState(null);

  // Download & Progress State
  const [downloadJob, setDownloadJob] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const pollingInterval = useRef(null);

  // Mobile Menu State
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const addToQueue = (video) => {
    if (!queuedVideos.find(v => v.id === video.id)) {
      setQueuedVideos([...queuedVideos, video]);
    }
  };

  const removeFromQueue = (id) => {
    setQueuedVideos(queuedVideos.filter(v => v.id !== id));
  };

  const removeLyricsFromVideo = (id) => {
    setQueuedVideos(queuedVideos.map(v =>
      v.id === id ? { ...v, lyricsPayload: null } : v
    ));
  };

  const triggerDownload = (url, type, options = {}) => {
    const clientJobId = 'job_' + Math.random().toString(36).substring(2, 11);
    const { embedThumbnail, jobId, startTime, endTime } = options;

    let downloadUrl = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&clientJobId=${clientJobId}`;
    if (embedThumbnail) downloadUrl += `&embedThumbnail=true`;
    if (jobId) downloadUrl += `&jobId=${jobId}`;
    if (startTime !== undefined) downloadUrl += `&startTime=${startTime}`;
    if (endTime !== undefined) downloadUrl += `&endTime=${endTime}`;

    console.log('Initiating download:', downloadUrl);

    // Initial state
    setDownloadJob({
      id: clientJobId,
      status: 'Connecting...',
      progress: 0,
      title: 'Requesting server...'
    });
    setIsDownloadModalOpen(true);

    // Start polling
    startPolling(clientJobId);

    // Trigger actual download via hidden iframe or window location
    // Using an iframe is better as it doesn't navigate away/flash
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    // Clean up iframe after a while (long timeout to prevent aborted requests)
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 600000); // 10 minutes
  };

  const startPolling = (jobId) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/ytdl/progress/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setDownloadJob(data);

          if (data.status === 'Completing' || data.status.startsWith('Error')) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        } else {
          // Job might have been cleaned up or server restarted
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }, 1000);
  };

  const closeDownloadModal = () => {
    setIsDownloadModalOpen(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const downloadAll = async (type) => {
    for (const video of queuedVideos) {
      let lyricsJobId = '';
      if (video.lyricsPayload) {
        try {
          const res = await fetch('http://localhost:3001/api/ytdl/prepare_lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyricsData: video.lyricsPayload })
          });
          const data = await res.json();
          if (data.jobId) lyricsJobId = data.jobId;
        } catch (err) {
          console.error("Failed to prepare lyrics", err);
        }
      }

      // Instead of manual iframe, use triggerDownload for each (sequential)
      // We wait for the modal to be closed or the download to finish before next one
      triggerDownload(video.url, type, {
        embedThumbnail: queueEmbedThumbnail,
        jobId: lyricsJobId
      });

      // Wait for the current job to finish (polling stops)
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!pollingInterval.current) {
            clearInterval(check);
            resolve();
          }
        }, 500);
      });

      // Small gap between jobs
      await new Promise(r => setTimeout(r, 1000));
    }
  };

  const handleDrop = (e, videoId) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const payload = JSON.parse(dataStr);
        setQueuedVideos(queuedVideos.map(v =>
          v.id === videoId ? { ...v, lyricsPayload: payload } : v
        ));
      }
    } catch (err) { }
  };

  return (
    <div className="flex flex-col lg:flex-row w-screen h-screen overflow-hidden bg-base-100 text-base-content p-2 md:p-4 gap-2 md:gap-4 relative">
      <div className={`flex-1 glass-effect rounded-[2rem] flex flex-col overflow-hidden p-3 md:p-6 relative transition-all duration-300 ${isQueueOpen ? 'lg:scale-100 opacity-30 lg:opacity-100 pointer-events-none lg:pointer-events-auto' : ''}`}>
        <div className="flex flex-col items-center mb-4 md:mb-6 shrink-0">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
            Hikarigoe
          </h1>
          <p className="text-base-content/60 font-medium tracking-wide">Media Tool</p>
        </div>

        <div className="flex justify-center shrink-0">
          <Navbar currentView={currentView} setView={setCurrentView} />
        </div>

        <div className="flex-1 overflow-hidden relative mt-2 w-full max-w-6xl mx-auto flex flex-col">
          {currentView === 'lyrics' && (
            <LyricFetcher
              queuedVideos={queuedVideos}
              onAssignLyrics={(videoId, lyricsPayload) => {
                setQueuedVideos(queuedVideos.map(v =>
                  v.id === videoId ? { ...v, lyricsPayload } : v
                ));
              }}
            />
          )}
          {currentView === 'youtube-dl' && <YouTubeFetcher addToQueue={addToQueue} queuedVideos={queuedVideos} triggerDownload={triggerDownload} />}
          {currentView === 'youtube-search' && <YouTubeSearch addToQueue={addToQueue} queuedVideos={queuedVideos} externalSelectedVideo={externalSelectedVideo} triggerDownload={triggerDownload} />}
        </div>

        <DownloadModal isOpen={isDownloadModalOpen} jobData={downloadJob} onClose={closeDownloadModal} />
      </div>

      {queuedVideos.length > 0 && (
        <>
          {/* Floating Action Button for Mobile Queue */}
          <button
            className={`lg:hidden fixed bottom-6 right-6 z-50 btn btn-circle btn-lg text-xl shadow-2xl transition-transform duration-300 ${isQueueOpen ? 'bg-error text-white border-transparent hover:bg-error/80' : 'btn-primary'}`}
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            style={{ zIndex: 60 }}
          >
            {isQueueOpen ? '×' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                <span className="absolute top-0 right-0 badge badge-sm badge-error border-none">{queuedVideos.length}</span>
              </>
            )}
          </button>

          <div
            className={`
              absolute lg:relative z-40 top-4 bottom-4 right-4 lg:top-auto lg:bottom-auto lg:right-auto 
              w-[calc(100%-2rem)] md:w-96 lg:w-80 glass-effect rounded-[2rem] flex flex-col p-5 shrink-0 
              transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]
              ${isQueueOpen ? 'translate-x-0' : 'translate-x-[120%] lg:translate-x-0'}
            `}
          >
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Queue
                <span className="badge badge-primary">{queuedVideos.length}</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setQueuedVideos([])}
                  className="btn btn-xs btn-outline btn-error rounded-full"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3 pr-1 w-full relative z-0 custom-scrollbar">
              {queuedVideos.map(video => (
                <div
                  key={video.id}
                  className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl relative overflow-hidden transition-all duration-200 border border-transparent hover:border-primary/50 cursor-pointer shrink-0 h-20"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/10'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10'); }}
                  onDrop={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10'); handleDrop(e, video.id); }}
                  onClick={() => {
                    setCurrentView('youtube-search');
                    setExternalSelectedVideo(video);
                    setIsQueueOpen(false); // Close queue on mobile when selecting
                  }}
                >
                  <img src={video.thumbnail} alt="thumb" className="w-16 h-10 object-cover rounded-md shrink-0 shadow-md pointer-events-none" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
                    <MarqueeTitle text={video.title} />
                    {video.lyricsPayload && (
                      <p className="m-0 text-[0.7rem] text-primary whitespace-nowrap overflow-hidden text-ellipsis font-semibold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0"><path d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 7.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" /><path d="M5.273 4.5a1.25 1.25 0 00-1.205.918l-1.523 5.52c-.006.024-.01.048-.014.074A6.56 6.56 0 013 14.65a6.5 6.5 0 005.323 1.83.75.75 0 00.71-1.24A4.986 4.986 0 016 11.5a4.986 4.986 0 01-2.9-1.28l1.1-3.98A.25.25 0 014.542 6h1.22l.509-2.5h-1zm9.454 0a1.25 1.25 0 011.205.918l1.523 5.52c.006.024.01.048.014.074A6.56 6.56 0 0017 14.65a6.5 6.5 0 01-5.323 1.83.75.75 0 01-.71-1.24 4.986 4.986 0 003.033-3.74 4.986 4.986 0 002.9-1.28l-1.1-3.98a.25.25 0 00-.341-.22h-1.22l-.509-2.5h1z" /></svg>
                        <span className="truncate">{video.lyricsPayload.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeLyricsFromVideo(video.id); }}
                          className="bg-transparent border-none text-primary/50 hover:text-error cursor-pointer text-sm p-0 leading-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          title="Remove lyrics"
                        >
                          ×
                        </button>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(video.id); }}
                    className="bg-transparent border-none text-error/70 hover:text-error cursor-pointer text-xl p-1 leading-none shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 lg:translate-x-2 group-hover:translate-x-0"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-4 shrink-0 pb-10 lg:pb-0">
              <label className="label cursor-pointer justify-center gap-2 hover:bg-white/5 p-2 rounded-lg transition-colors">
                <span className="label-text text-base-content/70">Embed Thumbnail</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={queueEmbedThumbnail}
                  onChange={(e) => setQueueEmbedThumbnail(e.target.checked)}
                />
              </label>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1 shadow-lg shadow-primary/20" onClick={() => downloadAll('opus')}>
                  All (Opus)
                </button>
                <button className="btn btn-secondary flex-1 shadow-lg shadow-secondary/20" onClick={() => downloadAll('audio')}>
                  All (MP3)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
