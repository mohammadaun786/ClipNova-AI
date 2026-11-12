import React from 'react';
import { RefreshCw, CheckCircle2, Film, Sparkles, Wand2, ShieldCheck } from 'lucide-react';

export default function RenderProgress({ jobStatus }) {
  if (!jobStatus || jobStatus.status === 'pending') return null;

  const progress = jobStatus.progress || 0;

  const stages = [
    { threshold: 10, label: 'Download & Stream Merging (yt-dlp)', icon: Film },
    { threshold: 30, label: 'Audio Extraction & Whisper Captions', icon: Wand2 },
    { threshold: 75, label: 'FFmpeg 9:16 Blurred Background & Filters', icon: ShieldCheck },
    { threshold: 95, label: 'AI Metadata & Viral SEO Generation', icon: Sparkles },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-purple-500/30">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Repurposing in Progress...
              </h3>
              <p className="text-xs text-purple-300 font-medium">
                {jobStatus.message || 'Executing rendering pipeline...'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-mono">
              {progress}%
            </span>
          </div>
        </div>

        {/* Glowing Progress Bar */}
        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-white/10 mb-6">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300 relative shadow-lg shadow-purple-500/50"
            style={{ width: `${Math.max(5, progress)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isDone = progress >= stage.threshold;
            const isCurrent = progress < stage.threshold && (i === 0 || progress >= stages[i - 1].threshold);

            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/10'
                    : 'bg-slate-900/30 border-white/5 text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="text-xs font-medium truncate">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
