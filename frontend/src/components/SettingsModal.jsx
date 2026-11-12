import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Key, Shield, HelpCircle, ExternalLink, Cpu } from 'lucide-react';
import axios from 'axios';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get('/api/health');
        setHealthData(res.data);
      } catch (err) {
        console.error('Failed to fetch health:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-500/30 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              API Keys & Engine Status
            </h3>
            <p className="text-xs text-slate-400">
              Configure your AI models and developer credentials in <code className="text-purple-300">.env</code>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Integration Status Cards */}
          <div className="space-y-2.5">
            {[
              {
                name: 'Google Gemini API',
                desc: 'Powers Viral Titles, SEO descriptions, and multimodal audio captions.',
                active: healthData?.integrations?.gemini,
                envKey: 'GEMINI_API_KEY'
              },
              {
                name: 'OpenAI Whisper & GPT API',
                desc: 'Whisper-1 audio speech-to-text transcription engine.',
                active: healthData?.integrations?.openai,
                envKey: 'OPENAI_API_KEY'
              },
              {
                name: 'YouTube Data API v3',
                desc: 'Enables 1-Click direct OAuth publishing to YouTube Shorts.',
                active: healthData?.integrations?.youtube_client,
                envKey: 'YOUTUBE_CLIENT_ID & SECRET'
              },
              {
                name: 'Instagram Graph API',
                desc: 'Enables 1-Click publishing to Instagram Reels.',
                active: healthData?.integrations?.instagram,
                envKey: 'INSTAGRAM_ACCESS_TOKEN'
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-white/5'
                    }`}>
                      {item.active ? 'CONNECTED' : 'MOCK / READY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                  <code className="text-[10px] text-purple-400 font-mono mt-1 block">
                    {item.envKey}
                  </code>
                </div>

                <div className="shrink-0 mt-1">
                  {item.active ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice */}
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">Full Offline & Sandbox Ready:</span> When external API keys are not provided, ClipNova runs with built-in heuristic viral copy engines, simulated OAuth publishing, and full local FFmpeg 9:16 video processing!
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
