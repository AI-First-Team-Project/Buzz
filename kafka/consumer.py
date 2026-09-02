"""Buzz Kafka Consumer

Kafka의 audio-input 메시지를 수신한 뒤 AI 모델을 직접 호출하지 않고,
FastAPI의 /api/internal/analyze-file 엔드포인트에 분석 요청을 전달한다.
"""

import json
import os
from typing import Any

import requests
from confluent_kafka import Consumer, KafkaError


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_AUDIO_TOPIC", "audio-input")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "buzz-fastapi-consumer-group")
FASTAPI_BASE_URL = os.getenv("BUZZ_FASTAPI_URL", "http://localhost:8000").rstrip("/")
FASTAPI_ANALYZE_URL = f"{FASTAPI_BASE_URL}/api/internal/analyze-file"
REQUEST_TIMEOUT_SEC = float(os.getenv("BUZZ_FASTAPI_TIMEOUT_SEC", "60"))


consumer = Consumer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "group.id": KAFKA_GROUP_ID,
    "auto.offset.reset": "latest",
    # FastAPI 호출이 성공한 메시지만 commit 하기 위해 자동 commit 비활성화
    "enable.auto.commit": False,
})

consumer.subscribe([KAFKA_TOPIC])


def build_fastapi_payload(message: dict[str, Any]) -> dict[str, Any]:
    """Kafka 메시지를 FastAPI AnalyzePathRequest 형식으로 변환한다."""
    file_path = message.get("file_path")
    if not file_path:
        raise ValueError("Kafka 메시지에 file_path가 없습니다.")

    return {
        "file_path": file_path,
        "site_id": int(message.get("site_id", 3)),
        "source": "kafka",
    }


def request_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    """FastAPI에 파일 분석을 요청하고 JSON 결과를 반환한다."""
    response = requests.post(
        FASTAPI_ANALYZE_URL,
        json=payload,
        timeout=REQUEST_TIMEOUT_SEC,
    )

    if not response.ok:
        raise RuntimeError(
            f"FastAPI 분석 실패 HTTP {response.status_code}: {response.text}"
        )

    return response.json()


def main() -> None:
    print("=" * 60)
    print("Buzz Kafka Consumer 시작")
    print(f"Kafka: {KAFKA_BOOTSTRAP_SERVERS}")
    print(f"Topic: {KAFKA_TOPIC}")
    print(f"FastAPI: {FASTAPI_ANALYZE_URL}")
    print("AI 모델은 Kafka에서 직접 실행하지 않고 FastAPI에 분석을 요청합니다.")
    print("=" * 60)

    try:
        while True:
            message = consumer.poll(timeout=1.0)

            if message is None:
                continue

            if message.error():
                if message.error().code() == KafkaError._PARTITION_EOF:
                    continue
                print("[Consumer] Kafka 오류:", message.error())
                continue

            try:
                kafka_data = json.loads(message.value().decode("utf-8"))
                print("[Consumer] Kafka 메시지 수신:", kafka_data)

                payload = build_fastapi_payload(kafka_data)
                print("[Consumer] FastAPI 분석 요청:", payload)

                analysis_result = request_analysis(payload)
                print("[Consumer] FastAPI 분석 완료:")
                print(json.dumps(analysis_result, ensure_ascii=False, indent=2))

                # FastAPI가 정상 처리한 경우에만 해당 Kafka offset 저장
                consumer.commit(message=message, asynchronous=False)

            except Exception as exc:
                # 한 파일의 실패 때문에 Consumer 전체가 종료되지 않게 유지한다.
                print("[Consumer] 메시지 처리 실패:", repr(exc))
                print("[Consumer] FastAPI/Kafka 상태와 file_path 접근 가능 여부를 확인하세요.")

    except KeyboardInterrupt:
        print("\n[Consumer] 종료합니다.")
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
