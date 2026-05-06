import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DownloadModal = ({ isOpen, jobData, onClose }) => {
    const progress = jobData?.progress || 0;
    const status = jobData?.status || 'Processing...';
    const title = jobData?.title || 'Unknown Media';
    const eta = jobData?.eta || '';
    const speed = jobData?.speed || '';

    const isError = status.toLowerCase().includes('error');
    const isComplete = status === 'Completing' || progress >= 100;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && (isComplete || isError)) onClose();
        }}>
            <DialogContent className="sm:max-w-md bg-card/80 backdrop-blur-3xl border-white/10 shadow-3xl p-0 overflow-hidden">
                <div className={cn(
                    "h-2 w-full absolute top-0 left-0",
                    isError ? "bg-destructive/50" : "bg-primary/20"
                )}>
                    {!isComplete && !isError && (
                        <div className="h-full bg-primary animate-progress-glow" style={{ width: `${progress}%` }} />
                    )}
                </div>

                <div className="p-8 pt-10">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                            {isComplete ? (
                                <><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Finished!</>
                            ) : isError ? (
                                <><AlertCircle className="w-6 h-6 text-destructive" /> Error</>
                            ) : (
                                <><Download className="w-6 h-6 text-primary animate-bounce" /> Downloading</>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target File</span>
                                <Badge variant="secondary" className="font-mono text-[10px]">{Math.round(progress)}%</Badge>
                            </div>
                            <p className="text-sm font-bold truncate pr-4">{title}</p>
                        </div>

                        <div className="space-y-3">
                            <Progress value={progress} className="h-2.5 bg-white/5" />
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 italic">
                                <span>{status}</span>
                                {(speed || eta) && !isComplete && !isError && (
                                    <div className="flex gap-3">
                                        <span>{speed}</span>
                                        <span>{eta}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isError && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold leading-relaxed">
                                {status}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            {(isComplete || isError) ? (
                                <Button onClick={onClose} className="rounded-full px-8 shadow-lg shadow-primary/20">
                                    Continue
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 text-xs font-bold text-primary/60 animate-pulse italic">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Preparing your download...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isComplete && (
                    <div className="bg-emerald-500/10 p-4 border-t border-emerald-500/20 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">File is ready for you</span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DownloadModal;
