import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Globe,
  Lock,
  Eye,
  AlertCircle,
  Link2,
  Unlink,
  Check,
  Shield,
  HelpCircle,
  Hash,
  KeyRound,
  User,
  Mail
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from './SocialIcons';
import confetti from 'canvas-confetti';
import axios from 'axios';

const FIXED_INSTAGRAM_CAPTION = "#AIアート #AIイラスト #AI女子 #AI美女 #生成AI デジタルアート 幻想世界観 美少女 可愛い 創作 リール リール動画 おすすめ おすすめにのりたい";

export default function PublishModal({
  isOpen,
  onClose,
  jobId,
  platform, // 'youtube' or 'instagram'
  initialTitle,
  initialDescription,
  initialTags,
  publishStatus,
  onSuccess,
  onRefreshStatus
}) {
  if (!isOpen) return null;

  const isYouTube = platform === 'youtube';

  // YouTube State (As per video)
  const [ytTitle, setYtTitle] = useState(initialTitle || 'Viral Moment #Shorts');
  const [ytDescription, setYtDescription] = useState(initialDescription || '');
  const [privacyStatus, setPrivacyStatus] = useState('public');

  // Instagram State (Fixed Caption)
  const [shareToFeed, setShareToFeed] = useState(true);

  // Connection State for 1-Time Setup
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [igConnectMethod, setIgConnectMethod] = useState('credentials'); // 'credentials' or 'token'
  const [igUsername, setIgUsername] = useState('');
  const [igPassword, setIgPassword] = useState('');
  const [ig2faCode, setIg2faCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);

  // Instagram Token Fallback
  const [igAccountId, setIgAccountId] = useState('');
  const [igAccessToken, setIgAccessToken] = useState('');

  // YouTube Connection Form
  const [ytChannelTitle, setYtChannelTitle] = useState('');
  const [ytEmail, setYtEmail] = useState('');
  const [ytClientId, setYtClientId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Check if current platform is already connected
  const isIgConnected = Boolean(publishStatus?.instagram?.connected);
  const isYtConnected = Boolean(publishStatus?.youtube?.authenticated);
  const isConnected = isYouTube ? isYtConnected : isIgConnected;

  useEffect(() => {
    // If not connected, default to showing connection form
    if (!isConnected) {
      setShowConnectForm(true);
    } else {
      setShowConnectForm(false);
    }
  }, [isConnected, platform]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // 1-Time Instagram Connection (Username & Password or Token)
  const handleConnectInstagram = async (e) => {
    e?.preventDefault();
    setIsConnecting(true);
    setError(null);

    try {
      if (igConnectMethod === 'credentials') {
        if (!igUsername || !igPassword) {
          setError('Please provide your Instagram Username and Password.');
          setIsConnecting(false);
          return;
        }

        const res = await axios.post('/api/publish/accounts/instagram/connect', {
          username: igUsername.trim(),
          password: igPassword.trim(),
          verification_code: ig2faCode.trim() || undefined
        });

        if (res.data?.needs_2fa) {
          setNeeds2FA(true);
          setError('Two-Factor Authentication (2FA) required. Please enter your 2FA security code below.');
          setIsConnecting(false);
          return;
        }

        setShowConnectForm(false);
        setNeeds2FA(false);
        if (onRefreshStatus) onRefreshStatus();
      } else {
        // Token Method
        if (!igAccountId || !igAccessToken) {
          setError('Please provide Instagram Account ID and Graph Access Token.');
          setIsConnecting(false);
          return;
        }
        await axios.post('/api/publish/accounts/instagram/connect', {
          account_id: igAccountId.trim(),
          access_token: igAccessToken.trim(),
          username: igUsername.trim() || undefined
        });
        setShowConnectForm(false);
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err) {
      console.error('Connect Instagram error:', err);
      setError(err.response?.data?.detail || 'Failed to connect Instagram account. Please check credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  // 1-Time YouTube Connection (Channel Name / Google OAuth)
  const handleConnectYouTube = async (e) => {
    e?.preventDefault();
    setIsConnecting(true);
    setError(null);

    try {
      if (ytChannelTitle || ytEmail) {
        await axios.post('/api/publish/accounts/youtube/connect', {
          channel_title: ytChannelTitle.trim() || undefined,
          email: ytEmail.trim() || undefined,
          client_id: ytClientId.trim() || undefined
        });
        setShowConnectForm(false);
        if (onRefreshStatus) onRefreshStatus();
      } else {
        // Try OAuth URL
        const res = await axios.get('/api/publish/youtube/auth-url');
        if (res.data?.auth_url) {
          window.open(res.data.auth_url, '_blank', 'width=600,height=700');
          const pollInterval = setInterval(async () => {
            if (onRefreshStatus) {
              const updated = await onRefreshStatus();
              if (updated?.youtube?.authenticated) {
                clearInterval(pollInterval);
                setShowConnectForm(false);
              }
            }
          }, 2000);
          setTimeout(() => clearInterval(pollInterval), 60000);
        }
      }
    } catch (err) {
      console.error('Connect YouTube error:', err);
      setError(err.response?.data?.detail || 'Failed to connect YouTube account.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Account Handler
  const handleDisconnect = async () => {
    try {
      if (isYouTube) {
        await axios.post('/api/publish/accounts/youtube/disconnect');
      } else {
        await axios.post('/api/publish/accounts/instagram/disconnect');
      }
      setShowConnectForm(true);
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // 1-Click Publishing
  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      let res;
      if (isYouTube) {
        // YouTube: As per video metadata (custom title, description, tags)
        res = await axios.post('/api/publish/youtube', {
          job_id: jobId,
          title: ytTitle,
          description: ytDescription,
          tags: initialTags || ['Shorts', 'Viral', 'Trending'],
          privacy_status: privacyStatus
        });
      } else {
        // Instagram: strictly with the fixed Japanese viral caption
        res = await axios.post('/api/publish/instagram', {
          job_id: jobId,
          caption: FIXED_INSTAGRAM_CAPTION,
          share_to_feed: shareToFeed
        });
      }

      setResult(res.data);
      triggerConfetti();
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Publish error:', err);
      setError(err.response?.data?.detail || err.message || 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-500/30 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
            isYouTube
              ? 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/25'
              : 'bg-gradient-to-tr from-pink-600 via-purple-600 to-amber-500 shadow-lg shadow-pink-500/25'
          }`}>
            {isYouTube ? <YoutubeIcon className="w-6 h-6" /> : <InstagramIcon className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isYouTube ? 'Publish to YouTube Shorts' : 'Publish to Instagram Reels'}
              </h3>
              {isConnected && !showConnectForm && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isYouTube
                ? 'Dynamic Video Metadata • Resumable Upload'
                : '1-Click Direct Reels Upload • Japanese Viral Tagset'}
            </p>
          </div>
        </div>

        {/* VIEW 1: SUCCESS VIEW */}
        {result ? (
          <div className="space-y-6 text-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white">
                Published Successfully!
              </h4>
              <p className="text-xs text-emerald-300">
                {result.message}
              </p>
            </div>

            {result.post_url && (
              <a
                href={result.post_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/30 hover:scale-105"
              >
                <span>View Live on {result.platform}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : showConnectForm ? (
          /* VIEW 2: 1-TIME ACCOUNT CONNECTION SCREEN (USERNAME & PASSWORD) */
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-white">
                <Link2 className="w-4 h-4 text-purple-400" />
                <span>Connect Account (1-Time Setup)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Apna username aur password daal kar <strong>sirf ek baar connect karein</strong>. Uske baad account permanently save ho jayega aur aap direct 1-click me reels/shorts upload kar sakenge!
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* INSTAGRAM CONNECT FORM: USERNAME & PASSWORD */}
            {!isYouTube && (
              <form onSubmit={handleConnectInstagram} className="space-y-3.5">
                {/* Method Switcher */}
                <div className="flex p-1 bg-slate-900 rounded-xl border border-white/5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setIgConnectMethod('credentials'); setError(null); }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      igConnectMethod === 'credentials'
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Username & Password (Easy)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIgConnectMethod('token'); setError(null); }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      igConnectMethod === 'token'
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Meta Graph Token
                  </button>
                </div>

                {igConnectMethod === 'credentials' ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Instagram Username
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={igUsername}
                          onChange={(e) => setIgUsername(e.target.value)}
                          placeholder="your_instagram_username"
                          className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Instagram Password
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          required
                          value={igPassword}
                          onChange={(e) => setIgPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        🔒 Session cookies are stored locally on your PC. Never sent to any 3rd party.
                      </span>
                    </div>

                    {needs2FA && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in">
                        <label className="block text-[11px] font-bold text-amber-300">
                          2FA Security Verification Code
                        </label>
                        <input
                          type="text"
                          value={ig2faCode}
                          onChange={(e) => setIg2faCode(e.target.value)}
                          placeholder="6-digit security code"
                          className="glass-input w-full px-3.5 py-2 rounded-xl text-white text-xs focus:outline-none font-mono"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Instagram Account ID (Meta User ID)
                      </label>
                      <input
                        type="text"
                        required
                        value={igAccountId}
                        onChange={(e) => setIgAccountId(e.target.value)}
                        placeholder="e.g. 17841405309211000"
                        className="glass-input w-full px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Instagram Graph Access Token
                      </label>
                      <input
                        type="password"
                        required
                        value={igAccessToken}
                        onChange={(e) => setIgAccessToken(e.target.value)}
                        placeholder="EAAG..."
                        className="glass-input w-full px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging in & Saving Session...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Connect Instagram (Save Account)</span>
                      </>
                    )}
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setShowConnectForm(false)}
                      className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* YOUTUBE CONNECT FORM */}
            {isYouTube && (
              <form onSubmit={handleConnectYouTube} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    YouTube Channel Name or Handle
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={ytChannelTitle}
                      onChange={(e) => setYtChannelTitle(e.target.value)}
                      placeholder="@MyShortsChannel or Channel Name"
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Google / YouTube Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={ytEmail}
                      onChange={(e) => setYtEmail(e.target.value)}
                      placeholder="creator@gmail.com"
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Channel...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save YouTube Channel Connection</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase">Or Google 1-Click OAuth</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectYouTube}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2"
                >
                  <YoutubeIcon className="w-4 h-4" />
                  <span>Authenticate with Google OAuth</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* VIEW 3: DIRECT 1-CLICK UPLOAD (ACCOUNT ALREADY CONNECTED) */
          <div className="space-y-4 animate-in fade-in duration-200">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Connected Account Bar */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Target Account
                  </span>
                  <span className="text-xs font-bold text-white">
                    {isYouTube
                      ? publishStatus?.youtube?.channel_title || 'Connected YouTube Channel'
                      : publishStatus?.instagram?.username || '@connected_account'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConnectForm(true)}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium"
              >
                Switch Account
              </button>
            </div>

            {/* INSTAGRAM FIELDS: STRICTLY FIXED JAPANESE CAPTION */}
            {!isYouTube && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-pink-400" />
                      <span>Reel Caption & Hashtags</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Fixed Japanese Viral Tags</span>
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={4}
                      readOnly
                      value={FIXED_INSTAGRAM_CAPTION}
                      className="glass-input w-full p-3 rounded-xl text-white text-xs bg-slate-950/90 border border-pink-500/20 resize-none font-sans leading-relaxed select-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Instagram caption is locked to this exact Japanese AI art viral tagset. No other Reddit titles or text will be added.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <div>
                    <span className="text-xs font-medium text-slate-300 block">Share to Instagram Feed</span>
                    <span className="text-[10px] text-slate-500">Reel will appear on both your Reels tab and main grid</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={shareToFeed}
                    onChange={(e) => setShareToFeed(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* YOUTUBE FIELDS: DYNAMIC AS PER VIDEO */}
            {isYouTube && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Shorts Title (As per video)</span>
                    <span className="text-[10px] text-purple-400">AI Viral Hook</span>
                  </label>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Description & SEO Tags (As per video)
                  </label>
                  <textarea
                    rows={4}
                    value={ytDescription}
                    onChange={(e) => setYtDescription(e.target.value)}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-white text-xs focus:outline-none resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Privacy Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'public', label: 'Public', icon: Globe },
                      { id: 'unlisted', label: 'Unlisted', icon: Eye },
                      { id: 'private', label: 'Private', icon: Lock },
                    ].map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPrivacyStatus(p.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            privacyStatus === p.id
                              ? 'bg-red-500/20 border-red-500 text-white'
                              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* DIRECT 1-CLICK PUBLISH BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                  isYouTube
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-red-600/30'
                    : 'bg-gradient-to-r from-pink-600 via-purple-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 shadow-pink-600/30'
                }`}
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading {isYouTube ? 'Short' : 'Reel'} Live...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Upload {isYouTube ? 'Short to YouTube' : 'Reel to Instagram'} (1-Click)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
