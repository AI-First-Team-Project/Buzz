# 🐝 Buzz FastAPI Server

Buzz의 Python 백엔드입니다.

최종 아키텍처에서는 Kafka를 사용하지 않고 **FastAPI가 자동 감지 및 사용자 테스트 음향 입력을 직접 수신**합니다. 이후 2초·48kHz 기준 전처리, AI 추론, 음향 분석 수치 JSON 생성, 사업장 상태 갱신을 담당합니다.

## 역할

```text
음향 입력
→ FastAPI
→ 2초 / 48kHz 전처리
→ Best Model 추론
→ wasp / bee / other
→ 분석 수치 JSON
→ Android
```

## 실행

```bash
cd ai_server
pip install -r requirements.txt
python run.py
```

- Swagger: `http://localhost:8000/docs`
- Health: `GET http://localhost:8000/health`

## 주요 API

### `GET /health`
FastAPI 서버 동작 여부 확인

### `POST /api/test/analyze`
사용자 테스트용 MP3/WAV 업로드. 자동 감지 상태/문/이력에는 영향을 주지 않음

### `POST /api/auto/analyze`
자동 감지용 직접 업로드

Form Data:
- `file`: MP3/WAV
- `site_id`: 사업장 ID, 기본값 3

### `POST /api/internal/analyze-file`
서버 로컬 또는 공유 경로 음원 분석

```json
{
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "auto_detection"
}
```

### 상태/이력/문 제어
- `GET /api/status/{site_id}`
- `GET /api/history`
- `POST /api/door/{site_id}`

## 분석 응답

- Prediction: `label`, `confidence`, `probabilities`
- Waveform: `amplitude[]`
- FFT: `frequency[]`, `magnitudeDb[]`
- Mel-Spectrogram: `time[]`, `frequency[]`, `db[][]`
- MFCC: `time[]`, `coefficients[][]`
- Meta: `source`, `modelName`, `timestamp`

## 현재 구현 상태

현재 FastAPI 기본 구조와 분석 데이터 계약은 구성되어 있습니다.

최종 AI 모델은 아직 선정/연결 전이므로 `app/services/predictor.py`가 mock 또는 임시 predictor 상태라면 다음 순서로 교체합니다.

```text
6개 모델 실제 성능 비교
→ Best Model 선정
→ 서비스용 Python 모듈화
→ predictor.py 실제 모델 로딩/추론 코드 적용
→ FastAPI API 테스트
→ Android 연동
```

## 영상 데이터

영상은 AI 입력이 아니라 Android의 상태 시각화 용도입니다.

```text
NORMAL → 정상 양봉장/꿀벌 영상
DANGER → 말벌 상황 영상
```

## 최종 제외 기술

- Kafka: 현재 규모 대비 복잡도가 높아 제거
