import { useState, useRef, useEffect } from 'react';
import './index.css';
import LyricFetcher from './components/LyricFetcher';
import YouTubeFetcher from './components/YouTubeFetcher';
import YouTubeSearch from './components/YouTubeSearch';
import DownloadModal from './components/DownloadModal';
import MarqueeTitle from './components/MarqueeTitle';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Play, Search, Trash2, X, ListMusic, Download } from "lucide-react";
import { cn } from "@/lib/utils";

function App() {
  const [currentView, setCurrentView] = useState('lyrics');
  const [queuedVideos, setQueuedVideos] = useState([]);
  const [queueEmbedThumbnail, setQueueEmbedThumbnail] = useState(false);
  const [externalSelectedVideo, setExternalSelectedVideo] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  // Download & Progress State
  const [downloadJobs, setDownloadJobs] = useState([]);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const pollingInterval = useRef(null);
  const isQueueDownloading = useRef(false);

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

  const triggerDownloadWithJobId = (url, type, clientJobId, options = {}) => {
    const { embedThumbnail, jobId, startTime, endTime } = options;

    let downloadUrl = `http://localhost:3001/api/ytdl/download?url=${encodeURIComponent(url)}&type=${type}&clientJobId=${clientJobId}`;
    if (embedThumbnail) downloadUrl += `&embedThumbnail=true`;
    if (jobId) downloadUrl += `&jobId=${jobId}`;
    if (startTime !== undefined) downloadUrl += `&startTime=${startTime}`;
    if (endTime !== undefined) downloadUrl += `&endTime=${endTime}`;

    console.log('Initiating download:', downloadUrl);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 600000);
  };

  const triggerDownload = (url, type, options = {}) => {
    const clientJobId = 'job_' + Math.random().toString(36).substring(2, 11);
    
    const matchedVideo = queuedVideos.find(v => v.url === url || v.id === url.match(/[?&]v=([^&]+)/)?.[1]);

    const newJob = {
      id: clientJobId,
      video: matchedVideo || null,
      status: 'Connecting...',
      progress: 0,
      title: matchedVideo?.title || 'Requesting server...',
      eta: '',
      speed: ''
    };

    setDownloadJobs([newJob]);
    setIsDownloadModalOpen(true);

    triggerDownloadWithJobId(url, type, clientJobId, options);
    startPolling(clientJobId);
  };

  const startPolling = (jobId) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/ytdl/progress/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setDownloadJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...data } : j));

          if (data.status === 'Completing' || data.status.startsWith('Error')) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        } else {
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
    isQueueDownloading.current = false;
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const downloadAll = async (type) => {
    isQueueDownloading.current = true;

    // Generate job objects for all items in the queue
    const initialJobs = queuedVideos.map(video => ({
      id: 'job_' + Math.random().toString(36).substring(2, 11),
      video,
      status: 'Waiting...',
      progress: 0,
      title: video.title,
      eta: '',
      speed: ''
    }));

    setDownloadJobs(initialJobs);
    setIsDownloadModalOpen(true);

    for (let i = 0; i < initialJobs.length; i++) {
      if (!isQueueDownloading.current) break;

      const job = initialJobs[i];
      const { video, id: clientJobId } = job;

      setDownloadJobs(prev => prev.map(j => j.id === clientJobId ? { ...j, status: 'Connecting...' } : j));

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

      if (!isQueueDownloading.current) break;

      triggerDownloadWithJobId(video.url, type, clientJobId, {
        embedThumbnail: queueEmbedThumbnail,
        jobId: lyricsJobId
      });

      // Poll this specific job until it completes or errors out
      await new Promise(resolve => {
        const poll = setInterval(async () => {
          if (!isQueueDownloading.current) {
            clearInterval(poll);
            resolve();
            return;
          }

          try {
            const res = await fetch(`http://localhost:3001/api/ytdl/progress/${clientJobId}`);
            if (res.ok) {
              const data = await res.json();
              setDownloadJobs(prev => prev.map(j => j.id === clientJobId ? { ...j, ...data } : j));

              if (data.status === 'Completing' || data.status.startsWith('Error')) {
                clearInterval(poll);
                resolve();
              }
            }
          } catch (err) {
            console.error("Polling error:", err);
            clearInterval(poll);
            resolve();
          }
        }, 1000);
      });

      if (!isQueueDownloading.current) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    isQueueDownloading.current = false;
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
    <div className="flex flex-col lg:flex-row w-screen h-screen overflow-hidden bg-background text-foreground gap-0 relative">
      {/* MAIN CONTENT AREA */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden relative transition-all duration-300",
        isQueueOpen && "lg:opacity-100 opacity-40 scale-[0.98] blur-[2px] lg:blur-0"
      )}>
        {/* Header */}
        <header className="h-16 border-b bg-card/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 primary-gradient rounded-xl shadow-lg shadow-primary/20">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gradient">Hikarigoe</h1>
          </div>

          <Tabs value={currentView} onValueChange={setCurrentView} className="w-auto">
            <TabsList className="bg-white/5 border border-white/5">
              <TabsTrigger value="lyrics" className="gap-2">
                <Music2 className="w-4 h-4" />
                <span className="hidden sm:inline">Lyrics</span>
              </TabsTrigger>
              <TabsTrigger value="youtube-dl" className="gap-2">
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">URL</span>
              </TabsTrigger>
              <TabsTrigger value="youtube-search" className="gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsQueueOpen(!isQueueOpen)}
            >
              <ListMusic className="w-5 h-5" />
              {queuedVideos.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]" variant="destructive">
                  {queuedVideos.length}
                </Badge>
              )}
            </Button>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative bg-black/20 p-4 md:p-6">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
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
            {currentView === 'youtube-dl' && (
              <YouTubeFetcher 
                addToQueue={addToQueue} 
                queuedVideos={queuedVideos} 
                triggerDownload={triggerDownload} 
              />
            )}
            {currentView === 'youtube-search' && (
              <YouTubeSearch 
                addToQueue={addToQueue} 
                queuedVideos={queuedVideos} 
                externalSelectedVideo={externalSelectedVideo} 
                triggerDownload={triggerDownload} 
              />
            )}
          </div>
        </div>
      </main>

      {/* QUEUE SIDEBAR */}
      <aside className={cn(
        "fixed lg:relative z-40 inset-y-0 right-0 w-[85vw] sm:w-80 lg:w-80 h-full border-l bg-card/50 backdrop-blur-2xl transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
        isQueueOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Queue</h3>
            <Badge variant="secondary">{queuedVideos.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setQueuedVideos([])}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setIsQueueOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
          {queuedVideos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-30">
              <ListMusic className="w-12 h-12" />
              <p className="text-sm font-medium">Queue is empty</p>
            </div>
          ) : (
            queuedVideos.map(video => (
              <Card 
                key={video.id} 
                className="group relative overflow-hidden transition-all hover:border-primary/50 hover:bg-white/[0.02] cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary'); }}
                onDrop={(e) => { e.currentTarget.classList.remove('border-primary'); handleDrop(e, video.id); }}
                onClick={() => {
                  setCurrentView('youtube-search');
                  setExternalSelectedVideo(video);
                  if (window.innerWidth < 1024) setIsQueueOpen(false);
                }}
              >
                <div className="p-3 flex items-center gap-3">
                  <div className="relative w-16 h-10 shrink-0 rounded-md overflow-hidden shadow-md group/thumb">
                    <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                    <Button 
                      variant="primary" 
                      size="icon" 
                      className={cn(
                        "absolute inset-0 w-full h-full bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-none border-none",
                        previewId === video.id && "opacity-100 bg-primary/20"
                      )}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setPreviewId(previewId === video.id ? null : video.id); 
                      }}
                    >
                      {previewId === video.id ? (
                        <div className="flex gap-0.5 items-end h-3">
                          <div className="w-1 bg-white animate-bounce" style={{ animationDuration: '0.5s' }} />
                          <div className="w-1 bg-white animate-bounce" style={{ animationDuration: '0.8s' }} />
                          <div className="w-1 bg-white animate-bounce" style={{ animationDuration: '0.6s' }} />
                        </div>
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white" />
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <MarqueeTitle text={video.title} className="text-sm font-bold" />
                    {video.lyricsPayload ? (
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-tighter overflow-hidden">
                          <Badge variant="outline" className="h-4 px-1 text-[8px] border-primary/30 text-primary shrink-0">LYRICS</Badge>
                          <span className="truncate max-w-[100px]">{video.lyricsPayload.title}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 text-muted-foreground hover:text-destructive shrink-0 p-0"
                          onClick={(e) => { e.stopPropagation(); removeLyricsFromVideo(video.id); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground truncate">{video.channel}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(video.id); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {previewId && (
          <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex gap-0.5 items-end h-2 shrink-0">
                <div className="w-0.5 h-full bg-primary animate-bounce" style={{ animationDuration: '0.5s' }} />
                <div className="w-0.5 h-full bg-primary animate-bounce" style={{ animationDuration: '0.8s' }} />
                <div className="w-0.5 h-full bg-primary animate-bounce" style={{ animationDuration: '0.6s' }} />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">Previewing Audio...</span>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-primary/20" onClick={() => setPreviewId(null)}>
              <X className="w-3 h-3 text-primary" />
            </Button>
          </div>
        )}

        <div className="p-5 border-t bg-card/30 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Embed Thumb</span>
            <Switch 
              checked={queueEmbedThumbnail} 
              onCheckedChange={setQueueEmbedThumbnail} 
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 gap-2" size="sm" onClick={() => downloadAll('opus')}>
              <Download className="w-3.5 h-3.5" /> Opus
            </Button>
            <Button variant="primary" className="flex-1 gap-2" size="sm" onClick={() => downloadAll('audio')}>
              <Download className="w-3.5 h-3.5" /> MP3
            </Button>
          </div>
        </div>
      </aside>

      <DownloadModal isOpen={isDownloadModalOpen} jobs={downloadJobs} onClose={closeDownloadModal} />

      {/* Hidden Preview Player */}
      {previewId && (
        <iframe
          width="1"
          height="1"
          src={`https://www.youtube.com/embed/${previewId}?autoplay=1`}
          title="Audio Preview"
          frameBorder="0"
          allow="autoplay"
          className="hidden"
        ></iframe>
      )}
    </div>
  );
}

export default App;
