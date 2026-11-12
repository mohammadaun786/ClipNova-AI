import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse, FileResponse
from backend.app.config import settings

router = APIRouter(prefix="/video", tags=["Video Streaming & Download"])

def parse_range_header(range_header: str, file_size: int):
    match = re.search(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return 0, file_size - 1
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1
    return start, min(end, file_size - 1)

@router.get("/file/{folder}/{file_name}")
async def stream_video(folder: str, file_name: str, request: Request):
    """
    Stream MP4 video with full HTTP 206 Partial Content (range requests)
    for seamless browser playback and scrubbing.
    """
    if folder not in ["temp", "rendered"]:
        raise HTTPException(status_code=400, detail="Invalid folder")

    # Sanitize filename
    safe_name = Path(file_name).name
    file_path = settings.OUTPUT_DIR / folder / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if not range_header:
        # Full file response
        return FileResponse(
            path=file_path,
            media_type="video/mp4",
            headers={"Accept-Ranges": "bytes"}
        )

    start, end = parse_range_header(range_header, file_size)
    chunk_size = (end - start) + 1

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                read_size = min(bytes_left, 1024 * 1024)  # 1MB chunks
                data = f.read(read_size)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(iter_file(), status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)

@router.get("/download/{folder}/{file_name}")
async def download_video(folder: str, file_name: str):
    """Direct file download endpoint with Content-Disposition attachment."""
    if folder not in ["temp", "rendered"]:
        raise HTTPException(status_code=400, detail="Invalid folder")

    safe_name = Path(file_name).name
    file_path = settings.OUTPUT_DIR / folder / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=f"clipnova_{safe_name}"
    )
