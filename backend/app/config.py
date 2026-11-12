import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from project root or backend folder
for candidate in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env"
]:
    if candidate.exists():
        load_dotenv(dotenv_path=candidate, override=True)

INSTAGRAM_DEFAULT_CAPTION = "#AIアート #AIイラスト #AI女子 #AI美女 #生成AI デジタルアート 幻想世界観 美少女 可愛い 創作 リール リール動画 おすすめ おすすめにのりたい"

class Settings(BaseModel):
    PROJECT_NAME: str = "ClipNova AI - Video Repurposing & Social Media Automation"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    OUTPUT_DIR: Path = BASE_DIR / "output"
    
    # AI API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # YouTube Data API v3
    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_REDIRECT_URI: str = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/api/publish/youtube/callback")
    
    # Instagram Graph API
    INSTAGRAM_ACCESS_TOKEN: str = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
    INSTAGRAM_ACCOUNT_ID: str = os.getenv("INSTAGRAM_ACCOUNT_ID", "")
    
    # Server Host / URL
    SERVER_HOST: str = os.getenv("SERVER_HOST", "http://localhost:8000")
    
    def ensure_directories(self):
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (self.OUTPUT_DIR / "temp").mkdir(parents=True, exist_ok=True)
        (self.OUTPUT_DIR / "rendered").mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
