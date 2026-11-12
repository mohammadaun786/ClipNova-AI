import os
import re
import uuid
import logging
import subprocess
from pathlib import Path
from typing import Optional, Callable
from backend.app.config import settings
from backend.app.schemas.video import ProcessOptions

logger = logging.getLogger("video_processor")

class VideoProcessor:
    def __init__(self):
        self.output_dir = settings.OUTPUT_DIR / "rendered"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.backgrounds_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "backgrounds"
        self.backgrounds_dir.mkdir(parents=True, exist_ok=True)

    def get_background_video_path(self, bg_id: Optional[str]) -> Optional[str]:
        """Resolves background video or image preset or custom upload path."""
        if not bg_id or bg_id in ["blur", "none", "original"]:
            return None
        
        # Supported extensions for both video loops and aesthetic images
        valid_exts = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm", ".mkv"]

        # Check presets in assets/backgrounds
        for ext in valid_exts:
            preset_file = self.backgrounds_dir / f"{bg_id}{ext}"
            if preset_file.exists():
                return str(preset_file)
        
        # Check direct path
        if os.path.exists(bg_id):
            return bg_id
            
        # Check uploaded custom background in temp
        for ext in valid_exts:
            temp_file = settings.OUTPUT_DIR / "temp" / f"{bg_id}{ext}"
            if temp_file.exists():
                return str(temp_file)

        return None

    def get_video_duration(self, file_path: str) -> float:
        """Get video duration using ffprobe."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path
            ]
            result = subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.warning(f"Could not read duration with ffprobe ({e}), defaulting to 15.0s")
            return 15.0

    def escape_ffmpeg_path(self, path_str: str) -> str:
        """Escape Windows path for FFmpeg filter syntax."""
        p = str(Path(path_str).resolve()).replace("\\", "/")
        p = p.replace(":", "\\:").replace("'", "\\'")
        return p

    def get_font_file(self) -> str:
        """Find a reliable TTF font on Windows/Linux."""
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/seguiemj.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        for c in candidates:
            if os.path.exists(c):
                return c.replace("\\", "/").replace(":", "\\:")
        return ""

    def build_watermark_drawtext(self, text: str, position: str = "top_right", opacity: float = 0.85) -> str:
        safe_text = text.replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")
        alpha = max(0.1, min(1.0, opacity))
        
        pos_coord = {
            "top_right": "x=w-tw-50:y=80",
            "top_left": "x=50:y=80",
            "bottom_center": "x=(w-tw)/2:y=h-th-120",
            "bottom_right": "x=w-tw-50:y=h-th-120",
        }.get(position, "x=w-tw-50:y=80")

        font_file = self.get_font_file()
        font_opt = f"fontfile='{font_file}':" if font_file else "font=Arial:"
        return f"drawtext={font_opt}text='{safe_text}':fontsize=28:fontcolor=white@{alpha}:box=1:boxcolor=black@0.5:boxborderw=10:{pos_coord}"

    def build_color_grade_filter(self, preset: str) -> str:
        presets = {
            "vibrant": "eq=contrast=1.06:brightness=0.01:saturation=1.15",
            "punchy": "eq=contrast=1.12:brightness=-0.01:saturation=1.22",
            "cinematic": "eq=contrast=1.08:brightness=-0.02:saturation=0.95",
            "clean": "eq=contrast=1.02:brightness=0.0:saturation=1.05",
        }
        return presets.get(preset, presets["vibrant"])

    def process_video(
        self,
        input_path: str,
        options: ProcessOptions,
        subtitles_file: Optional[str] = None,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> str:
        """
        Executes complete FFmpeg filter pipeline:
        - 9:16 Smart Reframe:
            * Blur Background
            * Direct Crop to Fill (Center, Left, Right)
            * Split Screen with Viral Background Video (Gameplay / Satisfying)
            * Floating Card over Background Video
        - Speed multiplier (1.0 = exact original duration) + audio tempo sync
        - Horizontal flip & color grading
        - Watermark burning
        - Subtitles overlay
        """
        job_id = str(uuid.uuid4())[:12]
        output_file = str(self.output_dir / f"{job_id}_viral.mp4")

        total_duration = self.get_video_duration(input_path)
        speed = max(0.5, min(2.0, options.speed))
        effective_duration = total_duration / speed if speed > 0 else total_duration

        bg_video_path = self.get_background_video_path(options.background_video_id)
        has_bg_video = bg_video_path is not None and os.path.exists(bg_video_path)

        filter_complex = []

        # 1. Base foreground processing (flip, color grading, speed setpts)
        fg_filters = []
        if options.horizontal_flip:
            fg_filters.append("hflip")
        if options.color_grade:
            fg_filters.append(self.build_color_grade_filter(options.color_preset))
        if abs(speed - 1.0) > 0.01:
            fg_filters.append(f"setpts=PTS/{speed}")

        fg_chain = ",".join(fg_filters) if fg_filters else "null"

        # 2. Target Canvas Geometry & Framing
        reframe = options.reframe_mode
        crop_pos = options.crop_position or "center"

        target_w, target_h = 1080, 1920
        if options.aspect_ratio == "1:1":
            target_w, target_h = 1080, 1080
        elif options.aspect_ratio == "16:9":
            target_w, target_h = 1920, 1080

        # Only mount background video stream if the selected reframe mode actually uses it
        uses_bg_video = (
            has_bg_video
            and options.background_video_id not in [None, "blur", "none", "original"]
            and reframe in ["custom_crop", "split_screen", "floating_card", "blur_background"]
        )

        is_bg_image = bg_video_path and Path(bg_video_path).suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]

        # Reframe & Layout Logic
        if reframe == "custom_crop":
            # Custom Cropping & Framing (Matching reference layout: top video card over aesthetic background)
            scale_pct = getattr(options, "custom_scale", 86) or 86
            pos_y_pct = getattr(options, "custom_pos_y", 12) if getattr(options, "custom_pos_y", None) is not None else 12
            pos_x_pct = getattr(options, "custom_pos_x", 50) if getattr(options, "custom_pos_x", None) is not None else 50
            zoom = max(0.5, min(3.0, getattr(options, "custom_zoom", 1.0) or 1.0))
            aspect_choice = getattr(options, "custom_aspect", "1:1") or "1:1"

            # Compute card width & height (even numbers for h264)
            card_w = int(target_w * (scale_pct / 100.0))
            card_w = card_w - (card_w % 2)

            if aspect_choice == "1:1":
                card_h = card_w
            elif aspect_choice == "4:5":
                card_h = int(card_w * 5 / 4)
            elif aspect_choice == "16:9":
                card_h = int(card_w * 9 / 16)
            else: # "original" or default
                card_h = card_w
            card_h = card_h - (card_h % 2)

            # Horizontal & Vertical position
            max_x = max(0, target_w - card_w)
            pos_x = int(max_x * (pos_x_pct / 100.0))
            pos_y = int(target_h * (pos_y_pct / 100.0))

            # Foreground scale & zoom
            if zoom > 1.01:
                scaled_w = int(card_w * zoom)
                scaled_h = int(card_h * zoom)
                scaled_w = scaled_w - (scaled_w % 2)
                scaled_h = scaled_h - (scaled_h % 2)
                fg_filter = (
                    f"[0:v]{fg_chain},scale={scaled_w}:{scaled_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={card_w}:{card_h}:(in_w-{card_w})/2:(in_h-{card_h})/2[scaled_fg]"
                )
            else:
                fg_filter = (
                    f"[0:v]{fg_chain},scale={card_w}:{card_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={card_w}:{card_h}:(in_w-{card_w})/2:(in_h-{card_h})/2[scaled_fg]"
                )

            # Background setup
            if uses_bg_video:
                bg_filter = (
                    f"[1:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2[full_bg]"
                )
                v_chain = [bg_filter, fg_filter]
            else:
                # Fast downscale-blur-upscale backdrop
                bg_filter = (
                    f"[0:v]{fg_chain},split=2[raw_fg][raw_bg]"
                )
                bg_scale = (
                    f"[raw_bg]scale=360:640:flags=bicubic,boxblur=6:1,scale={target_w}:{target_h}:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2,eq=brightness=-0.12[full_bg]"
                )
                fg_filter_blur = fg_filter.replace(f"[0:v]{fg_chain}", "[raw_fg]")
                v_chain = [bg_filter, bg_scale, fg_filter_blur]

            if getattr(options, "custom_shadow", True):
                v_chain.append(f"[full_bg][scaled_fg]overlay={pos_x}:{pos_y}[overlayed]")
                v_chain.append(f"[overlayed]drawbox=x={pos_x}:y={pos_y}:w={card_w}:h={card_h}:color=white@0.12:t=2[framed]")
            else:
                v_chain.append(f"[full_bg][scaled_fg]overlay={pos_x}:{pos_y}[framed]")

            filter_complex.extend(v_chain)
            last_v_tag = "[framed]"

        elif reframe == "crop_to_fill":
            # Direct Crop to Fill (100% full screen coverage, no background blur)
            if crop_pos == "left":
                crop_x = "0"
            elif crop_pos == "right":
                crop_x = f"in_w-{target_w}"
            else: # center
                crop_x = f"(in_w-{target_w})/2"
            crop_y = f"(in_h-{target_h})/2"

            filter_complex.append(
                f"[0:v]{fg_chain},scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                f"crop={target_w}:{target_h}:{crop_x}:{crop_y}[framed]"
            )
            last_v_tag = "[framed]"

        elif reframe == "split_screen":
            # Split-Screen Viral Short: Top half Reddit clip, bottom half background video
            half_h = target_h // 2
            if uses_bg_video:
                v_chain = [
                    f"[1:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2[full_bg]",
                    f"[0:v]{fg_chain},scale={target_w}:{half_h}:force_original_aspect_ratio=decrease:flags=bicubic[scaled_fg]",
                    f"[full_bg][scaled_fg]overlay=(W-w)/2:({half_h}-h)/2[framed]"
                ]
            else:
                v_chain = [
                    f"[0:v]{fg_chain},split=2[raw_fg][raw_bg]",
                    f"[raw_bg]scale=360:640:flags=bicubic,boxblur=6:1,scale={target_w}:{target_h}:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2,eq=brightness=-0.14:contrast=1.05[full_bg]",
                    f"[raw_fg]scale={target_w}:{half_h}:force_original_aspect_ratio=decrease:flags=bicubic[scaled_fg]",
                    f"[full_bg][scaled_fg]overlay=(W-w)/2:({half_h}-h)/2[framed]"
                ]
            filter_complex.extend(v_chain)
            last_v_tag = "[framed]"

        elif reframe == "floating_card":
            card_w = max(320, target_w - 60)
            card_h = max(320, target_h - 100)
            if uses_bg_video:
                v_chain = [
                    f"[1:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2,eq=brightness=-0.08[full_bg]",
                    f"[0:v]{fg_chain},scale={card_w}:{card_h}:force_original_aspect_ratio=decrease:flags=bicubic[scaled_fg]",
                    f"[full_bg][scaled_fg]overlay=(W-w)/2:(H-h)/2[framed]"
                ]
            else:
                v_chain = [
                    f"[0:v]{fg_chain},split=2[raw_fg][raw_bg]",
                    f"[raw_bg]scale=360:640:flags=bicubic,boxblur=6:1,scale={target_w}:{target_h}:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2,eq=brightness=-0.14:contrast=1.05[full_bg]",
                    f"[raw_fg]scale={card_w}:{card_h}:force_original_aspect_ratio=decrease:flags=bicubic[scaled_fg]",
                    f"[full_bg][scaled_fg]overlay=(W-w)/2:(H-h)/2[framed]"
                ]
            filter_complex.extend(v_chain)
            last_v_tag = "[framed]"

        else:
            # Blur Background or Custom Backdrop behind centered Reddit video
            if uses_bg_video:
                v_chain = [
                    f"[1:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2[bg]",
                    f"[0:v]{fg_chain},scale={target_w}:{target_h}:force_original_aspect_ratio=decrease:flags=bicubic[fg]",
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2[framed]"
                ]
            else:
                v_chain = [
                    f"[0:v]{fg_chain},split=2[raw_fg][raw_bg]",
                    f"[raw_bg]scale=360:640:flags=bicubic,boxblur=6:1,scale={target_w}:{target_h}:flags=bicubic,"
                    f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2,eq=brightness=-0.14:contrast=1.05[bg]",
                    f"[raw_fg]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease:flags=bicubic[fg]",
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2[framed]"
                ]
            filter_complex.extend(v_chain)
            last_v_tag = "[framed]"

        # 3. Watermark
        if options.watermark_enabled and options.watermark_text:
            wm_filter = self.build_watermark_drawtext(
                options.watermark_text,
                options.watermark_position,
                options.watermark_opacity
            )
            filter_complex.append(f"{last_v_tag}{wm_filter}[watermarked]")
            last_v_tag = "[watermarked]"

        # 4. Burn Subtitles
        if subtitles_file and os.path.exists(subtitles_file):
            escaped_sub_path = self.escape_ffmpeg_path(subtitles_file)
            if subtitles_file.endswith(".ass"):
                sub_filter = f"ass='{escaped_sub_path}'"
            else:
                sub_filter = f"subtitles='{escaped_sub_path}'"
            filter_complex.append(f"{last_v_tag}{sub_filter}[subtitled]")
            last_v_tag = "[subtitled]"

        # 5. Audio filter (speed tempo)
        audio_filter = f"atempo={speed}" if abs(speed - 1.0) > 0.01 else "anull"
        filter_complex_str = ";".join(filter_complex)

        # Assemble FFmpeg Command with High-Performance Multi-Threading & Hardware Optimization
        cmd = ["ffmpeg", "-nostdin", "-y", "-threads", "0", "-i", input_path]
        if uses_bg_video:
            if is_bg_image:
                cmd.extend(["-loop", "1", "-i", bg_video_path])
            else:
                cmd.extend(["-stream_loop", "-1", "-i", bg_video_path])

        cmd.extend([
            "-filter_complex", filter_complex_str,
            "-map", last_v_tag,
            "-map", "0:a?",
            "-af", audio_filter,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "21",
            "-tune", "fastdecode",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-t", f"{effective_duration:.3f}",
            "-progress", "pipe:1",
            output_file
        ])

        logger.info(f"Running FFmpeg: {' '.join(cmd[:14])}...")

        process = subprocess.Popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        time_pattern = re.compile(r"out_time_ms=(\d+)")
        recent_output = []
        
        for line in process.stdout:
            recent_output.append(line)
            if len(recent_output) > 50:
                recent_output.pop(0)

            line_str = line.strip()
            match = time_pattern.search(line_str)
            if match and effective_duration > 0:
                current_micros = int(match.group(1))
                current_secs = current_micros / 1_000_000.0
                pct = int(min(98, (current_secs / effective_duration) * 100))
                if progress_callback:
                    progress_callback(pct, f"Rendering video filters ({pct}%)...")

        process.wait()
        if process.returncode != 0:
            err_msg = "".join(recent_output)
            logger.error(f"FFmpeg failed with code {process.returncode}: {err_msg}")
            raise RuntimeError(f"FFmpeg render error: {err_msg}")

        if progress_callback:
            progress_callback(100, "Rendering completed successfully!")

        return output_file

video_processor = VideoProcessor()
