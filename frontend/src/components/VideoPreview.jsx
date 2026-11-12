import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Share2,
  Film,
  Sparkles,
  MoveVertical,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Sliders,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from './SocialIcons';

export default function VideoPreview({
  renderedVideoUrl,
  originalVideoUrl,
  downloadUrl,
  onOpenPublishYouTube,
  onOpenPublishInstagram,
  title,
  options = {},
  setOptions,
  backgrounds = []
}) {
  // If rendered video becomes available, default to 'rendered', otherwise default to 'studio'
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'rendered' | 'original'
  const [isMuted, setIsMuted] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const phoneContainerRef = useRef(null);

  // Auto-switch to rendered tab when a new render completes
  useEffect(() => {
    if (renderedVideoUrl) {
      setActiveTab('rendered');
    } else if (originalVideoUrl) {
      setActiveTab('studio');
    }
  }, [renderedVideoUrl, originalVideoUrl]);

  if (!renderedVideoUrl && !originalVideoUrl) {
    return (
      <div className="glass-panel rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center min-h-[500px] border border-dashed border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-500/10">
          <Film className="w-8 h-8 opacity-70" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">
          Interactive Video Cropper & Preview
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Extract a Reddit video link or upload a clip. It will instantly appear in the 9:16 cropping area with the Crimson Aesthetic background, ready for custom positioning.
        </p>
      </div>
    );
  }

  // Find active background asset
  const currentBgId = options.background_video_id || 'crimson_art';
  const currentBgItem = backgrounds.find((b) => b.id === currentBgId);
  const bgImgUrl =
    currentBgId === 'crimson_art'
      ? '/api/backgrounds/file/crimson_art.jpg'
      : currentBgItem?.preview_url || '/api/backgrounds/file/crimson_art.jpg';

  // Interactive Drag-to-position handlers
  const handlePointerDown = (e) => {
    if (activeTab !== 'studio') return;
    setIsDragging(true);
    updatePosYFromPointer(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || activeTab !== 'studio') return;
    updatePosYFromPointer(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updatePosYFromPointer = (e) => {
    if (!phoneContainerRef.current || !setOptions) return;
    const rect = phoneContainerRef.current.getBoundingClientRect();
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientY === undefined) return;
    const offsetY = clientY - rect.top;
    const pct = Math.round((offsetY / rect.height) * 100);
    // Clamp vertical position between 5% and 65%
    const clamped = Math.max(5, Math.min(65, pct));
    setOptions((prev) => ({ ...prev, custom_pos_y: clamped }));
  };

  // Quick reset to reference layout
  const handleResetToReference = () => {
    if (!setOptions) return;
    setOptions((prev) => ({
      ...prev,
      reframe_mode: 'custom_crop',
      background_video_id: 'crimson_art',
      custom_pos_y: 12,
      custom_scale: 86,
      custom_zoom: 1.0,
      custom_aspect: '1:1',
      custom_border_radius: 16,
      custom_shadow: true,
    }));
  };

  const posY = options.custom_pos_y ?? 12;
  const scalePct = options.custom_scale ?? 86;
  const zoom = options.custom_zoom ?? 1.0;
  const borderRadius = options.custom_border_radius ?? 16;
  const hasShadow = options.custom_shadow !== false;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
      {/* Header and Mode Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              Step 3: Studio Cropper & Preview
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {activeTab === 'rendered' ? 'Repurposed Video Player' : 'Live Cropping Canvas'}
            </h2>
          </div>

          {/* Mute/Audio toggle for preview */}
          {originalVideoUrl && (
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-white/10 w-full">
          {renderedVideoUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('rendered')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'rendered'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Final Render (MP4)</span>
            </button>
          )}

          {originalVideoUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-300" />
              <span>Live Cropping Studio</span>
            </button>
          )}

          {originalVideoUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'original'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Raw 16:9</span>
            </button>
          )}
        </div>
      </div>

      {/* 9:16 Smartphone Mockup Preview Frame */}
      <div className="flex flex-col items-center justify-center">
        <div
          ref={phoneContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 border-4 border-slate-800 shadow-2xl shadow-purple-500/10 select-none touch-none cursor-default"
        >
          {/* TAB 1: LIVE STUDIO CROPPING CANVAS (Matching Reference Image) */}
          {activeTab === 'studio' && (
            <div className="relative w-full h-full overflow-hidden">
              {/* Background Layer: Crimson Art or selected BG */}
              {options.reframe_mode === 'blur_background' ? (
                <video
                  src={originalVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-70"
                />
              ) : (
                <img
                  src={bgImgUrl}
                  alt="Background Artwork"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Subtle top & bottom shadow gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

              {/* Watermark Overlay (if enabled) */}
              {options.watermark_enabled && (
                <div
                  className={`absolute z-20 pointer-events-none px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 ${
                    options.watermark_position === 'top_left'
                      ? 'top-4 left-4'
                      : options.watermark_position === 'bottom_center'
                      ? 'bottom-6 left-1/2 -translate-x-1/2'
                      : options.watermark_position === 'bottom_right'
                      ? 'bottom-6 right-4'
                      : 'top-4 right-4'
                  }`}
                  style={{ opacity: options.watermark_opacity ?? 0.85 }}
                >
                  {options.watermark_text || '@viralclip.ai'}
                </div>
              )}

              {/* Top Reference Video Card (Draggable & Sliders) */}
              <div
                style={{
                  top: `${posY}%`,
                  left: '50%',
                  transform: 'translate(-50%, 0)',
                  width: `${scalePct}%`,
                  aspectRatio:
                    options.custom_aspect === '1:1'
                      ? '1 / 1'
                      : options.custom_aspect === '4:5'
                      ? '4 / 5'
                      : options.custom_aspect === '16:9'
                      ? '16 / 9'
                      : 'auto',
                  borderRadius: `${borderRadius}px`,
                  boxShadow: hasShadow
                    ? '0 16px 38px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.18)'
                    : 'none',
                }}
                className="absolute z-10 overflow-hidden bg-black transition-[top,width,border-radius] duration-75 cursor-grab active:cursor-grabbing group"
              >
                {/* Foreground Video with Zoom & Mirror */}
                <video
                  src={originalVideoUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                  style={{
                    transform: `${options.horizontal_flip ? 'scaleX(-1) ' : ''}scale(${zoom})`,
                    filter: options.color_grade ? 'contrast(1.1) saturate(1.15)' : 'none',
                  }}
                />

                {/* Subtitle / Caption Burn Preview (Matches Reference: "ye rangoli hai, mai bhi") */}
                {options.auto_captions && (
                  <div className="absolute bottom-2.5 inset-x-2 text-center pointer-events-none z-20">
                    <span
                      className={`font-black text-[12px] px-2 py-0.5 rounded ${
                        options.caption_style === 'viral_yellow'
                          ? 'text-yellow-300'
                          : options.caption_style === 'neon_green'
                          ? 'text-emerald-300'
                          : options.caption_style === 'cyan_pop'
                          ? 'text-cyan-300'
                          : 'text-white'
                      }`}
                      style={{
                        textShadow:
                          '0 2px 4px #000, 0 -1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 0 8px rgba(0,0,0,0.9)',
                      }}
                    >
                      ye rangoli hai, mai bhi
                    </span>
                  </div>
                )}

                {/* Drag Handle Indicator */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-white/90 flex items-center gap-1 pointer-events-none">
                  <MoveVertical className="w-3 h-3 text-purple-400" />
                  <span>Drag to reposition</span>
                </div>
              </div>

              {/* Status Indicator Pill */}
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 pointer-events-none z-20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Reference Framing • {posY}% Y</span>
              </div>
            </div>
          )}

          {/* TAB 2: FINAL RENDERED MP4 (FFmpeg Output) */}
          {activeTab === 'rendered' && (
            <div className="relative w-full h-full">
              {renderedVideoUrl ? (
                <video
                  key={renderedVideoUrl}
                  src={renderedVideoUrl}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  Video rendering...
                </div>
              )}
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-white/10 pointer-events-none z-20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Repurposed MP4</span>
              </div>
            </div>
          )}

          {/* TAB 3: ORIGINAL RAW 16:9 VIDEO */}
          {activeTab === 'original' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                key={originalVideoUrl}
                src={originalVideoUrl}
                controls
                playsInline
                className="w-full aspect-video object-contain"
              />
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-slate-300 uppercase tracking-wider border border-white/10 pointer-events-none z-20">
                Original Raw
              </div>
            </div>
          )}
        </div>

        {/* Live Studio Quick Reposition Bar */}
        {activeTab === 'studio' && (
          <div className="w-full max-w-[340px] mt-3 p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MoveVertical className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] font-semibold">Position: {posY}%</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOptions?.((p) => ({ ...p, custom_pos_y: Math.max(5, (p.custom_pos_y || 12) - 4) }))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium"
              >
                ▲ Up
              </button>
              <button
                type="button"
                onClick={() => setOptions?.((p) => ({ ...p, custom_pos_y: Math.min(65, (p.custom_pos_y || 12) + 4) }))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium"
              >
                ▼ Down
              </button>
              <button
                type="button"
                onClick={handleResetToReference}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-all ml-1"
                title="Reset exactly to reference layout"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Ref</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Download & Social Distribution CTAs */}
      {renderedVideoUrl && (
        <div className="space-y-3 pt-2">
          {/* Download Button */}
          <a
            href={downloadUrl || renderedVideoUrl}
            download="clipnova_viral_short.mp4"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm border border-emerald-400/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>Download Repurposed MP4 (1080p HD)</span>
          </a>

          {/* Social Auto-Publish Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onOpenPublishYouTube}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-red-600/20"
            >
              <YoutubeIcon className="w-4 h-4" />
              <span>Publish to YouTube Shorts</span>
            </button>

            <button
              onClick={onOpenPublishInstagram}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-600 hover:from-pink-500 hover:via-purple-500 hover:to-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-pink-600/20"
            >
              <InstagramIcon className="w-4 h-4" />
              <span>Publish to Instagram Reels</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
