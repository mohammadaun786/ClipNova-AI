import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import UrlExtractor from './components/UrlExtractor';
import VideoControls from './components/VideoControls';
import RenderProgress from './components/RenderProgress';
import VideoPreview from './components/VideoPreview';
import MetadataCard from './components/MetadataCard';
import PublishModal from './components/PublishModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';

export default function App() {
  // Backend health & status
  const [backendOnline, setBackendOnline] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);

  // Video extraction & upload state
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [extractedVideo, setExtractedVideo] = useState(null);

  // Video processing options
  const [options, setOptions] = useState({
    aspect_ratio: '9:16',
    reframe_mode: 'custom_crop',
    crop_position: 'center',
    background_video_id: 'crimson_art',
    custom_pos_y: 12,
    custom_pos_x: 50,
    custom_scale: 86,
    custom_zoom: 1.0,
    custom_aspect: '1:1',
    custom_border_radius: 16,
    custom_shadow: true,
    speed: 1.0,
    horizontal_flip: true,
    color_grade: true,
    color_preset: 'vibrant',
    watermark_enabled: true,
    watermark_text: '@viralclip.ai',
    watermark_position: 'top_right',
    watermark_opacity: 0.85,
    auto_captions: true,
    caption_style: 'bold_white',
    caption_font_size: 22,
    generate_ai_metadata: true,
  });

  // Background video presets & uploads
  const [backgrounds, setBackgrounds] = useState([]);

  // Render & Job state
  const [isRendering, setIsRendering] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState('youtube'); // 'youtube' or 'instagram'

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check health and integration status on mount
  const refreshPublishStatus = async () => {
    try {
      const res = await axios.get('/api/publish/status');
      setPublishStatus(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to refresh publish status:', err);
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const [healthRes, pubRes, bgRes] = await Promise.all([
          axios.get('/api/health'),
          axios.get('/api/publish/status'),
          axios.get('/api/backgrounds'),
        ]);
        if (healthRes.data?.status === 'healthy') {
          setBackendOnline(true);
        }
        setPublishStatus(pubRes.data);
        if (bgRes.data) {
          setBackgrounds(bgRes.data);
        }
      } catch (err) {
        console.error('Backend health error:', err);
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  // Polling loop for active jobs
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!jobId || !isRendering) return;

    const pollJob = async () => {
      try {
        const res = await axios.get(`/api/jobs/${jobId}`);
        const data = res.data;
        setJobStatus(data);

        if (data.status === 'completed') {
          setIsRendering(false);
          addToast('Render Complete!', 'Your 9:16 repurposed video and AI metadata are ready.', 'success');
          if (data.metadata?.selected_title) {
            setSelectedTitle(data.metadata.selected_title);
          }
        } else if (data.status === 'failed') {
          setIsRendering(false);
          addToast('Processing Error', data.error || 'Failed to process video with FFmpeg', 'error');
        } else {
          pollTimerRef.current = setTimeout(pollJob, 1200);
        }
      } catch (err) {
        console.error('Job polling error:', err);
        pollTimerRef.current = setTimeout(pollJob, 2000);
      }
    };

    pollTimerRef.current = setTimeout(pollJob, 800);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [jobId, isRendering]);

  // Extract from Reddit URL
  const handleExtract = async (url) => {
    setIsExtracting(true);
    try {
      addToast('Extraction Started', 'yt-dlp is extracting highest quality video & audio streams...', 'info');
      const res = await axios.post('/api/extract', { url });
      setExtractedVideo(res.data);
      addToast('Streams Merged', `Successfully loaded: ${res.data.title}`, 'success');
    } catch (err) {
      console.error('Extraction error:', err);
      addToast('Extraction Failed', err.response?.data?.detail || 'Could not download Reddit video.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Direct File Upload
  const handleUpload = async (file) => {
    setIsExtracting(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      addToast('Uploading Video', `Uploading ${file.name}...`, 'info');
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });
      setExtractedVideo(res.data);
      addToast('Video Imported', `Ready to edit: ${res.data.title}`, 'success');
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Upload Failed', err.response?.data?.detail || 'Could not upload video file.', 'error');
    } finally {
      setIsExtracting(false);
      setUploadProgress(null);
    }
  };

  // Custom Background Media (Video or Image) Upload
  const handleUploadBackground = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      addToast('Uploading Background', `Uploading ${file.name}...`, 'info');
      const res = await axios.post('/api/backgrounds/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBackgrounds((prev) => [res.data, ...prev]);
      setOptions((prev) => ({
        ...prev,
        background_video_id: res.data.id,
        reframe_mode: 'custom_crop',
      }));
      addToast('Background Added', `${res.data.name} is now active!`, 'success');
    } catch (err) {
      console.error('Custom bg upload error:', err);
      addToast('Upload Error', err.response?.data?.detail || 'Failed to upload custom background.', 'error');
    }
  };

  // 1-Click Demo Clip Loader
  const handleLoadDemo = async () => {
    setIsExtracting(true);
    try {
      const res = await axios.post('/api/demo/sample-video');
      setExtractedVideo(res.data);
      addToast('Demo Clip Ready', 'Loaded sample viral landscape video for instant testing.', 'success');
    } catch (err) {
      console.error('Demo error:', err);
      addToast('Demo Load Error', 'Could not generate demo sample clip.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Start FFmpeg Render Pipeline
  const handleStartRender = async () => {
    if (!extractedVideo) {
      addToast('No Video Selected', 'Please extract a Reddit URL or load a demo clip first.', 'error');
      return;
    }

    setIsRendering(true);
    setJobStatus(null);

    try {
      const res = await axios.post('/api/process', {
        video_id: extractedVideo.id,
        options: options,
      });
      setJobId(res.data.job_id);
      setJobStatus(res.data);
      addToast('Repurposing Queued', 'Running FFmpeg 9:16 reframe, speed tempo & subtitles...', 'info');
    } catch (err) {
      console.error('Render error:', err);
      setIsRendering(false);
      addToast('Render Error', err.response?.data?.detail || 'Failed to queue render job.', 'error');
    }
  };

  const handleOpenPublishYouTube = () => {
    setPublishPlatform('youtube');
    setPublishModalOpen(true);
  };

  const handleOpenPublishInstagram = () => {
    setPublishPlatform('instagram');
    setPublishModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative selection:bg-purple-500/30">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] radial-glow pointer-events-none" />

      {/* Header */}
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        backendOnline={backendOnline}
        publishStatus={publishStatus}
        onOpenPublishYouTube={handleOpenPublishYouTube}
        onOpenPublishInstagram={handleOpenPublishInstagram}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Step 1: URL Input & File Upload */}
        <UrlExtractor
          onExtract={handleExtract}
          onUpload={handleUpload}
          onLoadDemo={handleLoadDemo}
          isExtracting={isExtracting}
          uploadProgress={uploadProgress}
          extractedVideo={extractedVideo}
          onReset={() => {
            setExtractedVideo(null);
            setJobStatus(null);
          }}
        />

        {/* Real-time Render Progress Banner */}
        {isRendering && jobStatus && (
          <RenderProgress jobStatus={jobStatus} />
        )}

        {/* Studio Grid: Controls & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel (Left Col, 7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <VideoControls
              options={options}
              setOptions={setOptions}
              backgrounds={backgrounds}
              onUploadBackground={handleUploadBackground}
              onStartRender={handleStartRender}
              isRendering={isRendering}
              disabled={!extractedVideo}
            />

            {/* AI Metadata Package (if generated) */}
            {jobStatus?.metadata && (
              <MetadataCard
                metadata={jobStatus.metadata}
                onSelectTitle={(t) => setSelectedTitle(t)}
                selectedTitle={selectedTitle}
                onCopyText={(section) => addToast('Copied to Clipboard', `Copied ${section} successfully.`, 'success')}
              />
            )}
          </div>

          {/* Interactive Preview & Export (Right Col, 5 cols) */}
          <div className="lg:col-span-5 sticky top-28 space-y-6">
            <VideoPreview
              renderedVideoUrl={jobStatus?.rendered_video_url}
              originalVideoUrl={extractedVideo?.preview_url}
              downloadUrl={jobStatus?.download_url}
              onOpenPublishYouTube={handleOpenPublishYouTube}
              onOpenPublishInstagram={handleOpenPublishInstagram}
              title={selectedTitle || extractedVideo?.title}
              options={options}
              setOptions={setOptions}
              backgrounds={backgrounds}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-slate-950/40 text-center text-xs text-slate-500">
        <p>ClipNova AI &copy; 2026 &bull; Automated Content Repurposing & Distribution Engine &bull; FFmpeg &bull; Whisper &bull; Gemini</p>
      </footer>

      {/* Modals */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        jobId={jobId}
        platform={publishPlatform}
        initialTitle={selectedTitle || extractedVideo?.title}
        initialDescription={jobStatus?.metadata?.description}
        initialTags={jobStatus?.metadata?.hashtags}
        publishStatus={publishStatus}
        onRefreshStatus={refreshPublishStatus}
        onSuccess={() => {
          addToast('Published!', `Your video is now live on ${publishPlatform === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels'}.`, 'success');
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
