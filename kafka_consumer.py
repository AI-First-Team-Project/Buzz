from confluent_kafka import Consumer, Producer
import json
import uuid
from datetime import datetime, timezone, timedelta

# ===== [수정 시작 9월 2일 15:18] 단일 MobileNetV2 직접 로드 대신 통합 모델 서비스 사용 =====
from model_service import predict_from_file
# ===== [수정 종료] =====


# [추가 9월 2일 14:50] KST 타임존 정의
KST = timezone(timedelta(hours=9))


# =========================================================
# AI 모델 설정
# =========================================================

# ===== [수정 시작 9월 2일 15:18] AI 모델은 model_service.py에서 서버 시작 시 한 번만 로드하도록 변경 =====
# model_service.py 내부에서 아래 두 모델을 함께 사용합니다.
#
# 1차 모델:
#   models/bee_autoencoder.pth
#   → bee / anomaly 판정
#
# 2차 모델:
#   models/hornet_other_mobilenetv2_all.pth
#   → hornet / other 판정
#
# 최종 결과:
#   bee / hornet / other
# ===== [수정 종료] =====


# =========================================================
# Kafka Consumer / Producer 설정
# =========================================================

# [수정 9월 2일 14:30] Consumer 실행 이후 들어오는 새 메시지를 수신하도록 설정
consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "audio-input-consumer-group",
    "auto.offset.reset": "latest"
})

# [추가 9월 2일 14:30] audio-input 토픽 구독
consumer.subscribe([
    "audio-input"
])

# [추가 9월 2일 14:30] AI 탐지 결과를 Kafka로 다시 전송하기 위한 Producer 생성
result_producer = Producer({
    "bootstrap.servers": "localhost:9092"
})

RESULT_TOPIC = "hornet-detection"


print("Consumer 시작: audio-input topic 데이터를 수신합니다.")
print("AI 추론 구조: Bee Autoencoder → MobileNetV2")
print("최종 분류 클래스: bee / hornet / other")


# =========================================================
# Kafka 메시지 처리
# =========================================================

try:
    while True:
        # [추가 9월 2일 14:30] audio-input 토픽에서 메시지 1건씩 수신
        message = consumer.poll(
            timeout=1.0
        )

        if message is None:
            continue

        if message.error():
            print(
                "Kafka Consumer 오류:",
                message.error()
            )
            continue

        try:
            # [추가 9월 2일 14:30] Kafka JSON 메시지를 Python dict로 변환
            data = json.loads(
                message.value().decode("utf-8")
            )

            # [수정 9월 2일 14:35] 원본 업로드 파일명도 함께 출력
            print(
                "수신:",
                {
                    "event_id": data.get("event_id"),
                    "file_id": data.get("file_id"),
                    "original_filename": data.get("original_filename"),
                    "file_path": data.get("file_path"),
                    "source": data.get("source"),
                    "created_at": data.get("created_at")
                }
            )

            file_path = data.get("file_path")

            # ===== [추가 시작 9월 2일 15:18] file_path 누락 메시지 검증 =====
            if not file_path:
                raise ValueError(
                    "Kafka 메시지에 file_path가 없습니다."
                )
            # ===== [추가 종료] =====

            print(
                f"AI 추론 대상 파일: {file_path}"
            )

            # ===== [수정 시작 9월 2일 15:18] Bee Autoencoder + MobileNetV2 통합 추론 실행 =====
            ai_result = predict_from_file(
                file_path
            )

            prediction = ai_result[
                "prediction"
            ]

            confidence = ai_result.get(
                "confidence"
            )

            detected = ai_result.get(
                "detected",
                prediction == "hornet"
            )
            # ===== [수정 종료] =====

            # ===== [수정 시작 9월 2일 15:18] 3-class 통합 AI 결과를 Kafka 메시지에 포함 =====
            result_message = {
                "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                "file_id": data.get("file_id"),
                "original_filename": data.get("original_filename"),

                # 최종 분류 결과: bee / hornet / other
                "prediction": prediction,

                # bee 판정은 Autoencoder threshold 방식이므로 confidence가 None일 수 있음
                "confidence": confidence,

                # hornet일 때만 True
                "detected": detected,

                # 실제 어느 단계에서 최종 판정됐는지 확인
                "stage": ai_result.get("stage"),

                # 1차 Bee Autoencoder 관련 값
                "bee_reconstruction_error": ai_result.get(
                    "bee_reconstruction_error"
                ),
                "bee_threshold": ai_result.get(
                    "bee_threshold"
                ),

                # 2차 MobileNetV2 관련 값
                "hornet_probability": ai_result.get(
                    "hornet_probability"
                ),
                "other_probability": ai_result.get(
                    "other_probability"
                ),

                "detected_at": datetime.now(KST).isoformat(
                    timespec="milliseconds"
                )
            }
            # ===== [수정 종료] =====

            # [추가 9월 2일 14:30] hornet-detection 토픽에 AI 탐지 결과 전송
            result_producer.produce(
                RESULT_TOPIC,
                value=json.dumps(
                    result_message,
                    ensure_ascii=False
                ).encode("utf-8")
            )

            result_producer.flush()

            print(
                "탐지 결과 전송:",
                result_message
            )

        except Exception as e:
            # [추가 9월 2일 14:55] 특정 음원 추론 실패가 Consumer 전체 종료로 이어지지 않도록 예외 처리
            print(
                "메시지 처리 오류:",
                repr(e)
            )

finally:
    # [추가 9월 2일 14:30] Consumer 종료 시 Kafka 연결 정리
    consumer.close()
