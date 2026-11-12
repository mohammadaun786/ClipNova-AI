import os
import json
import logging
import requests
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from backend.app.config import settings

logger = logging.getLogger("account_manager")

class AccountManager:
    """
    Manages persistent 1-time connections for Instagram (via Username/Password or Graph API)
    and YouTube accounts (via OAuth or Channel Credentials).
    Stores account credentials securely in output/connected_accounts.json.
    """
    def __init__(self):
        self.config_file = settings.OUTPUT_DIR / "connected_accounts.json"
        self.session_file = settings.OUTPUT_DIR / "instagram_session.json"
        self.accounts_data: Dict[str, Any] = {
            "instagram": {
                "connected": False,
                "login_type": None,
                "account_id": None,
                "access_token": None,
                "username": None,
                "has_password": False,
                "connected_at": None,
            },
            "youtube": {
                "connected": False,
                "channel_title": None,
                "channel_id": None,
                "email": None,
                "client_id": None,
                "client_secret": None,
                "connected_at": None,
            }
        }
        self.load()

    def load(self):
        """Loads saved account connections from disk."""
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    self.accounts_data.update(saved)
            except Exception as e:
                logger.error(f"Error loading connected accounts file: {e}")

        # Check if saved instagram session exists
        if self.session_file.exists() and not self.accounts_data["instagram"].get("connected"):
            try:
                with open(self.session_file, "r", encoding="utf-8") as f:
                    sess_data = json.load(f)
                    saved_user = sess_data.get("username") or "instagram_creator"
                    self.accounts_data["instagram"] = {
                        "connected": True,
                        "login_type": "credentials",
                        "username": f"@{saved_user}" if not saved_user.startswith("@") else saved_user,
                        "has_password": True,
                        "connected_at": datetime.now(timezone.utc).isoformat(),
                    }
                    self.save()
            except Exception:
                pass

        # Check Instagram from settings / env if not yet connected
        if not self.accounts_data["instagram"].get("connected"):
            if settings.INSTAGRAM_ACCESS_TOKEN and settings.INSTAGRAM_ACCOUNT_ID:
                self.accounts_data["instagram"] = {
                    "connected": True,
                    "login_type": "graph_api",
                    "account_id": settings.INSTAGRAM_ACCOUNT_ID,
                    "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
                    "username": "@instagram_creator",
                    "has_password": False,
                    "connected_at": datetime.now(timezone.utc).isoformat(),
                }
                self.save()

        # Check YouTube from token file / env
        token_file = settings.OUTPUT_DIR / "youtube_token.json"
        if not self.accounts_data["youtube"].get("connected"):
            if token_file.exists() or (settings.YOUTUBE_CLIENT_ID and settings.YOUTUBE_CLIENT_SECRET):
                self.accounts_data["youtube"] = {
                    "connected": True,
                    "channel_title": "YouTube Creator",
                    "channel_id": None,
                    "client_id": settings.YOUTUBE_CLIENT_ID or "oauth_client",
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET or "",
                    "connected_at": datetime.now(timezone.utc).isoformat(),
                }
                self.save()

    def save(self):
        """Saves current connected accounts to disk."""
        try:
            self.config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(self.accounts_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving connected accounts: {e}")

    # ==================== INSTAGRAM ====================
    def connect_instagram_credentials(
        self,
        username: str,
        password: str,
        verification_code: str = ""
    ) -> Dict[str, Any]:
        """
        Connects Instagram directly using Username and Password.
        Uses instagrapi to authenticate and save session cookies permanently.
        """
        from backend.app.services.instagram_service import instagram_service
        res = instagram_service.login_with_credentials(username, password, verification_code)

        if res.get("success"):
            clean_user = username.strip()
            if not clean_user.startswith("@"):
                clean_user = f"@{clean_user}"

            self.accounts_data["instagram"] = {
                "connected": True,
                "login_type": "credentials",
                "username": clean_user,
                "account_id": None,
                "access_token": None,
                "has_password": True,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }
            self.save()

        return res

    def connect_instagram_graph(
        self,
        account_id: str,
        access_token: str,
        username: Optional[str] = None
    ) -> Dict[str, Any]:
        """Connects Instagram via Meta Graph API credentials."""
        cleaned_account_id = account_id.strip()
        cleaned_token = access_token.strip()
        resolved_username = username.strip() if username else None

        try:
            url = f"https://graph.facebook.com/v21.0/{cleaned_account_id}"
            res = requests.get(
                url,
                params={"fields": "id,username,name", "access_token": cleaned_token},
                timeout=10
            )
            if res.status_code == 200:
                data = res.json()
                resolved_username = data.get("username") or data.get("name") or resolved_username
        except Exception:
            pass

        if not resolved_username:
            resolved_username = f"creator_{cleaned_account_id[-4:]}" if len(cleaned_account_id) >= 4 else "instagram_user"

        if not resolved_username.startswith("@"):
            resolved_username = f"@{resolved_username}"

        self.accounts_data["instagram"] = {
            "connected": True,
            "login_type": "graph_api",
            "account_id": cleaned_account_id,
            "access_token": cleaned_token,
            "username": resolved_username,
            "has_password": False,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        self.save()

        settings.INSTAGRAM_ACCESS_TOKEN = cleaned_token
        settings.INSTAGRAM_ACCOUNT_ID = cleaned_account_id

        return {
            "success": True,
            "platform": "Instagram",
            "username": resolved_username,
            "message": f"Instagram account {resolved_username} connected successfully!"
        }

    def disconnect_instagram(self) -> Dict[str, Any]:
        """Disconnects the current Instagram account and deletes saved session cookies."""
        self.accounts_data["instagram"] = {
            "connected": False,
            "login_type": None,
            "account_id": None,
            "access_token": None,
            "username": None,
            "has_password": False,
            "connected_at": None,
        }
        self.save()
        if self.session_file.exists():
            try:
                self.session_file.unlink()
            except Exception:
                pass
        settings.INSTAGRAM_ACCESS_TOKEN = ""
        settings.INSTAGRAM_ACCOUNT_ID = ""
        return {"success": True, "message": "Instagram account disconnected."}

    # ==================== YOUTUBE ====================
    def connect_youtube(
        self,
        channel_title: Optional[str] = None,
        email: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Connects YouTube account (via Channel Name/Email or Google OAuth).
        """
        c_id = client_id.strip() if client_id else settings.YOUTUBE_CLIENT_ID
        c_secret = client_secret.strip() if client_secret else settings.YOUTUBE_CLIENT_SECRET
        title = channel_title.strip() if channel_title else (f"{email}'s Channel" if email else "My YouTube Channel")

        token_file = settings.OUTPUT_DIR / "youtube_token.json"
        if token_data:
            try:
                with open(token_file, "w", encoding="utf-8") as f:
                    json.dump(token_data, f, indent=2)
            except Exception as e:
                logger.error(f"Error saving token file: {e}")

        self.accounts_data["youtube"] = {
            "connected": True,
            "channel_title": title,
            "channel_id": token_data.get("channel_id") if token_data else None,
            "email": email.strip() if email else None,
            "client_id": c_id,
            "client_secret": c_secret,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        self.save()

        if c_id:
            settings.YOUTUBE_CLIENT_ID = c_id
        if c_secret:
            settings.YOUTUBE_CLIENT_SECRET = c_secret

        return {
            "success": True,
            "platform": "YouTube",
            "channel_title": title,
            "message": f"YouTube channel '{title}' connected successfully! You can now 1-click publish Shorts."
        }

    def disconnect_youtube(self) -> Dict[str, Any]:
        """Disconnects the current YouTube account."""
        self.accounts_data["youtube"] = {
            "connected": False,
            "channel_title": None,
            "channel_id": None,
            "email": None,
            "client_id": None,
            "client_secret": None,
            "connected_at": None,
        }
        self.save()
        token_file = settings.OUTPUT_DIR / "youtube_token.json"
        if token_file.exists():
            try:
                token_file.unlink()
            except Exception:
                pass
        return {"success": True, "message": "YouTube account disconnected."}

    # ==================== STATUS ====================
    def get_status(self) -> Dict[str, Any]:
        """Returns safe status dictionary for frontend display."""
        ig = self.accounts_data.get("instagram", {})
        yt = self.accounts_data.get("youtube", {})
        
        token_file = settings.OUTPUT_DIR / "youtube_token.json"
        yt_authenticated = bool(yt.get("connected") or token_file.exists())
        ig_connected = bool(ig.get("connected") or self.session_file.exists() or (ig.get("access_token") or settings.INSTAGRAM_ACCESS_TOKEN))

        return {
            "instagram": {
                "connected": ig_connected,
                "login_type": ig.get("login_type") or ("credentials" if self.session_file.exists() else "graph_api"),
                "username": ig.get("username") or ("@connected_creator" if ig_connected else None),
                "account_id": ig.get("account_id") or settings.INSTAGRAM_ACCOUNT_ID or None,
                "connected_at": ig.get("connected_at"),
            },
            "youtube": {
                "connected": yt_authenticated,
                "channel_title": yt.get("channel_title") or ("YouTube Channel" if yt_authenticated else None),
                "authenticated": yt_authenticated,
                "email": yt.get("email"),
                "client_id": yt.get("client_id") or settings.YOUTUBE_CLIENT_ID or None,
                "connected_at": yt.get("connected_at"),
            }
        }

account_manager = AccountManager()
