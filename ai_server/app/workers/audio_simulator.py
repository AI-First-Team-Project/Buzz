"""Feed three sites' audio to FastAPI in sequential two-second chunks.

Run from the project root:
    python -m ai_server.app.workers.audio_simulator
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from io import BytesIO
import logging
import math
from pathlib import Path
from collections.abc import Iterator

import httpx
import librosa
import numpy as np
import soundfile as sf

from ..config import (
    ALLOWED_EXTENSIONS,
    DURATION_SEC,
    SAMPLE_RATE,
    SIMULATOR_API_URL,
    SIMULATOR_AUDIO_ROOT,
    SIMULATOR_BATCH_WAIT_SECONDS,
    SIMULATOR_INTERVAL_SECONDS,
    SIMULATOR_MAX_RETRIES,
    SIMULATOR_QUEUE_SIZE,
    SIMULATOR_REQUEST_TIMEOUT_SECONDS,
    SIMULATOR_RETRY_SECONDS,
)

logger = logging.getLogger("buzz.audio_simulator")
SITE_IDS = (1, 2, 3)


@dataclass(frozen=True)
class AnalysisJob:
    site_id: int
    source_path: Path
    chunk_index: int
    wav_bytes: bytes

    @property
    def upload_name(self) -> str:
        return f"{self.source_path.stem}_part_{self.chunk_index + 1:05d}.wav"


def discover_audio_files(site_directory: Path) -> list[Path]:
    """Return supported files in deterministic name order."""
    if not site_directory.exists():
        return []
    return sorted(
        (
            path
            for path in site_directory.iterdir()
            if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS
        ),
        key=lambda path: path.name.casefold(),
    )


def load_audio(audio_path: Path) -> np.ndarray:
    audio, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    return np.asarray(audio, dtype=np.float32)


def split_audio(audio: np.ndarray) -> Iterator[np.ndarray]:
    """Split all samples in order and zero-pad only the final short chunk."""
    chunk_samples = int(SAMPLE_RATE * DURATION_SEC)
    for start in range(0, audio.size, chunk_samples):
        source = audio[start : start + chunk_samples]
        chunk = np.zeros(chunk_samples, dtype=np.float32)
        chunk[: source.size] = source
        yield chunk


def encode_wav(audio: np.ndarray) -> bytes:
    buffer = BytesIO()
    sf.write(buffer, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


async def produce_site_audio(site_id: int, queue: asyncio.Queue[AnalysisJob]) -> None:
    """Read one site's files and chunks sequentially, then restart the folder."""
    site_directory = SIMULATOR_AUDIO_ROOT / f"site{site_id}"

    while True:
        files = discover_audio_files(site_directory)
        if not files:
            logger.warning("사업장 %s 음원 없음: %s", site_id, site_directory)
            await asyncio.sleep(SIMULATOR_RETRY_SECONDS)
            continue

        for audio_path in files:
            try:
                audio = await asyncio.to_thread(load_audio, audio_path)
                chunk_samples = int(SAMPLE_RATE * DURATION_SEC)
                chunk_count = math.ceil(audio.size / chunk_samples) if audio.size else 0
                if chunk_count == 0:
                    logger.warning("빈 음원 건너뜀: site=%s file=%s", site_id, audio_path.name)
                    continue

                logger.info(
                    "음원 처리 시작: site=%s file=%s chunks=%s",
                    site_id,
                    audio_path.name,
                    chunk_count,
                )
                for chunk_index, chunk in enumerate(split_audio(audio)):
                    await queue.put(
                        AnalysisJob(
                            site_id=site_id,
                            source_path=audio_path,
                            chunk_index=chunk_index,
                            wav_bytes=encode_wav(chunk),
                        )
                    )
                    await asyncio.sleep(SIMULATOR_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("음원 처리 실패: site=%s file=%s", site_id, audio_path)

        logger.info("사업장 %s 폴더 끝 도달, 첫 파일부터 반복", site_id)


async def submit_batch(client: httpx.AsyncClient, jobs: list[AnalysisJob]) -> bool:
    for attempt in range(1, SIMULATOR_MAX_RETRIES + 1):
        try:
            response = await client.post(
                SIMULATOR_API_URL,
                data={"site_ids": [str(job.site_id) for job in jobs]},
                files=[
                    ("files", (job.upload_name, job.wav_bytes, "audio/wav"))
                    for job in jobs
                ],
            )
            if 400 <= response.status_code < 500 and response.status_code != 429:
                logger.error(
                    "배치 분석 요청 거부, 재시도하지 않음: sites=%s status=%s body=%s",
                    [job.site_id for job in jobs],
                    response.status_code,
                    response.text[:300],
                )
                return False
            response.raise_for_status()
            for item in response.json():
                prediction = item.get("analysis", {}).get("prediction", {})
                logger.info(
                    "배치 분석 완료: site=%s label=%s confidence=%s",
                    item.get("siteId"),
                    prediction.get("label"),
                    prediction.get("confidence"),
                )
            return True
        except asyncio.CancelledError:
            raise
        except (httpx.HTTPError, ValueError):
            logger.exception(
                "배치 분석 요청 실패: sites=%s attempt=%s/%s",
                [job.site_id for job in jobs],
                attempt,
                SIMULATOR_MAX_RETRIES,
            )
            if attempt < SIMULATOR_MAX_RETRIES:
                await asyncio.sleep(SIMULATOR_RETRY_SECONDS)
    return False


async def collect_site_batch(
    queues: dict[int, asyncio.Queue[AnalysisJob]],
) -> list[AnalysisJob]:
    """Collect at most one current chunk per site with a short batch window."""
    get_tasks = [asyncio.create_task(queue.get()) for queue in queues.values()]
    done, pending = await asyncio.wait(get_tasks, return_when=asyncio.FIRST_COMPLETED)
    if pending:
        additional_done, pending = await asyncio.wait(
            pending,
            timeout=SIMULATOR_BATCH_WAIT_SECONDS,
        )
        done.update(additional_done)

    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)

    return sorted((task.result() for task in done), key=lambda job: job.site_id)


async def consume_analysis_queues(
    queues: dict[int, asyncio.Queue[AnalysisJob]],
) -> None:
    timeout = httpx.Timeout(SIMULATOR_REQUEST_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(timeout=timeout) as client:
        while True:
            jobs = await collect_site_batch(queues)
            try:
                await submit_batch(client, jobs)
            finally:
                for job in jobs:
                    queues[job.site_id].task_done()


async def run() -> None:
    if SIMULATOR_INTERVAL_SECONDS < 0:
        raise ValueError("BUZZ_SIMULATOR_INTERVAL_SECONDS는 0 이상이어야 합니다.")
    if SIMULATOR_MAX_RETRIES < 1:
        raise ValueError("BUZZ_SIMULATOR_MAX_RETRIES는 1 이상이어야 합니다.")
    if SIMULATOR_QUEUE_SIZE < 1:
        raise ValueError("BUZZ_SIMULATOR_QUEUE_SIZE는 1 이상이어야 합니다.")
    if SIMULATOR_BATCH_WAIT_SECONDS < 0:
        raise ValueError("BUZZ_SIMULATOR_BATCH_WAIT_SECONDS는 0 이상이어야 합니다.")

    for site_id in SITE_IDS:
        (SIMULATOR_AUDIO_ROOT / f"site{site_id}").mkdir(parents=True, exist_ok=True)

    logger.info("음원 Worker 시작: root=%s api=%s", SIMULATOR_AUDIO_ROOT, SIMULATOR_API_URL)
    queues = {
        site_id: asyncio.Queue(maxsize=SIMULATOR_QUEUE_SIZE)
        for site_id in SITE_IDS
    }
    tasks = [asyncio.create_task(consume_analysis_queues(queues), name="batch-consumer")]
    tasks.extend(
        asyncio.create_task(
            produce_site_audio(site_id, queues[site_id]),
            name=f"site{site_id}-producer",
        )
        for site_id in SITE_IDS
    )
    await asyncio.gather(*tasks)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logger.info("음원 Worker 종료")


if __name__ == "__main__":
    main()
