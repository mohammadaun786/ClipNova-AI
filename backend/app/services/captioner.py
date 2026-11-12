import os
import re
import json
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger("captioner")

class CaptionGenerator:
    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR / "temp"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def extract_audio(self, video_path: str, audio_path: Optional[str] = None) -> str:
        """Extract optimized MP3 audio for speech-to-text."""
        if not audio_path:
            audio_path = str(Path(video_path).with_suffix(".mp3"))
        
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-ac", "1",
            "-ar", "16000",
            "-b:a", "64k",
            audio_path
        ]
        subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return audio_path

    def transcribe_with_whisper(self, audio_path: str) -> List[Dict[str, Any]]:
        """Transcribe audio using OpenAI Whisper API."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")

        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
            
        segments = []
        raw_segments = getattr(transcript, "segments", []) or []
        for seg in raw_segments:
            text = seg.get("text", "").strip() if isinstance(seg, dict) else getattr(seg, "text", "").strip()
            start = seg.get("start", 0.0) if isinstance(seg, dict) else getattr(seg, "start", 0.0)
            end = seg.get("end", 0.0) if isinstance(seg, dict) else getattr(seg, "end", 0.0)
            if text:
                segments.append({
                    "start": float(start),
                    "end": float(end),
                    "text": text.upper()  # High-impact uppercase like OpusClip
                })
        return segments

    def transcribe_with_gemini(self, audio_path: str) -> List[Dict[str, Any]]:
        """Transcribe audio using Google Gemini multimodal capabilities."""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Upload file for audio processing
        uploaded_file = client.files.upload(file=audio_path)
        
        prompt = """
        You are an expert short-form audio subtitle generator for TikTok, YouTube Shorts, and Instagram Reels.
        Analyze the audio and generate timestamped subtitle segments.
        Break sentences into short, punchy 2 to 5-word phrases optimal for viral video retention.
        Output ONLY a valid JSON array of objects with keys: "start" (float in seconds), "end" (float in seconds), and "text" (uppercase string).
        Do NOT wrap in any extra markdown text outside ```json ... ```.
        """
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[uploaded_file, prompt]
        )
        
        text = response.text or ""
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            segments = json.loads(json_match.group(0))
            return segments
        raise ValueError("Could not parse JSON segments from Gemini response")

    def generate_demo_captions(self, duration: float, title: str = "VIRAL MOMENT") -> List[Dict[str, Any]]:
        """Generate high-impact hook captions for demo/offline runs."""
        words = [w.upper() for w in re.sub(r'[^a-zA-Z0-9\s]', '', title).split() if len(w) > 1]
        if not words:
            words = ["WAIT", "FOR", "THE", "END", "THIS", "IS", "ABSOLUTELY", "INSANE", "WHAT", "JUST", "HAPPENED"]

        chunks = []
        chunk_size = 3
        for i in range(0, len(words), chunk_size):
            chunks.append(" ".join(words[i:i+chunk_size]))

        if not chunks:
            chunks = ["WAIT TILL THE END", "THIS IS CRAZY!", "UNBELIEVABLE MOMENT"]

        total_chunks = len(chunks)
        effective_duration = max(duration, 5.0)
        chunk_duration = effective_duration / total_chunks
        
        segments = []
        for idx, chunk in enumerate(chunks):
            start = idx * chunk_duration
            end = min((idx + 1) * chunk_duration - 0.1, effective_duration)
            segments.append({
                "start": round(start, 2),
                "end": round(end, 2),
                "text": chunk
            })
        return segments

    def generate_subtitles(self, video_path: str, duration: float, title: str = "") -> List[Dict[str, Any]]:
        """Try Whisper -> Gemini -> Demo fallback."""
        audio_path = None
        try:
            audio_path = self.extract_audio(video_path)
            if settings.OPENAI_API_KEY:
                logger.info("Transcribing with OpenAI Whisper...")
                return self.transcribe_with_whisper(audio_path)
            elif settings.GEMINI_API_KEY:
                logger.info("Transcribing with Gemini Audio...")
                return self.transcribe_with_gemini(audio_path)
        except Exception as e:
            logger.warning(f"Audio transcription failed ({e}), falling back to smart hook captions.")
        finally:
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception:
                    pass

        return self.generate_demo_captions(duration, title)

    def format_srt_time(self, seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

    def format_ass_time(self, seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centis = int((seconds - int(seconds)) * 100)
        return f"{hrs:d}:{mins:02d}:{secs:02d}.{centis:02d}"

    def write_srt(self, segments: List[Dict[str, Any]], output_path: str) -> str:
        with open(output_path, "w", encoding="utf-8") as f:
            for idx, seg in enumerate(segments, 1):
                start_str = self.format_srt_time(seg["start"])
                end_str = self.format_srt_time(seg["end"])
                f.write(f"{idx}\n{start_str} --> {end_str}\n{seg['text']}\n\n")
        return output_path

    def write_ass(self, segments: List[Dict[str, Any]], output_path: str, style_name: str = "viral_yellow", font_size: int = 24, margin_v: int = 340) -> str:
        """
        Write ASS subtitle file with viral typography styling.
        ASS colors are &HAABBGGRR in hexadecimal format.
        """
        color_map = {
            "viral_yellow": "&H0000FFFF",  # Yellow (BGR)
            "neon_green": "&H0000FF55",    # Neon Green
            "bold_white": "&H00FFFFFF",    # Crisp White
            "cyan_pop": "&H00FFFF00",      # Vibrant Cyan
        }
        primary_color = color_map.get(style_name, "&H0000FFFF")

        ass_content = f"""[Script Info]
Title: ViralClip Auto Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ViralStyle,Arial,{font_size * 2},{primary_color},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,6,3,2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        for seg in segments:
            start_str = self.format_ass_time(seg["start"])
            end_str = self.format_ass_time(seg["end"])
            text = seg["text"].replace("\n", " ").strip()
            ass_content += f"Dialogue: 0,{start_str},{end_str},ViralStyle,,0,0,0,,{text}\n"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(ass_content)
        return output_path

captioner = CaptionGenerator()
