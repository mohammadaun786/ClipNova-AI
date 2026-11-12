# 🎬 ClipNova AI - Premium Content Repurposing & Social Media Automation

> **OpusClip & Submagic Alternative for Automated Reddit Short-Form Viral Video Repurposing.**
> Automatically download landscape Reddit videos, reframe them into 9:16 vertical shorts with blurred backgrounds, adjust retention pacing, burn dynamic watermarks and viral captions with Whisper AI, generate viral SEO metadata with Gemini/GPT-4, and publish in 1-click to YouTube Shorts and Instagram Reels.

---

## ⚡ Core Architecture & Features

### 1. Ingestion & Stream Merging (`yt-dlp`)
- **Direct Reddit URL Extraction:** Supports all Reddit video post formats (`reddit.com/r/...` and `v.redd.it/...`).
- **Highest Quality Extraction:** Downloads `bestvideo[ext=mp4]+bestaudio[ext=m4a]` streams and merges them into a clean, uncompressed 1080p MP4.
- **Instant Demo Mode:** One-click demo clip loader generates an instant 16:9 test pattern clip with audio for zero-latency testing.

### 2. FFmpeg Filter Complex Pipeline (`video_processor.py`)
- **9:16 Smart Reframe:**
  - **Background Layer:** Scales input video to fill 1080x1920 (`force_original_aspect_ratio=increase`), crops to 1080x1920, applies a gaussian/box blur (`boxblur=22:4`), and darkens slightly (`eq=brightness=-0.14`).
  - **Foreground Layer:** Centers the original video in crisp detail (`scale=1080:-2:flags=lanczos`) with zero stretching or distortion.
- **Speed & Pitch Retention Tuning:**
  - Synchronously scales video PTS (`setpts=PTS/{speed}`) and audio tempo (`atempo={speed}`) by 1.05x to 1.15x.
  - Improves viewer watch time retention while bypassing duplicate Content ID fingerprinting.
- **Anti-Copyright Suite:**
  - Horizontal mirroring (`hflip`).
  - Color grading presets: **Vibrant Pop**, **Punchy Contrast**, **Cinematic Mood**, and **Clean Natural**.
- **Dynamic Watermark:**
  - Overlays your channel handle / logo (`@yourhandle`) via FFmpeg `drawtext`.
  - Configurable positioning (Top-Right, Top-Left, Bottom-Center, Bottom-Right) and alpha opacity.
- **Auto-Captions & Subtitle Burn:**
  - Generates ASS subtitles with viral styles (MrBeast **Viral Yellow**, Hormozi **Neon Green**, **Bold White**, and **Cyber Cyan**).
  - High-visibility drop shadows, thick black outlines, and optimized vertical margins so text is never obscured by TikTok, Reels, or Shorts UI controls.

### 3. AI Viral Metadata Engine (`ai_metadata.py`)
- Extracts Reddit post titles, context, and duration.
- Generates:
  - **3 High-CTR Viral Title Options:** Psychologically framed hooks designed for clicks.
  - **SEO-Optimized Description:** Complete with hook opening, call-to-action (CTA), and creator credit.
  - **15-20 Trending Hashtags:** Tailored specifically for Shorts and Reels algorithms.
  - **Hook Rating Score:** Analyzed viral probability score (88-99).
- Powered by **Google Gemini 2.0 Flash / 1.5 Flash** or **OpenAI GPT-4o-mini**, with an automated heuristic fallback engine if running offline.

### 4. 1-Click Social Media Auto-Publishing
- **YouTube Shorts:**
  - Official **YouTube Data API v3** resumable upload flow.
  - Built-in Google OAuth2 consent and token handling.
  - Auto-tags with `#Shorts`, privacy status controls (`public`, `unlisted`, `private`).
- **Instagram Reels:**
  - Official **Instagram Graph API** Content Publishing flow.
  - Two-phase media container creation and status polling.
  - Auto-publish with caption and "Share to Feed" option.
- **Sandbox/Simulation Mode:** Realistic simulation mode when live credentials are not yet configured.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Located at `E:\AUN\python.exe` or standard `python`)
- **Node.js 18+** & **npm**
- **FFmpeg 6.0+** (Compiled with `libass` and `freetype`, included on system PATH)

### 1. Launch Everything with 1 Click
Double-click `run_all.bat` or run:
```cmd
run_all.bat
```
This automatically starts:
- **Backend API:** `http://localhost:8000` (FastAPI + Swagger Docs at `/docs`)
- **Frontend Studio:** `http://localhost:5173` (Vite React HMR Studio)

### 2. Manual Startup

#### Backend:
```bash
# In project root:
"E:\AUN\python.exe" backend\run.py
```
Backend will start on `http://127.0.0.1:8000`.

#### Frontend:
```bash
cd frontend
npm run dev
```
Frontend will open on `http://localhost:5173`.

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env` to configure your API keys:
```env
# AI Models
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# YouTube Data API v3 (Google Cloud Console)
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8000/api/publish/youtube/callback

# Instagram Graph API (Meta for Developers)
INSTAGRAM_ACCESS_TOKEN=your_instagram_user_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id

# Server Host
SERVER_HOST=http://localhost:8000
```

> **Note:** If API keys are omitted, ClipNova seamlessly defaults to built-in algorithmic metadata templates, smart hook captions, and OAuth sandbox publishing, ensuring full functionality immediately.

---

## 🧪 Verification & Testing Suite

Run the full automated test suite verifying health, demo generation, FFmpeg 9:16 reframe, burned captions, and social publishing endpoints:
```bash
"E:\AUN\python.exe" backend\test_api.py
```

---

## 🎨 Design Guidelines
- **Theme:** Deep dark backgrounds (`#030712`, `slate-950`), subtle purple/cyan glassmorphic panels (`backdrop-blur-xl`), soft borders (`border-white/10`).
- **Icons:** `lucide-react` with custom SVG brand icons for YouTube and Instagram.
- **Interactions:** Smooth progress loading indicators, before/after 9:16 player toggle, and celebration confetti on export.
