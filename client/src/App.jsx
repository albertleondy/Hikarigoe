import { useState, useRef, useEffect } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import LyricFetcher from './components/LyricFetcher';
import YouTubeFetcher from './components/YouTubeFetcher';
import YouTubeSearch from './components/YouTubeSearch';

const MarqueeTitle = ({ text }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative', height: '1.2em' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={textRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          lineHeight: '1.2',
          fontSize: '0.85rem',
          color: '#fff',
          transform: isHovered && isOverflowing && containerRef.current
            ? `translateX(calc(${containerRef.current.clientWidth}px - ${textRef.current.scrollWidth}px))`
            : 'translateX(0)',
          transition: isHovered && isOverflowing ? 'transform 4s linear' : 'transform 0.5s ease-out',
        }}
      >
        {text}
      </div>
      {!isHovered && isOverflowing && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, transparent, rgba(40,40,50,0.9))', pointerEvents: 'none' }} />
      )}
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('lyrics'); // 'lyrics', 'youtube-dl', or 'youtube-search'
  const [queuedVideos, setQueuedVideos] = useState([]);
  const [queueEmbedThumbnail, setQueueEmbedThumbnail] = useState(false);

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
    <div className="app-container" style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
      <div className="glass-card full-width" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h1 className="title" style={{ flexShrink: 0 }}>Hikarigoe</h1>
        <p className="subtitle" style={{ flexShrink: 0 }}>Media Tool</p>

        <Navbar currentView={currentView} setView={setCurrentView} />

        {currentView === 'lyrics' && <LyricFetcher />}
        {currentView === 'youtube-dl' && <YouTubeFetcher />}
        {currentView === 'youtube-search' && <YouTubeSearch addToQueue={addToQueue} queuedVideos={queuedVideos} />}
      </div>

      {queuedVideos.length > 0 && (currentView === 'youtube-search' || currentView === 'lyrics') && (
        <div className="queue-sidebar glass-card" style={{ width: '320px', flexShrink: 0, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', textAlign: 'center', fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', flexShrink: 0 }}>
            Download Queue ({queuedVideos.length})
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px', width: '100%' }}>
            {queuedVideos.map(video => (
              <div
                key={video.id}
                className="queue-item"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.border = '1px solid #7f5af0'; }}
                onDragLeave={(e) => { e.currentTarget.style.border = 'none'; }}
                onDrop={(e) => { e.currentTarget.style.border = 'none'; handleDrop(e, video.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', position: 'relative', overflow: 'hidden', transition: 'border 0.2s', border: '1px solid transparent' }}
              >
                <img src={video.thumbnail} alt="thumb" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <MarqueeTitle text={video.title} />
                  {video.lyricsPayload && (
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#7f5af0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🎵 Embedded with {video.lyricsPayload.title}
                    </p>
                  )}
                </div>
                <button onClick={() => removeFromQueue(video.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.4rem', padding: '0 5px', lineHeight: 1, flexShrink: 0 }} title="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', flexShrink: 0 }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#b3b3b3', fontSize: '0.9rem', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={queueEmbedThumbnail}
                onChange={(e) => setQueueEmbedThumbnail(e.target.checked)}
              />
              Embed Thumbnail (Audio)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="action-button download-button" style={{ flex: 1, background: '#7f5af0', color: '#fff', border: 'none', padding: '15px', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => downloadAll('opus')}>
                All (Opus)
              </button>
              <button className="action-button download-button" style={{ flex: 1, background: '#2cb67d', color: '#fff', border: 'none', padding: '15px', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => downloadAll('audio')}>
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
