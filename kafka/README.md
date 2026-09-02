# Buzz Kafka 연동 가이드

## 역할

Kafka 파트는 AI 모델을 직접 실행하지 않습니다.

```text
새 음원 파일
  ↓
kafka/producer.py (폴더 감시)
  ↓
Kafka audio-input Topic
  ↓
kafka/consumer.py
  ↓
POST /api/internal/analyze-file
  ↓
FastAPI
  ↓
최종 AI 모델
```

## Producer

기본 감시 폴더:

```text
<프로젝트 루트>/data/raw
```

Producer 실행 이후 이 폴더에 새 `.wav` 또는 `.mp3` 파일이 들어오면 다음 형태의 Kafka 메시지를 전송합니다.

```json
{
  "event_id": "evt_xxx",
  "file_id": "audio_xxx",
  "file_name": "wasp_001.wav",
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "kafka",
  "created_at": "2026-09-02T16:30:00.000+09:00"
}
```

실행:

```bash
python kafka/producer.py
```

## Consumer

Consumer는 Kafka 메시지를 받고 FastAPI에 다음 JSON만 전달합니다.

```json
{
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "kafka"
}
```

기본 FastAPI 주소:

```text
http://localhost:8000/api/internal/analyze-file
```

실행:

```bash
python kafka/consumer.py
```

## 필요한 패키지

```bash
pip install -r kafka/requirements.txt
```

## 환경변수 (선택)

- `KAFKA_BOOTSTRAP_SERVERS` 기본값 `localhost:9092`
- `KAFKA_AUDIO_TOPIC` 기본값 `audio-input`
- `KAFKA_GROUP_ID` 기본값 `buzz-fastapi-consumer-group`
- `BUZZ_FASTAPI_URL` 기본값 `http://localhost:8000`
- `BUZZ_AUDIO_WATCH_FOLDER` 기본값 `<프로젝트>/data/raw`
- `BUZZ_SITE_ID` 기본값 `3`

## 주의

Kafka에는 음원 자체를 넣지 않고 `file_path`를 전달합니다. 따라서 Kafka Consumer와 FastAPI가 다른 PC/컨테이너에서 실행된다면 **양쪽이 같은 파일 경로를 볼 수 있도록 공유 폴더/볼륨**을 사용해야 합니다.
