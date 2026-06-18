import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2, AlertCircle, Loader2, Sparkles, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MarqueeTitle from './MarqueeTitle';

const DownloadModal = ({ isOpen, jobs = [], jobData, onClose }) => {
    const jobsList = Array.isArray(jobs) ? jobs : (jobData ? [jobData] : []);
    
    const totalJobs = jobsList.length;
    const completedJobs = jobsList.filter(j => j.progress >= 100 || j.status === 'Completing').length;
    const errorJobs = jobsList.filter(j => j.status?.toLowerCase().includes('error')).length;
    
    const overallProgress = totalJobs > 0
        ? jobsList.reduce((sum, j) => sum + (j.progress || 0), 0) / totalJobs
        : 0;

    const isAllComplete = totalJobs > 0 && (completedJobs + errorJobs === totalJobs);
    const isAllError = totalJobs > 0 && (errorJobs === totalJobs);
    const hasError = errorJobs > 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && (isAllComplete || isAllError || !jobsList.some(j => j.status === 'Downloading' || j.status === 'Connecting...'))) onClose();
        }}>
            <DialogContent className="sm:max-w-lg bg-card/85 backdrop-blur-3xl border-white/10 shadow-3xl p-0 overflow-hidden">
                <div className={cn(
                    "h-2 w-full absolute top-0 left-0 transition-all duration-300",
                    isAllError ? "bg-destructive/50" : hasError ? "bg-amber-500/30" : "bg-primary/20"
                )}>
                    {!isAllComplete && !isAllError && (
                        <div className="h-full bg-primary animate-progress-glow transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                    )}
                </div>

                <div className="p-8 pt-10">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                            {isAllComplete ? (
                                hasError ? (
                                    <><CheckCircle2 className="w-6 h-6 text-amber-500" /> Finished with Errors</>
                                ) : (
                                    <><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Finished!</>
                                )
                            ) : isAllError ? (
                                <><AlertCircle className="w-6 h-6 text-destructive" /> Error</>
                            ) : (
                                <><Download className="w-6 h-6 text-primary animate-bounce" /> Downloading Queue</>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Overall Progress Summary */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {isAllComplete ? 'Queue Downloaded' : 'Overall Progress'}
                                </span>
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                    {Math.round(overallProgress)}% ({completedJobs}/{totalJobs})
                                </Badge>
                            </div>
                            <Progress value={overallProgress} className="h-2.5 bg-white/5" />
                        </div>

                        {/* Detailed Jobs List */}
                        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                            {jobsList.map((job, idx) => {
                                const progress = job.progress || 0;
                                const status = job.status || 'Waiting...';
                                const title = job.title || 'Unknown Media';
                                const speed = job.speed || '';
                                const eta = job.eta || '';
                                
                                const isJobError = status.toLowerCase().includes('error');
                                const isJobComplete = status === 'Completing' || progress >= 100;
                                const isJobActive = !isJobComplete && !isJobError && status !== 'Waiting...';

                                return (
                                    <div key={job.id || idx} className={cn(
                                        "p-3.5 rounded-2xl border transition-all duration-300 flex items-center gap-4",
                                        isJobActive ? "bg-white/[0.03] border-primary/30 shadow-md shadow-primary/5" : 
                                        isJobComplete ? "bg-emerald-500/5 border-emerald-500/10 opacity-80" : 
                                        isJobError ? "bg-destructive/5 border-destructive/15" : 
                                        "bg-transparent border-white/5 opacity-40"
                                    )}>
                                        {/* Thumbnail or Music Icon */}
                                        <div className="relative w-12 h-8 shrink-0 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                            {job.video?.thumbnail ? (
                                                <img src={job.video.thumbnail} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Music2 className="w-4 h-4 text-muted-foreground/60" />
                                            )}
                                            {isJobActive && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Job Details */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-center gap-3 min-w-0">
                                                <div className="flex-1 min-w-0">
                                                    <MarqueeTitle text={title} className="text-xs font-extrabold text-foreground" />
                                                </div>
                                                <span className="text-[10px] font-mono font-black text-muted-foreground/80 shrink-0">
                                                    {Math.round(progress)}%
                                                </span>
                                            </div>

                                            {isJobActive && (
                                                <Progress value={progress} className="h-1 bg-white/5 mt-1.5" />
                                            )}

                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-1 italic">
                                                <span className={cn(
                                                    "transition-colors duration-250",
                                                    isJobComplete ? "text-emerald-400 not-italic font-black" :
                                                    isJobError ? "text-destructive not-italic font-black" :
                                                    isJobActive ? "text-primary animate-pulse" : "text-muted-foreground/40"
                                                )}>
                                                    {status}
                                                </span>
                                                {isJobActive && (speed || eta) && (
                                                    <div className="flex gap-2.5 font-sans font-extrabold">
                                                        <span>{speed}</span>
                                                        <span>{eta}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {isJobError && (
                                                <div className="mt-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[9px] font-bold leading-normal break-all">
                                                    {status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 flex justify-end">
                            {isAllComplete || isAllError ? (
                                <Button onClick={onClose} className="rounded-full px-8 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105">
                                    Continue
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 text-xs font-bold text-primary/60 animate-pulse italic">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Downloading track {completedJobs + 1} of {totalJobs}...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isAllComplete && !hasError && (
                    <div className="bg-emerald-500/10 p-4 border-t border-emerald-500/20 flex items-center justify-center gap-2 animate-pulse">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">All Files are ready for you</span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DownloadModal;
