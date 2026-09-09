# 🐝 Buzz FastAPI Server

모델 → 서버 → 앱의 현재 필드명, 단위, 책임 분담과 실행 방법은
[음원 분석 데이터 계약](../docs/analysis-contract.md)을 참고하세요.

Buzz의 Python 백엔드입니다.

최종 아키텍처에서는 Kafka를 사용하지 않고 **FastAPI가 자동 감지 및 사용자 테스트 음향 입력을 직접 수신**합니다. 이후 2초·24kHz 기준 전처리, AI 추론, 음향 분석 수치 JSON 생성, 사업장 상태 갱신을 담당합니다.

## 역할

```text
음향 입력
→ FastAPI
→ 2초 / 24kHz 전처리
→ Best Model 추론
→ non_wasp / wasp
→ 분석 수치 JSON
→ Android
```

## 실행

전처리는 모델과 동일하게 24,000Hz, 2초, mono, RMS -20dB 정규화 후 zero padding을 적용합니다.
Mel-Spectrogram과 표시용 MFCC는 `n_fft=1024`, `hop_length=256`을 사용하며 Mel 필터 수는 128입니다.
별도 FFT 그래프는 2초 파형 전체에 FFT를 적용합니다. 학습된 ML 모델의 특징 추출 설정은 변경하지 않습니다.

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

현재 `app/config.py`의 `AI_MODEL_NAME`으로 사용할 모델을 지정하며, 서버 시작 시 모델을 한 번 로드합니다.
같은 종류의 재학습 모델은 `ai_model/models`의 파일을 교체하고 서버를 재시작하면 됩니다.

```text
음원 업로드 → ai_model 공통 전처리 → 실제 이진분류 모델 추론
→ FastAPI 응답 생성 → Android/Web 연동
```

## 영상 데이터

영상은 AI 입력이 아니라 Android의 상태 시각화 용도입니다.

```text
NORMAL → 정상 양봉장/꿀벌 영상
DANGER → 말벌 상황 영상
```

## 최종 제외 기술

- Kafka: 현재 규모 대비 복잡도가 높아 제거
