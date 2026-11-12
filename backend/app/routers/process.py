import os
import re
import uuid
import shutil
import logging
import asyncio
import subprocess
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.schemas.video import (
    ExtractRequest,
    VideoMetadata,
    ProcessRequest,
    JobStatus,
)
from backend.app.services.downloader import downloader
from backend.app.services.video_processor import video_processor
from backend.app.services.captioner import captioner
from backend.app.services.ai_metadata import ai_metadata_generator
from backend.app.utils.job_store import job_store

logger = logging.getLogger("process_router")
router = APIRouter(prefix="", tags=["Process & Pipeline"])

# In-memory store of extracted raw videos
extracted_videos = {}

def background_video_pipeline(job_id: str, input_path: str, title: str, subreddit: str, author: str, options):
    """
    Background worker that runs the full automated repurposing pipeline:
    1. Transcribe speech & generate styled subtitles (Whisper / Gemini / Smart hook)
    2. FFmpeg filter processing (9:16 blurred background reframe, speed tempo, flip, color, watermark, burn subs)
    3. AI metadata generation (viral titles, SEO description, trending hashtags)
    """
    try:
        job_store.update_job(
            job_id,
            status="processing",
            progress=15,
            message="Extracting audio & generating AI subtitles with Whisper..."
        )

        duration = video_processor.get_video_duration(input_path)
        subtitles_file = None

        if options.auto_captions:
            try:
                segments = captioner.generate_subtitles(input_path, duration, title=title)
                ass_path = str(settings.OUTPUT_DIR / "temp" / f"{job_id}_subs.ass")

                margin_v = 340
                if options.reframe_mode == "custom_crop":
                    # Place subtitle neatly at bottom of the top video card
                    pos_y = int(1920 * ((options.custom_pos_y or 12) / 100.0))
                    card_w = int(1080 * ((options.custom_scale or 86) / 100.0))
                    card_h = card_w if options.custom_aspect == "1:1" else (int(card_w * 5 / 4) if options.custom_aspect == "4:5" else card_w)
                    margin_v = max(180, 1920 - (pos_y + card_h - 45))

                captioner.write_ass(
                    segments,
                    ass_path,
                    style_name=options.caption_style,
                    font_size=options.caption_font_size,
                    margin_v=margin_v
                )
                subtitles_file = ass_path
            except Exception as e:
                logger.warning(f"Subtitles generation warning: {e}")

        job_store.update_job(
            job_id,
            progress=35,
            message="Executing FFmpeg Smart Reframe (9:16 Blur Background) & Speed adjustments..."
        )

        def on_ffmpeg_progress(pct: int, msg: str):
            # Scale FFmpeg 0-100 to 35-85 overall job progress
            scaled_pct = 35 + int((pct / 100.0) * 50)
            job_store.update_job(job_id, progress=min(85, scaled_pct), message=msg)

        # Render final MP4
        rendered_path = video_processor.process_video(
            input_path=input_path,
            options=options,
            subtitles_file=subtitles_file,
            progress_callback=on_ffmpeg_progress
        )

        job_store.update_job(
            job_id,
            progress=88,
            message="Generating viral title, SEO description, and trending hashtags..."
        )

        # Generate AI metadata
        metadata = None
        if options.generate_ai_metadata:
            metadata = ai_metadata_generator.generate_metadata(
                title=title,
                subreddit=subreddit,
                author=author
            )

        rendered_filename = Path(rendered_path).name
        video_url = f"/api/video/file/rendered/{rendered_filename}"
        download_url = f"/api/video/download/rendered/{rendered_filename}"

        job_store.update_job(
            job_id,
            status="completed",
            progress=100,
            message="Video repurposing complete! Ready for preview and 1-click publishing.",
            rendered_video_url=video_url,
            download_url=download_url,
            metadata=metadata
        )

    except Exception as e:
        logger.exception(f"Pipeline error for job {job_id}: {e}")
        job_store.update_job(
            job_id,
            status="failed",
            progress=0,
            message="Video processing failed",
            error=str(e)
        )

@router.post("/extract", response_model=VideoMetadata)
def extract_video(req: ExtractRequest):
    """
    Extracts Reddit video and audio streams using yt-dlp,
    merging them into a single high-definition MP4.
    """
    if not req.url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    try:
        info = downloader.download_reddit_video(req.url)
        video_id = info["id"]
        raw_filename = Path(info["file_path"]).name
        preview_url = f"{settings.SERVER_HOST}/api/video/file/temp/{raw_filename}"
        
        metadata = VideoMetadata(
            id=video_id,
            title=info["title"],
            author=info["author"],
            subreddit=info["subreddit"],
            original_url=req.url,
            duration=info["duration"],
            width=info["width"],
            height=info["height"],
            file_path=info["file_path"],
            preview_url=preview_url
        )
        extracted_videos[video_id] = metadata
        return metadata
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract video: {str(e)}")

@router.post("/upload", response_model=VideoMetadata)
def upload_video(file: UploadFile = File(...)):
    """
    Direct video file upload (MP4, MOV, WebM, MKV).
    Allows users to upload their own videos directly for repurposing
    without relying on external platform extraction.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    file_ext = Path(file.filename).suffix.lower()
    allowed_exts = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]
    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed formats: {', '.join(allowed_exts)}"
        )

    video_id = "upload_" + str(uuid.uuid4())[:10]
    temp_dir = settings.OUTPUT_DIR / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    saved_raw_path = temp_dir / f"{video_id}_source{file_ext}"
    final_mp4_path = temp_dir / f"{video_id}_raw.mp4"

    # Save uploaded bytes
    try:
        with open(saved_raw_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # If already mp4, rename directly; otherwise remux to standard web MP4 using ffmpeg
    if file_ext == ".mp4":
        if saved_raw_path.exists():
            if final_mp4_path.exists():
                final_mp4_path.unlink()
            saved_raw_path.rename(final_mp4_path)
    else:
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-i", str(saved_raw_path),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-c:a", "aac", "-b:a", "128k",
            str(final_mp4_path)
        ]
        res = subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode != 0 or not final_mp4_path.exists():
            final_mp4_path = saved_raw_path

    # Extract accurate duration & dimensions using downloader._probe_video_file
    probe_info = downloader._probe_video_file(str(final_mp4_path))
    
    # Format a human-readable title from the original filename
    base_name = Path(file.filename).stem
    clean_title = re.sub(r'[_\-\.]+', ' ', base_name).strip().title()
    if not clean_title:
        clean_title = "Uploaded Video Clip"

    raw_filename = final_mp4_path.name
    preview_url = f"{settings.SERVER_HOST}/api/video/file/temp/{raw_filename}"

    metadata = VideoMetadata(
        id=video_id,
        title=clean_title,
        author="Local Creator",
        subreddit="Upload",
        original_url=f"local://{file.filename}",
        duration=probe_info["duration"],
        width=probe_info["width"],
        height=probe_info["height"],
        file_path=str(final_mp4_path),
        preview_url=preview_url
    )
    extracted_videos[video_id] = metadata
    return metadata

@router.post("/process", response_model=JobStatus)
def process_video_endpoint(req: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Initiate the automated video editing & repurposing pipeline.
    Runs asynchronously and provides real-time progress via /api/jobs/{job_id}.
    """
    job_id = str(uuid.uuid4())[:12]
    job_store.create_job(job_id, video_id=req.video_id)

    input_path = None
    title = "Viral Reddit Moment"
    subreddit = "Reddit"
    author = "Reddit User"
    original_video_url = None

    if req.video_id and req.video_id in extracted_videos:
        meta = extracted_videos[req.video_id]
        input_path = meta.file_path
        title = meta.title
        subreddit = meta.subreddit or "Reddit"
        author = meta.author or "Reddit User"
        original_video_url = meta.preview_url
    elif req.url:
        try:
            job_store.update_job(job_id, status="downloading", progress=5, message="Downloading Reddit video in 1080p HD...")
            info = downloader.download_reddit_video(req.url)
            input_path = info["file_path"]
            title = info["title"]
            subreddit = info["subreddit"]
            author = info["author"]
            raw_filename = Path(input_path).name
            original_video_url = f"{settings.SERVER_HOST}/api/video/file/temp/{raw_filename}"
        except Exception as e:
            job_store.update_job(job_id, status="failed", error=str(e), message="Failed to download Reddit video")
            return job_store.get_job(job_id)
    else:
        raise HTTPException(status_code=400, detail="Must provide either video_id or url")

    job_store.update_job(
        job_id,
        original_video_url=original_video_url,
        message="Queued for video processing...",
        progress=10
    )

    background_tasks.add_task(
        background_video_pipeline,
        job_id=job_id,
        input_path=input_path,
        title=title,
        subreddit=subreddit,
        author=author,
        options=req.options
    )

    return job_store.get_job(job_id)

@router.get("/jobs/{job_id}", response_model=JobStatus)
def get_job_status(job_id: str):
    """Get the current progress and result of a repurposing job."""
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/demo/sample-video", response_model=VideoMetadata)
def create_demo_sample_video():
    """
    Returns an instant 16:9 demo video with audio and visual motion
    so users can immediately test the entire repurposing and publishing suite without external links.
    """
    sample_id = "sample_" + str(uuid.uuid4())[:8]
    sample_file = str(settings.OUTPUT_DIR / "temp" / "demo_sample.mp4")

    # If already cached, reuse instantly
    if not os.path.exists(sample_file):
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-f", "lavfi",
            "-i", "testsrc=size=1920x1080:rate=30",
            "-f", "lavfi",
            "-i", "sine=frequency=440:sample_rate=44100",
            "-t", "4",
            "-shortest",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            sample_file
        ]
        subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    metadata = VideoMetadata(
        id=sample_id,
        title="Mind-Blowing Scientific Discovery Nobody Knew About",
        author="ScienceExplorer",
        subreddit="nextfuckinglevel",
        original_url="https://reddit.com/r/nextfuckinglevel/demo-sample",
        duration=4.0,
        width=1920,
        height=1080,
        file_path=sample_file,
        preview_url=f"{settings.SERVER_HOST}/api/video/file/temp/{Path(sample_file).name}"
    )
    extracted_videos[sample_id] = metadata
    return metadata

@router.get("/backgrounds")
def list_backgrounds():
    """Returns available background presets (images & videos) and custom uploads."""
    bg_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "backgrounds"
    items = [
        {
            "id": "crimson_art",
            "name": "Crimson Floral Aesthetic",
            "category": "Aesthetic Art",
            "type": "image",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/crimson_art.jpg",
            "duration": None,
            "description": "Red floral art background with top video framing (Reference Style)"
        },
        {
            "id": "blur",
            "name": "Original Blurred Backdrop",
            "category": "Classic",
            "type": "blur",
            "preview_url": None,
            "duration": None,
            "description": "Smart centered original clip with blurred background"
        },
        {
            "id": "gameplay_1",
            "name": "Subway & Car Stunt Track #1",
            "category": "Viral Gameplay",
            "type": "video",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/gameplay_1.jpg",
            "duration": 51.7,
            "description": "High retention 9:16 vertical stunt track gameplay"
        },
        {
            "id": "gameplay_2",
            "name": "High-Speed Runner Stunt #2",
            "category": "Viral Gameplay",
            "type": "video",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/gameplay_2.jpg",
            "duration": 20.0,
            "description": "Fast-paced vertical obstacle runner"
        },
        {
            "id": "satisfying_3",
            "name": "Oddly Satisfying Kinetic Flow #3",
            "category": "Oddly Satisfying",
            "type": "video",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/satisfying_3.jpg",
            "duration": 15.4,
            "description": "Smooth kinetic sand & relaxing slicing loop"
        }
    ]

    # Include custom user uploads from assets/backgrounds (both videos and images)
    if bg_dir.exists():
        for f in bg_dir.glob("custom_*.*"):
            if f.suffix.lower() in [".mp4", ".mov", ".webm", ".mkv"]:
                thumb = bg_dir / f"{f.stem}.jpg"
                thumb_url = f"{settings.SERVER_HOST}/api/backgrounds/preview/{f.stem}.jpg" if thumb.exists() else None
                items.append({
                    "id": f.stem,
                    "name": f.stem.replace("custom_", "").replace("_", " ").title(),
                    "category": "Custom Uploads",
                    "type": "video",
                    "preview_url": thumb_url,
                    "duration": downloader._probe_video_file(str(f))["duration"],
                    "description": "Custom user uploaded background video"
                })
            elif f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"] and not f.name.endswith(".thumb.jpg"):
                items.append({
                    "id": f.stem,
                    "name": f.stem.replace("custom_", "").replace("_", " ").title(),
                    "category": "Custom Uploads",
                    "type": "image",
                    "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/{f.name}",
                    "duration": None,
                    "description": "Custom user uploaded background image"
                })

    return items

@router.get("/backgrounds/preview/{filename}")
def get_background_preview(filename: str):
    bg_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "backgrounds"
    file_path = bg_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview not found")
    media_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
    return FileResponse(str(file_path), media_type=media_type)

@router.get("/backgrounds/file/{filename}")
def get_background_file(filename: str):
    bg_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "backgrounds"
    # Find file with exact name or with any valid extension
    file_path = bg_dir / filename
    if not file_path.exists():
        for ext in [".mp4", ".jpg", ".jpeg", ".png", ".webp", ".mov", ".webm"]:
            candidate = bg_dir / f"{filename}{ext}"
            if candidate.exists():
                file_path = candidate
                break

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Background file not found")

    ext = file_path.suffix.lower()
    if ext in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"
    elif ext == ".png":
        media_type = "image/png"
    elif ext == ".webp":
        media_type = "image/webp"
    else:
        media_type = "video/mp4"

    return FileResponse(str(file_path), media_type=media_type)

@router.post("/backgrounds/upload")
def upload_background_media(file: UploadFile = File(...)):
    """Upload a custom background video or image for aesthetic canvas effects."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    file_ext = Path(file.filename).suffix.lower()
    valid_exts = [".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png", ".webp"]
    if file_ext not in valid_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed: MP4, MOV, WebM, JPG, PNG, WEBP"
        )

    bg_id = "custom_" + str(uuid.uuid4())[:8]
    bg_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "backgrounds"
    bg_dir.mkdir(parents=True, exist_ok=True)
    
    saved_path = bg_dir / f"{bg_id}{file_ext}"

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    is_image = file_ext in [".jpg", ".jpeg", ".png", ".webp"]
    clean_name = Path(file.filename).stem.replace("_", " ").title()

    if is_image:
        return {
            "id": bg_id,
            "name": clean_name,
            "category": "Custom Uploads",
            "type": "image",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/{bg_id}{file_ext}",
            "duration": None,
            "description": "Custom uploaded background image"
        }
    else:
        # Generate thumbnail for video
        thumb_path = bg_dir / f"{bg_id}.jpg"
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-ss", "00:00:01",
            "-i", str(saved_path),
            "-frames:v", "1", "-update", "1",
            str(thumb_path)
        ]
        subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        probe = downloader._probe_video_file(str(saved_path))

        return {
            "id": bg_id,
            "name": clean_name,
            "category": "Custom Uploads",
            "type": "video",
            "preview_url": f"{settings.SERVER_HOST}/api/backgrounds/preview/{bg_id}.jpg",
            "duration": probe["duration"],
            "description": "Custom uploaded background video"
        }
