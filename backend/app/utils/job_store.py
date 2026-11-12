import time
from typing import Dict, Optional, Any
from backend.app.schemas.video import JobStatus, AIMetadataResponse

class JobStore:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self, job_id: str, video_id: Optional[str] = None) -> JobStatus:
        job_data = {
            "job_id": job_id,
            "status": "pending",
            "progress": 0,
            "message": "Job initialized",
            "error": None,
            "video_id": video_id,
            "original_video_url": None,
            "rendered_video_url": None,
            "download_url": None,
            "metadata": None,
            "raw_details": {},
            "created_at": time.time(),
            "updated_at": time.time()
        }
        self._jobs[job_id] = job_data
        return JobStatus(**job_data)

    def update_job(
        self,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
        rendered_video_url: Optional[str] = None,
        download_url: Optional[str] = None,
        metadata: Optional[Any] = None,
        raw_details: Optional[Dict[str, Any]] = None,
        original_video_url: Optional[str] = None,
    ) -> Optional[JobStatus]:
        if job_id not in self._jobs:
            return None

        job = self._jobs[job_id]
        if status is not None:
            job["status"] = status
        if progress is not None:
            job["progress"] = progress
        if message is not None:
            job["message"] = message
        if error is not None:
            job["error"] = error
        if rendered_video_url is not None:
            job["rendered_video_url"] = rendered_video_url
        if download_url is not None:
            job["download_url"] = download_url
        if metadata is not None:
            if isinstance(metadata, dict):
                job["metadata"] = AIMetadataResponse(**metadata)
            else:
                job["metadata"] = metadata
        if original_video_url is not None:
            job["original_video_url"] = original_video_url
        if raw_details is not None:
            job["raw_details"].update(raw_details)

        job["updated_at"] = time.time()
        return JobStatus(**job)

    def get_job(self, job_id: str) -> Optional[JobStatus]:
        if job_id not in self._jobs:
            return None
        return JobStatus(**self._jobs[job_id])

job_store = JobStore()
