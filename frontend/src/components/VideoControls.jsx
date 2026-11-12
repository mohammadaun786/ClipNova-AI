import React, { useRef } from 'react';
import {
  Smartphone,
  Square,
  Monitor,
  Zap,
  Repeat,
  Palette,
  Shield,
  Type,
  Subtitles,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Flame,
  Check,
  Crop,
  Layers,
  Film,
  UploadCloud,
  CheckCircle2,
  Clock,
  MoveVertical,
  Maximize2,
  Sliders
} from 'lucide-react';

export default function VideoControls({
  options,
  setOptions,
  backgrounds = [],
  onUploadBackground,
  onStartRender,
  isRendering,
  disabled
}) {
  const bgUploadRef = useRef(null);

  const updateOption = (key, val) => {
    setOptions((prev) => ({ ...prev, [key]: val }));
  };

  const handleCustomBgSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadBackground) {
      onUploadBackground(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400"></span>
            Step 2: Processing Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            FFmpeg Filters & AI Settings
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fast Export (~2x)</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Preset: Viral Shorts</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Target Aspect Ratio */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Target Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: '9:16', label: '9:16 Vertical', desc: 'Shorts, Reels, TikTok', icon: Smartphone },
              { id: '1:1', label: '1:1 Square', desc: 'Feed & Carousels', icon: Square },
              { id: '16:9', label: '16:9 Landscape', desc: 'Standard YouTube', icon: Monitor },
            ].map((ratio) => {
              const Icon = ratio.icon;
              const active = options.aspect_ratio === ratio.id;
              return (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => updateOption('aspect_ratio', ratio.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10 text-white'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
                    {active && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-xs font-bold text-white">{ratio.label}</div>
                  <div className="text-[10px] text-slate-500">{ratio.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Reframe & Crop Layout Options */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Reframe & Crop Style</span>
                <span className="text-[11px] text-slate-400">Choose how your video is cropped or framed</span>
              </div>
            </div>
            <span className="text-[11px] text-purple-400 font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
              {options.reframe_mode?.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {[
              {
                id: 'custom_crop',
                label: 'Custom Framing',
                desc: 'Top card framing & custom position',
                icon: Sparkles,
                badge: 'Ref Match'
              },
              {
                id: 'split_screen',
                label: 'Split-Screen',
                desc: 'Top clip + bottom background',
                icon: Film,
                badge: 'Hot'
              },
              {
                id: 'crop_to_fill',
                label: '9:16 Full Crop',
                desc: 'Crop to fill screen (No background)',
                icon: Crop,
                badge: 'Direct'
              },
              {
                id: 'blur_background',
                label: 'Blur Backdrop',
                desc: 'Original centered + blurred video',
                icon: Layers,
                badge: 'Classic'
              },
            ].map((mode) => {
              const Icon = mode.icon;
              const active = options.reframe_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    updateOption('reframe_mode', mode.id);
                    if (mode.id === 'split_screen' && (!options.background_video_id || options.background_video_id === 'blur')) {
                      updateOption('background_video_id', 'gameplay_1');
                    } else if (mode.id === 'custom_crop' && (!options.background_video_id || options.background_video_id === 'blur')) {
                      updateOption('background_video_id', 'crimson_art');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-600/20'
                      : 'bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      mode.badge === 'Ref Match'
                        ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {mode.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">{mode.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{mode.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Sub-Panel: Custom Cropping Studio when 'custom_crop' is selected */}
          {options.reframe_mode === 'custom_crop' && (
            <div className="pt-3 border-t border-purple-500/20 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Custom Cropping & Framing Controls
                  </span>
                </div>
                <span className="text-[10px] text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                  Matches Reference Style
                </span>
              </div>

              {/* Vertical Position (Y) Slider */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MoveVertical className="w-3.5 h-3.5 text-purple-400" />
                    Vertical Position (Y Offset)
                  </span>
                  <span className="font-mono text-purple-300 font-bold">
                    {options.custom_pos_y ?? 12}% from top
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="65"
                  step="1"
                  value={options.custom_pos_y ?? 12}
                  onChange={(e) => updateOption('custom_pos_y', parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                  {[
                    { label: 'Top Card (12% - Ref)', val: 12 },
                    { label: 'Upper-Mid (22%)', val: 22 },
                    { label: 'Center (36%)', val: 36 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateOption('custom_pos_y', preset.val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        (options.custom_pos_y ?? 12) === preset.val
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-semibold'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Card Width Scale Slider */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    Card Width & Size
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {options.custom_scale ?? 86}% of screen
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={options.custom_scale ?? 86}
                  onChange={(e) => updateOption('custom_scale', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Quick Size:</span>
                  {[
                    { label: 'Ref Width (86%)', val: 86 },
                    { label: 'Wide (94%)', val: 94 },
                    { label: 'Full Bleed (100%)', val: 100 },
                    { label: 'Compact (75%)', val: 75 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => updateOption('custom_scale', s.val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        (options.custom_scale ?? 86) === s.val
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Zoom & Aspect Ratio Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zoom / Crop Focus */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Video Zoom</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(options.custom_zoom ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={options.custom_zoom ?? 1.0}
                    onChange={(e) => updateOption('custom_zoom', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1.0, 1.25, 1.5].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => updateOption('custom_zoom', z)}
                        className={`text-[10px] px-2 py-0.5 rounded border flex-1 text-center transition-all ${
                          Math.abs((options.custom_zoom ?? 1.0) - z) < 0.04
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-semibold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {z === 1.0 ? '1.0x (Fit)' : `${z}x`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Aspect Ratio */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Card Aspect Ratio</span>
                    <span className="font-mono text-purple-300 font-bold">
                      {options.custom_aspect || '1:1'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { id: '1:1', label: '1:1 Square (Ref)' },
                      { id: '4:5', label: '4:5 Social' },
                      { id: '16:9', label: '16:9 Landscape' },
                      { id: 'original', label: 'Source Ratio' },
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => updateOption('custom_aspect', asp.id)}
                        className={`text-[10px] py-1 px-1.5 rounded border text-center transition-all ${
                          (options.custom_aspect || '1:1') === asp.id
                            ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-semibold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Corner Radius & Shadow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Corner Radius */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Rounded Corners</span>
                    <span className="font-mono text-slate-400 font-bold">
                      {options.custom_border_radius ?? 16}px
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: 'Rounded 16px (Ref)', val: 16 },
                      { label: 'Extra 24px', val: 24 },
                      { label: 'Sharp 0px', val: 0 },
                    ].map((cr) => (
                      <button
                        key={cr.val}
                        type="button"
                        onClick={() => updateOption('custom_border_radius', cr.val)}
                        className={`text-[10px] px-2 py-1 rounded border flex-1 text-center transition-all ${
                          (options.custom_border_radius ?? 16) === cr.val
                            ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-semibold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floating Card Shadow & Outline */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Floating Shadow</span>
                    <span className="text-[10px] text-slate-500">Adds deep shadow and crisp card outline</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.custom_shadow !== false}
                      onChange={(e) => updateOption('custom_shadow', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Option: Crop Alignment when 'crop_to_fill' is selected */}
          {options.reframe_mode === 'crop_to_fill' && (
            <div className="pt-2 border-t border-white/5 animate-in fade-in duration-200">
              <label className="block text-[11px] font-medium text-slate-300 mb-2">
                Crop Alignment (Focus Area)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'center', label: 'Center Crop (Recommended)' },
                  { id: 'left', label: 'Left Side' },
                  { id: 'right', label: 'Right Side' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateOption('crop_position', pos.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                      options.crop_position === pos.id
                        ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Dynamic Background Video & Art Selector */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Background Videos & Aesthetic Art</span>
                <span className="text-[11px] text-slate-400">High-retention vertical gameplay, anime loops & crimson art</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => bgUploadRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>+ Custom BG / Art</span>
            </button>
            <input
              ref={bgUploadRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
              onChange={handleCustomBgSelect}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {backgrounds.map((bg) => {
              const active = options.background_video_id === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    updateOption('background_video_id', bg.id);
                    if (bg.id === 'blur' && options.reframe_mode !== 'blur_background') {
                      updateOption('reframe_mode', 'blur_background');
                    } else if (bg.type === 'image' && options.reframe_mode !== 'custom_crop') {
                      updateOption('reframe_mode', 'custom_crop');
                    }
                  }}
                  className={`group relative rounded-xl border overflow-hidden text-left transition-all ${
                    active
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20'
                      : 'border-white/10 hover:border-white/20 bg-slate-950/60'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {bg.preview_url ? (
                      <img
                        src={bg.preview_url}
                        alt={bg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
                        <Layers className="w-5 h-5 text-purple-400 mb-1" />
                        <span className="text-[10px] text-slate-400 font-medium">Blur Original</span>
                      </div>
                    )}
                    {bg.id === 'crimson_art' && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-[8px] font-bold text-white uppercase tracking-wider shadow">
                        Ref Art
                      </div>
                    )}
                    {active && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {bg.duration ? (
                      <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                        {Math.round(bg.duration)}s
                      </div>
                    ) : bg.type === 'image' ? (
                      <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-[9px] text-rose-200 font-medium">
                        Art Wallpaper
                      </div>
                    ) : null}
                  </div>
                  <div className="p-2 bg-slate-950/80">
                    <div className="text-[11px] font-bold text-white truncate">{bg.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{bg.category}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Speed & Duration Control */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Video Speed & Duration</span>
                <span className="text-[11px] text-slate-400">1.00x maintains the exact full Reddit duration</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-mono font-bold">
              {options.speed.toFixed(2)}x
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { val: 1.0, label: '1.00x (Original Duration)' },
              { val: 1.05, label: '1.05x (Subtle)' },
              { val: 1.08, label: '1.08x (Viral Retention)' },
              { val: 1.15, label: '1.15x (Fast)' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => updateOption('speed', item.val)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-medium border transition-all text-center ${
                  Math.abs(options.speed - item.val) < 0.01
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Anti-Copyright & Color Grading */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Anti-Copyright Safeguards</span>
                <span className="text-[11px] text-slate-500">Mirror video horizontally</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.horizontal_flip}
                onChange={(e) => updateOption('horizontal_flip', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-2">
              Color Grading Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['vibrant', 'punchy', 'cinematic', 'clean'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateOption('color_preset', preset)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                    options.color_preset === preset
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Dynamic Watermark */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Channel Handle / Logo Watermark</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.watermark_enabled}
                onChange={(e) => updateOption('watermark_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          {options.watermark_enabled && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <input
                type="text"
                value={options.watermark_text}
                onChange={(e) => updateOption('watermark_text', e.target.value)}
                placeholder="@yourhandle"
                className="glass-input w-full px-3.5 py-2 rounded-xl text-white text-xs focus:outline-none"
              />

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'top_right', label: 'Top Right' },
                  { id: 'top_left', label: 'Top Left' },
                  { id: 'bottom_center', label: 'Bottom Mid' },
                  { id: 'bottom_right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateOption('watermark_position', pos.id)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-medium border transition-all ${
                      options.watermark_position === pos.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7. Auto-Captions with Whisper */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Auto-Captions (Whisper AI)</span>
                <span className="text-[11px] text-slate-500">Transcribes & burns stylized bold captions</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.auto_captions}
                onChange={(e) => updateOption('auto_captions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {options.auto_captions && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'viral_yellow', label: 'Viral Yellow', color: 'bg-yellow-400' },
                  { id: 'neon_green', label: 'Neon Green', color: 'bg-emerald-400' },
                  { id: 'bold_white', label: 'Bold White', color: 'bg-white' },
                  { id: 'cyan_pop', label: 'Cyber Cyan', color: 'bg-cyan-400' },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateOption('caption_style', style.id)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      options.caption_style === style.id
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${style.color} shrink-0`}></span>
                    <span className="truncate">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Start Render CTA Button */}
        <button
          type="button"
          onClick={onStartRender}
          disabled={disabled || isRendering}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
          <span>Render 9:16 Repurposed Video</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
