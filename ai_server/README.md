# Buzz FastAPI 서버

Buzz의 `음원 분석 → AI 추론 → JSON → Android` 구간을 담당하는 서버입니다.
Kafka Consumer는 `/api/internal/analyze-file`만 호출하며, 사용자 테스트는 `/api/test/analyze`로 직접 파일을 업로드합니다.

## 2026-09-02 기준

- AI 입력 기준: **2초 / 48kHz**
- 분류: `wasp / bee / other`
- 그래프 전달: **PNG 이미지 URL이 아니라 수치 JSON**
- 최종 AI 모델 선정 전까지 예측은 `mock-placeholder`
- 최종 모델 선정 후 `app/services/predictor.py`의 `predict_audio()`만 실제 추론 코드로 교체

## 주요 API

- `GET /health` — 서버 생존 확인
- `POST /api/test/analyze` — 사용자 테스트 MP3/WAV 직접 업로드
  - 자동 감지 상태, 가상 문, 자동 감지 이력에는 영향 없음
- `POST /api/internal/analyze-file` — Kafka Consumer 연동용
  - 분석 후 사업장 상태 갱신
  - 말벌 판정 시 가상 문 자동 `CLOSED`
- `GET /api/status/{site_id}` — 사업장 상태 조회
- `GET /api/history` — 위험/문 제어 이력 조회
- `POST /api/door/{site_id}` — 가상 문 수동 열기/닫기

## 실행

Windows PowerShell 기준:

```powershell
cd ai_server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

또는:

```powershell
uvicorn app.main:app --reload --port 8000
```

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 사용자 테스트

`POST /api/test/analyze`

`multipart/form-data`의 `file`에 MP3/WAV를 넣습니다.

응답 예시:

```json
{
  "analysisId": "abc123",
  "audio": {
    "fileName": "wasp_001.wav",
    "sampleRate": 48000,
    "duration": 2.0
  },
  "prediction": {
    "label": "wasp",
    "confidence": 0.968,
    "probabilities": {
      "wasp": 0.968,
      "bee": 0.021,
      "other": 0.011
    }
  },
  "waveform": {
    "amplitude": [0.01, 0.03]
  },
  "fft": {
    "frequency": [0.0, 23.4],
    "magnitudeDb": [-42.1, -31.2]
  },
  "spectrogram": {
    "time": [0.0, 0.01],
    "frequency": [0.0, 31.2],
    "db": [[-80.0, -65.2]]
  },
  "mfcc": {
    "time": [0.0, 0.01],
    "coefficients": [[-210.2, -205.1]]
  },
  "meta": {
    "source": "user_test",
    "modelName": "mock-placeholder",
    "timestamp": "2026-09-02T17:00:00+09:00"
  }
}
```

Waveform은 96,000개 샘플 전체를 전송하지 않고 약 1,500개 포인트로 축소합니다. FFT, Mel-Spectrogram, MFCC도 응답 크기를 제한합니다.

## Kafka 연결

Kafka Consumer는 다음 API를 호출합니다.

`POST /api/internal/analyze-file`

```json
{
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "kafka"
}
```

```text
자동 감지 음원
  ↓
Kafka Producer
  ↓
Kafka Topic
  ↓
Kafka Consumer
  ↓
POST /api/internal/analyze-file
  ↓
FastAPI
  ↓
2초 / 48kHz + Librosa
  ↓
Best Model (현재는 Mock)
  ↓
수치 JSON
  ↓
Android UI
```
