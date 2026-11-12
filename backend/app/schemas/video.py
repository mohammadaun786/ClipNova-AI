from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ExtractRequest(BaseModel):
    url: str = Field(..., description="Reddit post or video URL")

class VideoMetadata(BaseModel):
    id: str
    title: str
    author: Optional[str] = "Reddit User"
    subreddit: Optional[str] = "Reddit"
    original_url: str
    duration: float = 0.0
    width: int = 1920
    height: int = 1080
    file_path: str
    preview_url: str

class ProcessOptions(BaseModel):
    aspect_ratio: str = Field("9:16", description="Target aspect ratio: 9:16, 1:1, or 16:9")
    reframe_mode: str = Field("custom_crop", description="custom_crop, split_screen, crop_to_fill, blur_background, floating_card")
    crop_position: str = Field("center", description="center, left, right, top")
    background_video_id: Optional[str] = Field("crimson_art", description="'blur' or background id: crimson_art, gameplay_1, gameplay_2, satisfying_3, or custom")
    # Custom Framing & Manual Crop Adjustments (Matching reference image)
    custom_pos_y: int = Field(12, ge=0, le=80, description="Top offset percentage for video card (default 12% like reference)")
    custom_pos_x: int = Field(50, ge=0, le=100, description="Horizontal center percentage (50 = centered)")
    custom_scale: int = Field(86, ge=40, le=100, description="Width scale percentage of canvas (default 86% like reference)")
    custom_zoom: float = Field(1.0, ge=0.5, le=3.0, description="Zoom/crop factor inside video card (1.0 = fit, >1.0 = zoomed in)")
    custom_aspect: str = Field("1:1", description="Aspect ratio of the video card: '1:1', '4:5', '16:9', or 'original'")
    custom_border_radius: int = Field(16, ge=0, le=60, description="Corner radius in pixels")
    custom_shadow: bool = Field(True, description="Add subtle drop shadow & border to video card")
    # Playback & Video Effects
    speed: float = Field(1.0, ge=0.5, le=2.0, description="Playback speed (1.0 = exact original duration)")
    horizontal_flip: bool = Field(True, description="Mirror horizontally for copyright bypass")
    color_grade: bool = Field(True, description="Apply subtle color enhancement")
    color_preset: str = Field("vibrant", description="Color grade preset: vibrant, punchy, cinematic, clean")
    watermark_enabled: bool = Field(True, description="Overlay custom watermark/handle")
    watermark_text: str = Field("@viralclip.ai", description="Channel handle or logo text")
    watermark_position: str = Field("top_right", description="Position: top_right, top_left, bottom_center, bottom_right")
    watermark_opacity: float = Field(0.85, ge=0.1, le=1.0)
    auto_captions: bool = Field(True, description="Generate and burn subtitles with Whisper/AI")
    caption_style: str = Field("viral_yellow", description="viral_yellow, neon_green, bold_white, cyan_pop")
    caption_font_size: int = Field(22, ge=12, le=48)
    generate_ai_metadata: bool = Field(True, description="Generate Title, SEO Description and Trending Tags")

class ProcessRequest(BaseModel):
    video_id: Optional[str] = None
    url: Optional[str] = None
    options: ProcessOptions = Field(default_factory=ProcessOptions)

class AIMetadataResponse(BaseModel):
    viral_titles: List[str]
    selected_title: str
    description: str
    hashtags: List[str]
    hook_rating: int = 95
    suggested_sound_category: Optional[str] = "Trending Suspense / High Energy"

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, downloading, processing, captioning, completed, failed
    progress: int
    message: str
    error: Optional[str] = None
    video_id: Optional[str] = None
    original_video_url: Optional[str] = None
    rendered_video_url: Optional[str] = None
    download_url: Optional[str] = None
    metadata: Optional[AIMetadataResponse] = None
    raw_details: Optional[Dict[str, Any]] = None

class YouTubePublishRequest(BaseModel):
    job_id: str
    title: str
    description: str
    tags: List[str] = []
    privacy_status: str = "public"  # public, unlisted, private

class InstagramPublishRequest(BaseModel):
    job_id: str
    caption: str
    share_to_feed: bool = True

class PublishResult(BaseModel):
    platform: str
    success: bool
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    message: str
    timestamp: str
