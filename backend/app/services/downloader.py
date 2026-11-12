import os
import re
import json
import uuid
import html
import logging
import subprocess
import urllib.parse
from pathlib import Path
from typing import Dict, Any, Optional

from backend.app.config import settings

logger = logging.getLogger("downloader")

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

class RedditDownloader:
    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR / "temp"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _probe_video_file(self, file_path: str) -> Dict[str, Any]:
        """Use ffprobe to extract accurate duration, width, height, and audio status."""
        try:
            cmd = [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", file_path
            ]
            result = subprocess.run(
                cmd,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            data = json.loads(result.stdout)
            
            width = 1080
            height = 1920
            has_audio = False
            duration = float(data.get("format", {}).get("duration", 15.0))

            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    width = int(stream.get("width", width))
                    height = int(stream.get("height", height))
                elif stream.get("codec_type") == "audio":
                    has_audio = True

            return {
                "duration": duration,
                "width": width,
                "height": height,
                "has_audio": has_audio
            }
        except Exception as e:
            logger.warning(f"ffprobe failed on {file_path}: {e}")
            return {"duration": 15.0, "width": 1080, "height": 1920, "has_audio": True}

    def _solve_reddit_challenge(self, session, initial_res) -> Any:
        """Solve Reddit's automated JavaScript challenge in a loop until the page is unlocked."""
        res = initial_res
        for attempt in range(4):
            m_token = re.search(r'name="jsc_token"\s+value="([^"]+)"', res.text)
            m_action = re.search(r'<form hidden method="GET" action="([^"]+)"', res.text)
            m_sol = re.search(r'\(async e=>e\+e\)\("([^"]+)"\)', res.text)

            if not (m_action and m_token and m_sol):
                # No challenge form present, page is unlocked
                return res

            logger.info(f"Solving Reddit challenge (attempt {attempt + 1})...")
            action = m_action.group(1)
            token = m_token.group(1)
            solution = m_sol.group(1) + m_sol.group(1)

            challenge_url = urllib.parse.urljoin("https://www.reddit.com", action)
            parsed_current = urllib.parse.urlparse(res.url)
            current_params = dict(urllib.parse.parse_qsl(parsed_current.query))
            current_params["js_challenge"] = "1"
            current_params["jsc_token"] = token
            current_params["solution"] = solution
            current_params["jsc_orig_r"] = current_params.get("jsc_orig_r", "")

            res = session.get(challenge_url, params=current_params, allow_redirects=True, timeout=12)

        return res

    def _download_direct_vreddit_streams(self, v_id: str, output_file: str, session) -> bool:
        """
        Downloads untruncated full-duration HD video and audio streams directly from v.redd.it,
        then merges them losslessly with FFmpeg.
        This guarantees the full duration (6s, 47s, 60s etc.) instead of truncated 4s feed previews.
        """
        video_qualities = [
            f"https://v.redd.it/{v_id}/CMAF_1080.mp4",
            f"https://v.redd.it/{v_id}/DASH_1080.mp4",
            f"https://v.redd.it/{v_id}/CMAF_720.mp4",
            f"https://v.redd.it/{v_id}/DASH_720.mp4",
            f"https://v.redd.it/{v_id}/CMAF_480.mp4",
            f"https://v.redd.it/{v_id}/DASH_480.mp4",
            f"https://v.redd.it/{v_id}/CMAF_360.mp4",
            f"https://v.redd.it/{v_id}/DASH_360.mp4",
        ]
        audio_qualities = [
            f"https://v.redd.it/{v_id}/CMAF_AUDIO_128.mp4",
            f"https://v.redd.it/{v_id}/DASH_AUDIO_128.mp4",
            f"https://v.redd.it/{v_id}/DASH_audio.mp4",
            f"https://v.redd.it/{v_id}/CMAF_AUDIO_64.mp4",
        ]

        headers = {
            "User-Agent": BROWSER_HEADERS["User-Agent"],
            "Referer": "https://www.reddit.com/"
        }

        # 1. Probe for highest working full video stream
        chosen_video_url = None
        for v_url in video_qualities:
            try:
                r = session.head(v_url, headers=headers, timeout=5)
                if r.status_code == 200 and int(r.headers.get("content-length", 0)) > 20000:
                    chosen_video_url = v_url
                    break
            except Exception:
                continue

        if not chosen_video_url:
            return False

        # 2. Probe for highest working audio stream
        chosen_audio_url = None
        for a_url in audio_qualities:
            try:
                r = session.head(a_url, headers=headers, timeout=5)
                if r.status_code == 200 and int(r.headers.get("content-length", 0)) > 2000:
                    chosen_audio_url = a_url
                    break
            except Exception:
                continue

        temp_v = str(Path(output_file).parent / f"{Path(output_file).stem}_stream_v.mp4")
        temp_a = str(Path(output_file).parent / f"{Path(output_file).stem}_stream_a.mp4")

        try:
            logger.info(f"Downloading full-length Reddit video stream from: {chosen_video_url}...")
            r_v = session.get(chosen_video_url, headers=headers, stream=True, timeout=30)
            r_v.raise_for_status()
            with open(temp_v, "wb") as f:
                for chunk in r_v.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)

            has_audio = False
            if chosen_audio_url:
                try:
                    logger.info(f"Downloading full-length Reddit audio stream from: {chosen_audio_url}...")
                    r_a = session.get(chosen_audio_url, headers=headers, stream=True, timeout=20)
                    if r_a.status_code == 200:
                        with open(temp_a, "wb") as f:
                            for chunk in r_a.iter_content(chunk_size=65536):
                                if chunk:
                                    f.write(chunk)
                        has_audio = os.path.exists(temp_a) and os.path.getsize(temp_a) > 1000
                except Exception as e:
                    logger.warning(f"Could not download audio stream: {e}")

            # Merge video and audio streams losslessly
            if has_audio:
                cmd = [
                    "ffmpeg", "-nostdin", "-y",
                    "-i", temp_v,
                    "-i", temp_a,
                    "-c", "copy",
                    "-movflags", "+faststart",
                    output_file
                ]
            else:
                cmd = [
                    "ffmpeg", "-nostdin", "-y",
                    "-i", temp_v,
                    "-c", "copy",
                    "-movflags", "+faststart",
                    output_file
                ]

            subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return os.path.exists(output_file) and os.path.getsize(output_file) > 1000
        except Exception as e:
            logger.warning(f"Direct stream download failed: {e}")
            return False
        finally:
            if os.path.exists(temp_v):
                try: os.remove(temp_v)
                except Exception: pass
            if os.path.exists(temp_a):
                try: os.remove(temp_a)
                except Exception: pass

    def _try_direct_reddit_extract(self, url: str, video_id: str, progress_callback=None) -> Optional[Dict[str, Any]]:
        """
        Directly extract Reddit video using curl_cffi Chrome impersonation
        to solve bot challenges, parse shreddit-player, and download pre-merged HD video.
        """
        try:
            from curl_cffi import requests as cffi_requests
        except ImportError:
            logger.warning("curl_cffi not installed; skipping direct Reddit extraction")
            return None

        clean_url = url.strip()
        is_reddit = any(domain in clean_url for domain in ["reddit.com", "redd.it", "v.redd.it"])
        if not is_reddit:
            return None

        try:
            if progress_callback:
                progress_callback(10)

            session = cffi_requests.Session(impersonate="chrome120")
            session.headers.update(BROWSER_HEADERS)

            logger.info(f"Connecting to Reddit URL: {clean_url}")
            res = session.get(clean_url, allow_redirects=True, timeout=12)

            # Solve JS challenge if presented
            res = self._solve_reddit_challenge(session, res)
            html_text = res.text
            final_url = res.url

            if progress_callback:
                progress_callback(25)

            # Check if this is an image or text post without video
            is_image_post = bool(re.search(r'https?://i\.redd\.it/[a-zA-Z0-9_\.]+', html_text))
            has_shreddit_player = "<shreddit-player" in html_text
            has_video_tag = "<video" in html_text or "packaged-media.redd.it" in html_text or "v.redd.it" in html_text

            if is_image_post and not has_shreddit_player and not has_video_tag:
                raise ValueError("This Reddit post contains an image, not a video. Please paste a link to a video post or upload your video file directly.")

            # Extract Title, Subreddit, Author
            title = "Viral Reddit Moment"
            subreddit = "Reddit"
            author = "RedditUser"

            title_m = re.search(r'post-title="([^"]+)"', html_text)
            if not title_m:
                title_m = re.search(r'<title>(.*?)</title>', html_text)
            if title_m:
                raw_t = title_m.group(1).replace(" : r/", " - r/").replace(" - Reddit", "")
                title = html.unescape(raw_t).strip()

            sub_m = re.search(r'subreddit-name="([^"]+)"', html_text)
            if not sub_m:
                sub_m = re.search(r'/r/([^/]+)/', final_url)
            if sub_m:
                subreddit = sub_m.group(1)

            author_m = re.search(r'post-author-id="([^"]+)"', html_text)
            if author_m:
                author = author_m.group(1)

            # Look for packaged MP4s in shreddit-player tag
            download_url = None
            packaged_match = re.search(r'packaged-media-json="([^"]+)"', html_text)
            if packaged_match:
                try:
                    packaged_json = html.unescape(packaged_match.group(1))
                    media_data = json.loads(packaged_json)
                    permutations = media_data.get("playbackMp4s", {}).get("permutations", [])
                    if permutations:
                        # Sort by duration first (to avoid truncated 4s feed previews) then resolution & bitrate
                        sorted_perms = sorted(
                            permutations,
                            key=lambda p: (
                                p.get("source", {}).get("durationMs", 0) or p.get("durationMs", 0),
                                p.get("source", {}).get("dimensions", {}).get("height", 0) *
                                p.get("source", {}).get("dimensions", {}).get("width", 0),
                                p.get("source", {}).get("bitrateBps", 0)
                            ),
                            reverse=True
                        )
                        download_url = sorted_perms[0].get("source", {}).get("url")
                except Exception as e:
                    logger.warning(f"Error parsing packaged-media-json: {e}")

            # Find v.redd.it ID to fetch full untruncated streams
            vreddit_id = None
            m_vid = re.search(r'https?://v\.redd\.it/([a-zA-Z0-9]+)', html_text)
            if not m_vid:
                m_vid = re.search(r'/([a-zA-Z0-9]{8,25})/HLSPlaylist\.m3u8', html_text)
            if not m_vid:
                m_vid = re.search(r'https?://packaged-media\.redd\.it/([a-zA-Z0-9]+)', html_text)
            if m_vid:
                vreddit_id = m_vid.group(1)

            output_file = str(self.output_dir / f"{video_id}_raw.mp4")
            downloaded_successfully = False

            # Strategy 1 (Gold Standard): Full-length unfragmented direct streams from v.redd.it
            # Guarantees full duration (6s, 47s, 60s etc.) instead of 4-second preview clips
            if vreddit_id:
                if progress_callback:
                    progress_callback(35)
                logger.info(f"Attempting direct full-length stream download for v.redd.it ID: {vreddit_id}...")
                downloaded_successfully = self._download_direct_vreddit_streams(vreddit_id, output_file, session)

            # Strategy 2: Direct HD MP4 download from packaged media (if Strategy 1 unavailable)
            if not downloaded_successfully and download_url:
                download_url = html.unescape(download_url)
                logger.info(f"Downloading HD Reddit packaged MP4 from: {download_url[:80]}...")
                headers = {
                    "User-Agent": BROWSER_HEADERS["User-Agent"],
                    "Referer": "https://www.reddit.com/"
                }
                dl_res = session.get(download_url, headers=headers, stream=True, timeout=30)
                dl_res.raise_for_status()

                total_len = int(dl_res.headers.get("content-length", 0))
                downloaded = 0

                with open(output_file, "wb") as f:
                    for chunk in dl_res.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_len and progress_callback:
                                pct = 25 + int((downloaded / total_len) * 65)
                                progress_callback(min(pct, 95))
                downloaded_successfully = os.path.exists(output_file) and os.path.getsize(output_file) > 1000

            # Strategy 3: Full-length HLS Stream (m3u8) via FFmpeg
            if not downloaded_successfully and "HLSPlaylist.m3u8" in html_text:
                m3u8_m = re.search(r'src="([^"]*HLSPlaylist\.m3u8[^"]*)"', html_text)
                if m3u8_m:
                    m3u8_url = html.unescape(m3u8_m.group(1))
                    # Remove preview truncation parameters like f=sd or f=sd,subsAll to get complete full duration!
                    clean_m3u8 = re.sub(r'([?&])f=[^&]*(&|$)', r'\1', m3u8_url).replace('?&', '?').rstrip('?&')
                    logger.info(f"Downloading full-length Reddit HLS stream via FFmpeg: {clean_m3u8[:80]}...")
                    if progress_callback:
                        progress_callback(40)
                    cmd = [
                        "ffmpeg", "-nostdin", "-y",
                        "-headers", f"Referer: https://www.reddit.com/\r\nUser-Agent: {BROWSER_HEADERS['User-Agent']}\r\n",
                        "-i", clean_m3u8,
                        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
                        "-c:a", "aac",
                        "-movflags", "+faststart",
                        output_file
                    ]
                    subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

            if os.path.exists(output_file) and os.path.getsize(output_file) > 1000:
                if progress_callback:
                    progress_callback(98)
                probe_info = self._probe_video_file(output_file)
                return {
                    "id": video_id,
                    "title": title,
                    "author": author,
                    "subreddit": subreddit,
                    "description": "",
                    "duration": probe_info["duration"],
                    "width": probe_info["width"],
                    "height": probe_info["height"],
                    "original_url": url,
                    "file_path": output_file,
                }

        except ValueError:
            raise
        except Exception as e:
            logger.warning(f"Direct Reddit extraction attempt failed: {e}")

        return None

    def _download_with_ytdlp(self, url: str, video_id: str, progress_callback=None) -> Dict[str, Any]:
        """Fallback to yt-dlp with auto stream merging for general videos or unsupported Reddit posts."""
        import yt_dlp

        output_template = str(self.output_dir / f"{video_id}_raw.%(ext)s")
        output_mp4 = str(self.output_dir / f"{video_id}_raw.mp4")

        def ydl_hook(d):
            if progress_callback and d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                downloaded = d.get("downloaded_bytes", 0)
                pct = int((downloaded / total) * 100) if total else 0
                progress_callback(min(pct, 95))

        ydl_opts = {
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best/bestvideo+bestaudio",
            "outtmpl": output_template,
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
            "http_headers": BROWSER_HEADERS,
            "progress_hooks": [ydl_hook] if progress_callback else [],
        }

        if progress_callback:
            progress_callback(15)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        final_file = output_mp4
        if not os.path.exists(final_file):
            for f in self.output_dir.glob(f"{video_id}_raw*"):
                if f.suffix in [".mp4", ".mkv", ".webm", ".mov"]:
                    final_file = str(f)
                    break

        if not os.path.exists(final_file):
            raise FileNotFoundError("Video was not downloaded successfully.")

        probe_info = self._probe_video_file(final_file)

        return {
            "id": video_id,
            "title": info.get("title", "Viral Video"),
            "author": info.get("uploader", "Creator"),
            "subreddit": info.get("subreddit", "popular"),
            "description": info.get("description", ""),
            "duration": probe_info["duration"],
            "width": probe_info["width"],
            "height": probe_info["height"],
            "original_url": url,
            "file_path": final_file,
        }

    def download_reddit_video(self, url: str, progress_callback=None) -> Dict[str, Any]:
        """
        Unified video download pipeline:
        1. Try Direct Reddit scraper (with curl_cffi and JS challenge solver) for Reddit links
        2. Fallback to yt-dlp with stream merging
        3. Probe with ffprobe for exact metadata
        """
        video_id = str(uuid.uuid4())[:12]
        clean_url = url.strip()

        # Step 1: Direct Reddit Extractor
        try:
            direct_result = self._try_direct_reddit_extract(clean_url, video_id, progress_callback)
            if direct_result:
                if progress_callback:
                    progress_callback(100)
                return direct_result
        except ValueError as e:
            # Explicit non-video post detected
            raise e
        except Exception as e:
            logger.warning(f"Direct Reddit extractor failed, trying yt-dlp: {e}")

        # Step 2: yt-dlp general extractor
        try:
            result = self._download_with_ytdlp(clean_url, video_id, progress_callback)
            if progress_callback:
                progress_callback(100)
            return result
        except Exception as e:
            logger.error(f"yt-dlp extraction failed for {clean_url}: {e}")
            err_msg = str(e)
            if "No video formats found" in err_msg or "Account authentication is required" in err_msg:
                raise ValueError("Could not extract video stream from this link. The post may be an image, private, or restricted. Please upload your video file directly using the 'Upload Video' tab.")
            raise ValueError(f"Failed to extract video: {err_msg}")

downloader = RedditDownloader()
