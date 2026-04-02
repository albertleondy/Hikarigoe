import { useState, useRef, useEffect } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import LyricFetcher from './components/LyricFetcher';
import YouTubeFetcher from './components/YouTubeFetcher';
import YouTubeSearch from './components/YouTubeSearch';

import MarqueeTitle from './components/MarqueeTitle';

function App() {
  const [currentView, setCurrentView] = useState('lyrics'); // 'lyrics', 'youtube-dl', or 'youtube-search'
  const [queuedVideos, setQueuedVideos] = useState([]);
  const [queueEmbedThumbnail, setQueueEmbedThumbnail] = useState(false);
  const [externalSelectedVideo, setExternalSelectedVideo] = useState(null);

  const addToQueue = (video) => {
    if (!queuedVideos.find(v => v.id === video.id)) {
      setQueuedVideos([...queuedVideos, video]);
    }
  };

  const removeFromQueue = (id) => {
    setQueuedVideos(queuedVideos.filter(v => v.id !== id));
  };

  const downloadAll = async (type) => {
    for (const video of queuedVideos) {
      let jobId = '';
      if (video.lyricsPayload) {
        try {
          const res = await fetch('http://localhost:3001/api/ytdl/prepare_lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyricsData: video.lyricsPayload })
          });
          const data = await res.json();
          if (data.jobId) jobId = data.jobId;
        } catch (err) {
          console.error("Failed to prepare lyrics", err);
        }
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(video.url)}&type=${type}&embedThumbnail=${queueEmbedThumbnail}${jobId ? `&jobId=${jobId}` : ''}`;
      document.body.appendChild(iframe);

      await new Promise(resolve => setTimeout(resolve, 1000));
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
    <div className="flex w-screen h-screen overflow-hidden bg-base-100 text-base-content p-4 gap-4">
      <div className="flex-1 glass-effect rounded-3xl flex flex-col overflow-hidden p-6 relative">
        <div className="flex flex-col items-center mb-6 shrink-0">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
            Hikarigoe
          </h1>
          <p className="text-base-content/60 font-medium tracking-wide">Media Tool</p>
        </div>

        <div className="flex justify-center shrink-0">
          <Navbar currentView={currentView} setView={setCurrentView} />
        </div>

        <div className="flex-1 overflow-hidden relative mt-2 w-full max-w-6xl mx-auto flex flex-col">
          {currentView === 'lyrics' && <LyricFetcher />}
          {currentView === 'youtube-dl' && <YouTubeFetcher addToQueue={addToQueue} queuedVideos={queuedVideos} />}
          {currentView === 'youtube-search' && <YouTubeSearch addToQueue={addToQueue} queuedVideos={queuedVideos} externalSelectedVideo={externalSelectedVideo} />}
        </div>
      </div>

      {queuedVideos.length > 0 && (
        <div className="w-80 glass-effect rounded-3xl flex flex-col p-5 shrink-0 z-10 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 shrink-0">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Queue
              <span className="badge badge-primary">{queuedVideos.length}</span>
            </h3>
            <button
              onClick={() => setQueuedVideos([])}
              className="btn btn-xs btn-outline btn-error rounded-full"
            >
              Clear All
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3 pr-1 w-full relative z-0">
            {queuedVideos.map(video => (
              <div
                key={video.id}
                className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl relative overflow-hidden transition-all duration-200 border border-transparent hover:border-primary/50 cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/10'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10'); }}
                onDrop={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10'); handleDrop(e, video.id); }}
                onClick={() => {
                  setCurrentView('youtube-search');
                  setExternalSelectedVideo(video);
                }}
              >
                <img src={video.thumbnail} alt="thumb" className="w-16 h-10 object-cover rounded-md shrink-0 shadow-md pointer-events-none" />
                <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
                  <MarqueeTitle text={video.title} />
                  {video.lyricsPayload && (
                    <p className="m-0 text-[0.7rem] text-primary whitespace-nowrap overflow-hidden text-ellipsis font-semibold flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 7.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" /><path d="M5.273 4.5a1.25 1.25 0 00-1.205.918l-1.523 5.52c-.006.024-.01.048-.014.074A6.56 6.56 0 013 14.65a6.5 6.5 0 005.323 1.83.75.75 0 00.71-1.24A4.986 4.986 0 016 11.5a4.986 4.986 0 01-2.9-1.28l1.1-3.98A.25.25 0 014.542 6h1.22l.509-2.5h-1zm9.454 0a1.25 1.25 0 011.205.918l1.523 5.52c.006.024.01.048.014.074A6.56 6.56 0 0017 14.65a6.5 6.5 0 01-5.323 1.83.75.75 0 01-.71-1.24 4.986 4.986 0 003.033-3.74 4.986 4.986 0 002.9-1.28l-1.1-3.98a.25.25 0 00-.341-.22h-1.22l-.509-2.5h1z" /></svg>
                      {video.lyricsPayload.title}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(video.id); }}
                  className="bg-transparent border-none text-error/70 hover:text-error cursor-pointer text-xl p-1 leading-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-4 shrink-0">
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
      )}
    </div>
  );
}

export default App;
