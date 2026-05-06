import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Music2, Copy, Download, ChevronLeft, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const LyricFetcher = ({ queuedVideos = [], onAssignLyrics }) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedLyrics, setSelectedLyrics] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [error, setError] = useState(null);
    const [showQueuePicker, setShowQueuePicker] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoadingSearch(true);
        setError(null);
        setSearchResults([]);
        setSelectedLyrics(null);

        try {
            const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSelectSong = async (song) => {
        setLoadingLyrics(true);
        setError(null);
        setSelectedLyrics(null);

        try {
            const urlParam = song.source === 'Genius' && song.url ? `&url=${encodeURIComponent(song.url)}` : '';
            const response = await fetch(`http://localhost:3001/api/lyrics?id=${song.id}&source=${song.source}${urlParam}`);
            if (!response.ok) {
                throw new Error('Failed to fetch lyrics');
            }
            const data = await response.json();
            setSelectedLyrics({
                ...data,
                song: data.song || song.name,
                artist: data.artist || song.artist
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingLyrics(false);
        }
    };

    const handleDownload = () => {
        if (!selectedLyrics) return;

        const content = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedLyrics.song} - ${selectedLyrics.artist}.lrc`.replace(/[\/\\?%*:|"<>]/g, '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleAssignToVideo = (videoId) => {
        const lrcContent = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
        const payload = {
            title: `${selectedLyrics.song} - ${selectedLyrics.artist}`,
            raw: lrcContent
        };
        onAssignLyrics(videoId, payload);
        setShowQueuePicker(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full min-h-0 animate-fade-in w-full">
            {/* LEFT PANEL: SEARCH & LIST */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 flex flex-col gap-4 bg-card/20 border rounded-3xl p-5 shadow-inner shrink-0",
                selectedLyrics && "hidden md:flex"
            )}>
                <form onSubmit={handleSearch} className="flex gap-2 w-full shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-9 bg-black/20"
                            placeholder="Find lyrics..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={loadingSearch} className="shadow-lg shadow-primary/20">
                        {loadingSearch ? <span className="animate-spin mr-2">◌</span> : "Search"}
                    </Button>
                </form>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                    {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            {error}
                        </div>
                    )}

                    {searchResults.length === 0 && !loadingSearch && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-3 mt-10">
                            <Music2 className="w-12 h-12" />
                            <p className="text-sm font-medium">Search for a song</p>
                        </div>
                    )}

                    {searchResults.map((song) => (
                        <Card
                            key={`${song.source}-${song.id}`}
                            className="bg-transparent hover:bg-white/[0.03] border-transparent hover:border-border/50 transition-all cursor-pointer group"
                            onClick={() => handleSelectSong(song)}
                        >
                            <div className="p-3 flex justify-between items-center">
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="font-bold text-sm truncate group-hover:text-primary transition-colors">{song.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                    {song.source}
                                </Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: LYRICS DISPLAY */}
            <div className={cn(
                "flex-1 flex flex-col bg-card/40 backdrop-blur-md rounded-3xl shadow-2xl border overflow-hidden relative",
                !selectedLyrics && !loadingLyrics && "hidden md:flex"
            )}>
                {loadingLyrics ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-sm font-medium text-primary tracking-widest animate-pulse">Converting to Romaji...</p>
                    </div>
                ) : selectedLyrics ? (
                    <div
                        className="flex flex-col h-full items-center p-6 md:p-8 animate-fade-in relative group"
                        draggable
                        onDragStart={(e) => {
                            const lrcContent = selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n');
                            const payload = {
                                title: `${selectedLyrics.song} - ${selectedLyrics.artist}`,
                                raw: lrcContent
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        }}
                        style={{ cursor: 'grab' }}
                    >
                        <div className="w-full flex items-center justify-between mb-6 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="md:hidden"
                                onClick={() => setSelectedLyrics(null)}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            
                            <div className="flex-1 text-center px-4">
                                <h2 className="text-2xl md:text-4xl font-black text-gradient tracking-tight">{selectedLyrics.song}</h2>
                                <h3 className="text-sm md:text-lg text-muted-foreground font-medium mt-1">{selectedLyrics.artist}</h3>
                            </div>

                            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse shrink-0">
                                <Sparkles className="w-3 h-3" />
                                <span>DRAG TO QUEUE</span>
                            </div>
                        </div>

                        <div className="flex-1 w-full overflow-y-auto px-4 md:px-12 py-8 text-center space-y-8 custom-scrollbar">
                            {selectedLyrics.lyrics.map((line, index) => (
                                <div key={index} className="group/line relative hover:bg-white/[0.02] rounded-2xl py-2 transition-all">
                                    {line.romaji && <div className="text-primary text-sm md:text-base font-bold mb-1 opacity-70 group-hover/line:opacity-100 transition-opacity">{line.romaji}</div>}
                                    {line.original && <div className="text-xl md:text-3xl font-bold tracking-tight">{line.original}</div>}
                                    {!line.original && !line.romaji && <div className="h-8"></div>}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3 w-full shrink-0 justify-center pt-6 border-t mt-4">
                            <Button
                                variant="outline"
                                className="rounded-full gap-2"
                                onClick={() => navigator.clipboard.writeText(selectedLyrics.lyrics.map(l => `${l.timestamp} ${l.romaji}`).join('\n'))}
                            >
                                <Copy className="w-4 h-4" /> Copy
                            </Button>

                            {queuedVideos.length > 0 && (
                                <Button
                                    variant="secondary"
                                    className="rounded-full gap-2 shadow-lg shadow-secondary/10"
                                    onClick={() => setShowQueuePicker(true)}
                                >
                                    <Send className="w-4 h-4" /> Apply
                                </Button>
                            )}

                            <Button
                                className="rounded-full gap-2 shadow-lg shadow-primary/20"
                                onClick={handleDownload}
                            >
                                <Download className="w-4 h-4" /> Save .lrc
                            </Button>
                        </div>

                        {/* MOBILE QUEUE PICKER OVERLAY */}
                        {showQueuePicker && (
                            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col p-8 animate-in fade-in slide-in-from-bottom-5">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold">Select Target</h3>
                                    <Button variant="ghost" size="icon" onClick={() => setShowQueuePicker(false)}>
                                        <X className="w-6 h-6" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                                    {queuedVideos.map(video => (
                                        <Card
                                            key={video.id}
                                            className="hover:border-primary transition-colors cursor-pointer"
                                            onClick={() => handleAssignToVideo(video.id)}
                                        >
                                            <div className="p-3 flex items-center gap-4">
                                                <img src={video.thumbnail} alt="" className="w-20 h-12 object-cover rounded-lg" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm truncate">{video.title}</div>
                                                    <div className="text-xs text-muted-foreground">{video.channel}</div>
                                                </div>
                                                {video.lyricsPayload && <Badge variant="primary" className="h-5">✓</Badge>}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                                <Button variant="secondary" className="mt-8" onClick={() => setShowQueuePicker(false)}>Cancel</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-5 opacity-20">
                        <Music2 className="w-24 h-24" />
                        <p className="text-xl font-bold tracking-tight">Select a song to view lyrics</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricFetcher;
