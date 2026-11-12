import React from 'react';
import { Sparkles, Sliders, Play, Video, Cpu, ShieldCheck } from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from './SocialIcons';

export default function Header({
  onOpenSettings,
  backendOnline,
  publishStatus,
  onOpenPublishYouTube,
  onOpenPublishInstagram
}) {
  const isIgConnected = Boolean(publishStatus?.instagram?.connected);
  const isYtConnected = Boolean(publishStatus?.youtube?.authenticated);

  return (
    <header className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${backendOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                ClipNova AI
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Turn Reddit Landscape Videos into Viral Shorts & Reels in Seconds
            </p>
          </div>
        </div>

        {/* Status badges & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Account Status Pills */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Instagram Account Pill */}
            <button
              type="button"
              onClick={onOpenPublishInstagram}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isIgConnected
                  ? 'bg-pink-500/15 border-pink-500/30 text-pink-200 hover:bg-pink-500/25'
                  : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
              {isIgConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="truncate max-w-[120px]">{publishStatus?.instagram?.username || 'Connected'}</span>
                </>
              ) : (
                <span>Connect IG</span>
              )}
            </button>

            {/* YouTube Account Pill */}
            <button
              type="button"
              onClick={onOpenPublishYouTube}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isYtConnected
                  ? 'bg-red-500/15 border-red-500/30 text-red-200 hover:bg-red-500/25'
                  : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              <YoutubeIcon className="w-3.5 h-3.5 text-red-400" />
              {isYtConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="truncate max-w-[120px]">{publishStatus?.youtube?.channel_title || 'Connected'}</span>
                </>
              ) : (
                <span>Connect YT</span>
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>FFmpeg 9.0</span>
            <span className="text-slate-600">|</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Anti-Copyright</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm hover:shadow-purple-500/10"
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">API Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
