import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import HTMLResponse, RedirectResponse
from backend.app.config import settings, INSTAGRAM_DEFAULT_CAPTION
from backend.app.schemas.video import (
    YouTubePublishRequest,
    InstagramPublishRequest,
    PublishResult,
)
from backend.app.services.youtube_service import youtube_service
from backend.app.services.instagram_service import instagram_service
from backend.app.services.account_manager import account_manager
from backend.app.utils.job_store import job_store

logger = logging.getLogger("publish_router")
router = APIRouter(prefix="/publish", tags=["Social Media Publishing"])

class ConnectInstagramRequest(BaseModel):
    username: str = Field(..., description="Instagram username or handle")
    password: Optional[str] = Field(None, description="Instagram password for direct login")
    verification_code: Optional[str] = Field("", description="Optional 2FA security code")
    account_id: Optional[str] = Field(None, description="Optional Meta Graph Account ID")
    access_token: Optional[str] = Field(None, description="Optional Meta Graph Access Token")

class ConnectYouTubeRequest(BaseModel):
    channel_title: Optional[str] = Field(None, description="YouTube Channel Name")
    email: Optional[str] = Field(None, description="Google / YouTube Account Email")
    client_id: Optional[str] = Field(None, description="OAuth Client ID")
    client_secret: Optional[str] = Field(None, description="OAuth Client Secret")

@router.get("/status")
def get_publish_status():
    """Returns the integration and 1-time connection status of social platforms."""
    status = account_manager.get_status()
    return {
        "youtube": {
            "configured": youtube_service.is_configured(),
            "authenticated": status["youtube"]["authenticated"],
            "channel_title": status["youtube"]["channel_title"],
            "client_id": status["youtube"]["client_id"][:6] + "..." if status["youtube"]["client_id"] else None
        },
        "instagram": {
            "configured": status["instagram"]["connected"],
            "connected": status["instagram"]["connected"],
            "username": status["instagram"]["username"],
            "account_id": status["instagram"]["account_id"][:4] + "..." if status["instagram"]["account_id"] else None,
            "default_caption": INSTAGRAM_DEFAULT_CAPTION
        }
    }

@router.get("/accounts")
def get_connected_accounts():
    """Returns persistent account connection data for Instagram & YouTube."""
    return account_manager.get_status()

@router.post("/accounts/instagram/connect")
def connect_instagram_account(req: ConnectInstagramRequest):
    """
    Connects Instagram directly using Username and Password (or Meta Graph API).
    Saves session permanently for 1-click uploads.
    """
    if req.password:
        res = account_manager.connect_instagram_credentials(
            username=req.username,
            password=req.password,
            verification_code=req.verification_code or ""
        )
        if not res.get("success") and not res.get("needs_2fa"):
            raise HTTPException(status_code=400, detail=res.get("message", "Login failed"))
        return res
    elif req.account_id and req.access_token:
        res = account_manager.connect_instagram_graph(
            account_id=req.account_id,
            access_token=req.access_token,
            username=req.username
        )
        return res
    else:
        # Quick connect with username
        res = account_manager.connect_instagram_credentials(
            username=req.username,
            password="saved_session",
            verification_code=""
        )
        return res

@router.post("/accounts/instagram/disconnect")
def disconnect_instagram_account():
    """Disconnects the saved Instagram account."""
    return account_manager.disconnect_instagram()

@router.post("/accounts/youtube/connect")
def connect_youtube_account(req: ConnectYouTubeRequest):
    """
    Connects YouTube account via Channel Name/Email or Google OAuth.
    """
    res = account_manager.connect_youtube(
        channel_title=req.channel_title,
        email=req.email,
        client_id=req.client_id,
        client_secret=req.client_secret
    )
    return res

@router.post("/accounts/youtube/disconnect")
def disconnect_youtube_account():
    """Disconnects the saved YouTube account."""
    return account_manager.disconnect_youtube()

@router.get("/youtube/auth-url")
def get_youtube_auth_url():
    """Returns the Google OAuth 2.0 authorization URL."""
    try:
        url = youtube_service.get_auth_url()
        return {"auth_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/youtube/callback")
def youtube_oauth_callback(code: Optional[str] = None, error: Optional[str] = None):
    """Google OAuth2 redirect URI endpoint."""
    if error:
        return HTMLResponse(
            f"<h3>YouTube Authorization Failed</h3><p>{error}</p><a href='/'>Return to ClipNova</a>"
        )
    if not code:
        return HTMLResponse("<h3>Missing authorization code</h3>")

    try:
        youtube_service.handle_auth_callback(code)
        return HTMLResponse("""
        <html>
            <body style="font-family: sans-serif; background: #030712; color: #fff; text-align: center; padding-top: 50px;">
                <h1 style="color: #a78bfa;">YouTube Account Connected Successfully!</h1>
                <p>Your YouTube account is now connected permanently. You can close this tab and 1-click publish Shorts.</p>
                <script>
                    if (window.opener) {
                        window.opener.postMessage('youtube-connected', '*');
                    }
                    setTimeout(() => window.close(), 2500);
                </script>
            </body>
        </html>
        """)
    except Exception as e:
        logger.error(f"Callback error: {e}")
        return HTMLResponse(f"<h3>OAuth exchange error:</h3><p>{str(e)}</p>")

@router.post("/youtube", response_model=PublishResult)
def publish_youtube_shorts(req: YouTubePublishRequest):
    """
    Publish processed video directly to YouTube Shorts with viral tags & description
    as per the video (AI-generated title, SEO description, trending hashtags).
    """
    job = job_store.get_job(req.job_id)
    if not job or not job.rendered_video_url:
        raise HTTPException(status_code=400, detail="Job not found or video not yet rendered")

    filename = Path(job.rendered_video_url).name
    video_path = str(settings.OUTPUT_DIR / "rendered" / filename)

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Rendered video file not found on disk")

    try:
        result = youtube_service.upload_short(
            video_path=video_path,
            title=req.title,
            description=req.description,
            tags=req.tags,
            privacy_status=req.privacy_status
        )
        return result
    except Exception as e:
        logger.error(f"YouTube upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"YouTube publish error: {str(e)}")

@router.post("/instagram", response_model=PublishResult)
def publish_instagram_reels(req: InstagramPublishRequest):
    """
    Publish processed video directly to Instagram Reels via Instagram Graph API.
    The caption is fixed to:
    #AIアート #AIイラスト #AI女子 #AI美女 #生成AI デジタルアート 幻想世界観 美少女 可愛い 創作 リール リール動画 おすすめ おすすめにのりたい
    """
    job = job_store.get_job(req.job_id)
    if not job or not job.rendered_video_url:
        raise HTTPException(status_code=400, detail="Job not found or video not yet rendered")

    filename = Path(job.rendered_video_url).name
    video_path = str(settings.OUTPUT_DIR / "rendered" / filename)
    video_url = job.rendered_video_url

    # The user strictly requested that the Instagram caption must be fixed to the Japanese viral tagset:
    caption_to_use = INSTAGRAM_DEFAULT_CAPTION

    try:
        result = instagram_service.publish_reel(
            video_url=video_url,
            caption=caption_to_use,
            share_to_feed=req.share_to_feed,
            video_path=video_path if os.path.exists(video_path) else None
        )
        return result
    except Exception as e:
        logger.error(f"Instagram publish failed: {e}")
        raise HTTPException(status_code=500, detail=f"Instagram publish error: {str(e)}")
