import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Hash,
  FileText,
  TrendingUp,
  Volume2,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';

export default function MetadataCard({ metadata, onSelectTitle, selectedTitle, onCopyText }) {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!metadata) return null;

  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    if (onCopyText) onCopyText(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const currentTitle = selectedTitle || metadata.selected_title || metadata.viral_titles?.[0];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            AI Content Strategist (Gemini / OpenAI)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Viral Metadata & SEO Package
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Hook Score: {metadata.hook_rating || 95}/100</span>
          </div>
        </div>
      </div>

      {/* 3 Viral Title Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
            <span>High-CTR Viral Title Options (Click to Select)</span>
          </label>
        </div>

        <div className="space-y-2">
          {metadata.viral_titles?.map((title, idx) => {
            const isSelected = currentTitle === title;
            return (
              <div
                key={idx}
                onClick={() => onSelectTitle(title)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold truncate">{title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(title, `title_${idx}`);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSection === `title_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEO Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>SEO-Optimized Description</span>
          </label>
          <button
            onClick={() => handleCopy(metadata.description, 'description')}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {copiedSection === 'description' ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Description</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
          {metadata.description}
        </div>
      </div>

      {/* Trending Hashtags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trending Hashtags ({metadata.hashtags?.length || 0})</span>
          </label>
          <button
            onClick={() => handleCopy(metadata.hashtags?.join(' '), 'hashtags')}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {copiedSection === 'hashtags' ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied All!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy All Tags</span>
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/5 max-h-28 overflow-y-auto">
          {metadata.hashtags?.map((tag, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium hover:bg-purple-500/20 cursor-pointer transition-colors"
              onClick={() => handleCopy(tag, `tag_${i}`)}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
