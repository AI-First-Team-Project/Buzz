"""Bounded temporary storage for user-provided audio uploads."""

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from .config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR

COPY_CHUNK_BYTES = 1024 * 1024


def save_upload(file: UploadFile) -> Path:
    suffix = Path(file.filename or "audio.wav").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="MP3 또는 WAV 파일만 업로드할 수 있습니다.")

    path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    total = 0
    try:
        with path.open("wb") as output:
            while chunk := file.file.read(COPY_CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="파일 크기는 30MB 이하여야 합니다.")
                output.write(chunk)
        return path
    except BaseException:
        path.unlink(missing_ok=True)
        raise
