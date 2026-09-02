"""Buzz Kafka Producer

지정 폴더에 새 MP3/WAV 파일이 들어오면 파일 메타데이터를 Kafka로 전송한다.
음원 자체를 Kafka에 넣지 않고, FastAPI가 접근할 수 있는 절대 파일 경로만 전달한다.
"""

import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from confluent_kafka import Producer


KST = timezone(timedelta(hours=9))
PROJECT_ROOT = Path(__file__).resolve().parent.parent

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_AUDIO_TOPIC", "audio-input")
WATCH_FOLDER = Path(os.getenv("BUZZ_AUDIO_WATCH_FOLDER", str(PROJECT_ROOT / "data" / "raw"))).expanduser().resolve()
SITE_ID = int(os.getenv("BUZZ_SITE_ID", "3"))
POLL_INTERVAL_SEC = float(os.getenv("BUZZ_WATCH_INTERVAL_SEC", "1"))

ALLOWED_EXTENSIONS = {".wav", ".mp3"}

WATCH_FOLDER.mkdir(parents=True, exist_ok=True)

producer = Producer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
})


def _delivery_report(err, msg):
    if err is not None:
        print(f"[Kafka] 전송 실패: {err}")
    else:
        print(
            f"[Kafka] 전송 완료 topic={msg.topic()} "
            f"partition={msg.partition()} offset={msg.offset()}"
        )


def send_audio_event(file_path: Path) -> None:
    """새 음원 파일 정보를 Kafka audio-input 토픽으로 전송한다."""
    file_path = file_path.resolve()

    message = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "file_id": f"audio_{uuid.uuid4().hex[:12]}",
        "file_name": file_path.name,
        "file_path": str(file_path),
        "site_id": SITE_ID,
        "source": "kafka",
        "created_at": datetime.now(KST).isoformat(timespec="milliseconds"),
    }

    producer.produce(
        KAFKA_TOPIC,
        value=json.dumps(message, ensure_ascii=False).encode("utf-8"),
        callback=_delivery_report,
    )
    producer.flush()

    print("[Producer] 새 음원 이벤트 전송:", message)


def wait_until_file_is_stable(file_path: Path, checks: int = 2, delay: float = 0.5) -> bool:
    """복사 중인 파일을 너무 일찍 전송하지 않도록 크기가 안정됐는지 확인한다."""
    try:
        previous_size = -1
        for _ in range(checks):
            current_size = file_path.stat().st_size
            if current_size == previous_size and current_size > 0:
                return True
            previous_size = current_size
            time.sleep(delay)
        return file_path.exists() and file_path.stat().st_size > 0
    except OSError:
        return False


def main() -> None:
    print("=" * 60)
    print("Buzz Kafka Producer 시작")
    print(f"Kafka: {KAFKA_BOOTSTRAP_SERVERS}")
    print(f"Topic: {KAFKA_TOPIC}")
    print(f"감시 폴더: {WATCH_FOLDER}")
    print("새 MP3/WAV 파일이 추가되면 Kafka로 파일 경로를 전송합니다.")
    print("=" * 60)

    # 실행 시 이미 존재하는 파일은 '처리 완료' 상태로 보고,
    # 실행 이후 새로 들어오는 파일만 전송한다.
    seen_files = {
        path.resolve()
        for path in WATCH_FOLDER.iterdir()
        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS
    }

    try:
        while True:
            current_files = sorted(
                path.resolve()
                for path in WATCH_FOLDER.iterdir()
                if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS
            )

            for file_path in current_files:
                if file_path in seen_files:
                    continue

                if not wait_until_file_is_stable(file_path):
                    continue

                try:
                    send_audio_event(file_path)
                    seen_files.add(file_path)
                except Exception as exc:
                    print(f"[Producer] 파일 전송 오류 ({file_path.name}): {exc!r}")

            time.sleep(POLL_INTERVAL_SEC)

    except KeyboardInterrupt:
        print("\n[Producer] 종료합니다.")
    finally:
        producer.flush()


if __name__ == "__main__":
    main()
