import React, { useState, useRef } from 'react';
import {
  Link2,
  Sparkles,
  ArrowRight,
  Video,
  User,
  Clock,
  CheckCircle,
  RefreshCw,
  UploadCloud,
  FileVideo,
  FolderOpen
} from 'lucide-react';

export default function UrlExtractor({
  onExtract,
  onUpload,
  onLoadDemo,
  isExtracting,
  uploadProgress,
  extractedVideo,
  onReset
}) {
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onExtract(url.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (err) {
      // Clipboard access denied or unsupported
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset file input so user can select same file again if desired
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const isUploading = uploadProgress !== null && uploadProgress !== undefined;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/15 transition-all duration-700" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-600/15 transition-all duration-700" />

      <div className="relative z-10">
        {/* Header & Demo Clip Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
              Step 1: Video Ingestion
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Reddit & Video Ingestion Engine
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Paste any Reddit video or short share link, or upload your own video file directly.
            </p>
          </div>

          <button
            type="button"
            onClick={onLoadDemo}
            disabled={isExtracting || isUploading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Load Demo Viral Clip (1-Click)</span>
          </button>
        </div>

        {/* Input Method Switcher Tabs */}
        <div className="flex items-center gap-2 mb-4 p-1 rounded-2xl bg-slate-900/80 border border-white/5 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'url'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Paste Video Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Video File</span>
          </button>
        </div>

        {/* Tab 1: URL Input Form */}
        {activeTab === 'url' && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Link2 className="w-5 h-5 text-purple-400/80" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.reddit.com/r/.../comments/... or /s/... or v.redd.it"
                  disabled={isExtracting}
                  className="glass-input w-full pl-11 pr-24 py-3.5 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Paste
                </button>
              </div>

              <button
                type="submit"
                disabled={isExtracting || !url.trim()}
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting HD Streams...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Video</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 pl-2">
              Supports Reddit share links (<code className="text-purple-300">/s/xxxx</code>), standard posts, YouTube Shorts, and TikTok clips.
            </p>
          </form>
        )}

        {/* Tab 2: Direct Video File Upload & Dropzone */}
        {activeTab === 'upload' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.avi,.m4v"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-purple-400 bg-purple-500/15 shadow-xl shadow-purple-500/20 scale-[1.01]'
                  : 'border-slate-700/80 hover:border-purple-500/50 bg-slate-900/60 hover:bg-slate-900/90'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400 group-hover:scale-110 transition-transform">
                {isUploading ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>

              {isUploading ? (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-purple-300">
                    <span>Uploading Video...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-white">
                    Click to browse or drag & drop video file here
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports <span className="text-purple-300 font-medium">MP4, MOV, WebM, MKV</span> up to 500MB
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-white/5 transition-colors">
                    <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>Choose File from Computer</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Extracted / Uploaded Video Result Card */}
        {extractedVideo && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-inner flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Video className="w-7 h-7 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                    {extractedVideo.subreddit ? `r/${extractedVideo.subreddit}` : 'Uploaded Clip'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <User className="w-3 h-3 text-slate-500" />
                    {extractedVideo.author || 'Creator'}
                  </span>
                  {extractedVideo.duration > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {Math.round(extractedVideo.duration)}s
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white truncate mt-1">
                  {extractedVideo.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-emerald-400 flex items-center gap-1 justify-end">
                  <CheckCircle className="w-3.5 h-3.5" /> Ready for Editing
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {extractedVideo.width}x{extractedVideo.height} MP4
                </div>
              </div>
              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Change Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
