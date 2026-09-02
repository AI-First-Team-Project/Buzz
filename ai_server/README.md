# Buzz FastAPI 서버

Buzz의 `AI 분석 → API → Android/React UI` 구간을 담당하는 서버입니다.
Kafka와 독립적으로 개발할 수 있고, 나중에 Kafka Consumer가 `/api/internal/analyze-file`만 호출하면 연결됩니다.

## 현재 지원 기능

- `GET /health` — 서버 생존 확인
- `POST /api/test/analyze` — 테스트 탭 MP3/WAV 업로드 분석
  - 운영 상태/문 상태에는 영향 없음
  - Waveplot / FFT / Mel-Spectrogram / MFCC 실제 이미지 생성
  - AI 예측은 최종 모델 확정 전까지 `mock-placeholder`
- `POST /api/internal/analyze-file` — Kafka Consumer 연동용 파일 경로 분석
  - 운영 상태 갱신
  - 말벌 판정이면 가상 문 자동 `CLOSED`
  - 위험 이력 저장
- `GET /api/status/{site_id}` — 현재 사업장 상태 조회
- `GET /api/history` — 위험/문 제어 이력 조회
- `POST /api/door/{site_id}` — 가상 문 수동 열기/닫기

## 실행

Windows PowerShell 기준:

```powershell
cd Buzz-dev\ai_server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

또는:

```powershell
uvicorn app.main:app --reload --port 8000
```

확인:

- API 문서: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 테스트 탭 API

`POST /api/test/analyze`

FormData의 `file`에 MP3/WAV 파일을 넣습니다.

응답 예시:

```json
{
  "analysis_id": "...",
  "class": "wasp",
  "confidence": 0.968,
  "probabilities": {
    "wasp": 0.968,
    "bee": 0.021,
    "other": 0.011
  },
  "duration_sec": 1.0,
  "source": "user_test",
  "timestamp": "2026-09-02T10:00:00+09:00",
  "model_name": "mock-placeholder",
  "images": {
    "waveplot": "http://localhost:8000/analysis/.../waveplot.png",
    "fft": "http://localhost:8000/analysis/.../fft.png",
    "mel": "http://localhost:8000/analysis/.../mel.png",
    "mfcc": "http://localhost:8000/analysis/.../mfcc.png"
  }
}
```

## Kafka 담당자와 연결할 때

Kafka Consumer가 음원 경로를 받은 뒤 다음 API만 호출하면 됩니다.

`POST /api/internal/analyze-file`

```json
{
  "file_path": "C:/Buzz/audio/incoming/wasp_001.wav",
  "site_id": 3,
  "source": "kafka"
}
```

즉 역할은 다음처럼 분리됩니다.

```text
Producer → Kafka → Consumer
                    ↓
       POST /api/internal/analyze-file
                    ↓
              FastAPI + AI
                    ↓
         상태 / 이력 / Android UI
```

## 실제 AI 모델 연결 위치

`app/services/predictor.py`의 `predict_audio()` 함수만 최종 모델 추론 코드로 교체하면 됩니다.

현재 Mock 모드는 UI/API 개발을 먼저 할 수 있도록 만든 임시 기능입니다. 실제 성능을 의미하지 않습니다.
