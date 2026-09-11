from __future__ import annotations
from datetime import datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import librosa
import numpy as np
import soundfile as sf

from ..config import DURATION_SEC, SAMPLE_RATE
from .analysis_service import analyze_audio


def _wav_bytes(chunk: np.ndarray) -> bytes:
    buffer = BytesIO()
    sf.write(buffer, chunk, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


def merge_wasp_ranges(chunks: list[dict]) -> list[dict]:
    ranges = []
    for item in chunks:
        if item["prediction"]["label"] != "wasp":
            continue
        start, end = item["startSec"], item["endSec"]
        if ranges and abs(ranges[-1]["endSec"] - start) < 1e-6:
            ranges[-1]["endSec"] = end
            ranges[-1]["maxConfidence"] = max(ranges[-1]["maxConfidence"], item["prediction"]["confidence"])
        else:
            ranges.append({"startSec": start, "endSec": end, "maxConfidence": item["prediction"]["confidence"]})
    return ranges


def analyze_full_file(path: Path, original_name: str, site_id: int) -> dict:
    audio, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0:
        raise ValueError("오디오 데이터가 비어 있습니다.")
    chunk_samples = int(SAMPLE_RATE * DURATION_SEC)
    total_duration = audio.size / SAMPLE_RATE
    chunks = []
    for chunk_index, start_sample in enumerate(range(0, audio.size, chunk_samples)):
        source = audio[start_sample:start_sample + chunk_samples]
        padded = np.zeros(chunk_samples, dtype=np.float32)
        padded[:source.size] = source
        stream = BytesIO(_wav_bytes(padded))
        stream.name = f"{Path(original_name).stem}_chunk_{chunk_index + 1:04d}.wav"
        result = analyze_audio(stream, "user_test", stream.name)
        start_sec = chunk_index * DURATION_SEC
        end_sec = min(total_duration, start_sec + DURATION_SEC)
        payload = result.model_dump(by_alias=True, mode="json")
        payload.update({
            "chunkIndex": chunk_index,
            "startSec": round(start_sec, 3),
            "endSec": round(end_sec, 3),
            "padded": source.size < chunk_samples,
        })
        chunks.append(payload)
    ranges = merge_wasp_ranges(chunks)
    max_confidence = max((c["prediction"]["confidence"] for c in chunks), default=0.0)
    return {
        "testId": uuid4().hex,
        "testedAt": datetime.now().astimezone().isoformat(),
        "siteId": site_id,
        "fileName": original_name,
        "totalDuration": round(total_duration, 3),
        "chunkDuration": DURATION_SEC,
        "detectedRanges": ranges,
        "maxConfidence": max_confidence,
        "finalResult": "wasp" if ranges else "non_wasp",
        "chunks": chunks,
    }
