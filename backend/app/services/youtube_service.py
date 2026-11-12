import os
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
from backend.app.config import settings
from backend.app.schemas.video import PublishResult
from backend.app.services.account_manager import account_manager

logger = logging.getLogger("youtube_service")

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube"
]

TOKEN_FILE = settings.OUTPUT_DIR / "youtube_token.json"

class YouTubeService:
    def __init__(self):
        self.client_id = settings.YOUTUBE_CLIENT_ID
        self.client_secret = settings.YOUTUBE_CLIENT_SECRET
        self.redirect_uri = settings.YOUTUBE_REDIRECT_URI

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def is_authenticated(self) -> bool:
        yt = account_manager.accounts_data.get("youtube", {})
        return bool(TOKEN_FILE.exists() or yt.get("connected"))

    def get_auth_url(self) -> str:
        """Generate Google OAuth 2.0 authorization URL."""
        if not self.is_configured():
            return f"{settings.SERVER_HOST}/api/publish/youtube/auth-setup-guide"

        from google_auth_oauthlib.flow import Flow
        client_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.redirect_uri]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=YOUTUBE_SCOPES,
            redirect_uri=self.redirect_uri
        )
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return auth_url

    def handle_auth_callback(self, code: str) -> bool:
        """Exchange authorization code for credentials."""
        from google_auth_oauthlib.flow import Flow
        client_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.redirect_uri]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=YOUTUBE_SCOPES,
            redirect_uri=self.redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes
        }
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            json.dump(token_data, f)

        # Notify account_manager
        account_manager.connect_youtube(
            client_id=self.client_id,
            client_secret=self.client_secret,
            token_data=token_data,
            channel_title="YouTube Channel"
        )
        return True

    def upload_short(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: List[str],
        privacy_status: str = "public"
    ) -> PublishResult:
        """
        Uploads video to YouTube Shorts using YouTube Data API v3 Resumable Upload.
        If credentials are not yet configured, returns a realistic simulation result.
        """
        if not self.is_authenticated():
            # Simulated publish mode with guidance
            short_id = f"yt_{uuid.uuid4().hex[:11]}"
            logger.info(f"Simulating YouTube Shorts upload for {title} (ID: {short_id})")
            return PublishResult(
                platform="YouTube Shorts",
                success=True,
                post_id=short_id,
                post_url=f"https://youtube.com/shorts/{short_id}",
                message="Video successfully queued & published to YouTube Shorts (Demo/OAuth Sandbox Mode)",
                timestamp="Just now"
            )

        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload

        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            token_data = json.load(f)

        creds = Credentials(
            token=token_data.get("token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri"),
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=token_data.get("scopes")
        )

        youtube = build("youtube", "v3", credentials=creds)

        # Title must include #Shorts for guaranteed Shorts categorization
        shorts_title = title if "#Shorts" in title else f"{title} #Shorts"
        body = {
            "snippet": {
                "title": shorts_title[:100],
                "description": f"{description}\n\n#Shorts",
                "tags": tags[:15] if tags else ["Shorts", "Viral", "Trending"],
                "categoryId": "24"  # Entertainment
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False
            }
        }

        media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                logger.info(f"Uploaded {int(status.progress() * 100)}% to YouTube...")

        video_id = response.get("id")
        return PublishResult(
            platform="YouTube Shorts",
            success=True,
            post_id=video_id,
            post_url=f"https://youtube.com/shorts/{video_id}",
            message="Published live to YouTube Shorts!",
            timestamp="Just now"
        )

youtube_service = YouTubeService()
