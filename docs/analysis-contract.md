# 음원 분석 데이터 계약

FastAPI의 `app/schemas.py::AnalysisResponse`를 앱 응답의 기준으로 사용한다.
최종 모델은 아직 미선정이며 서버 예측은 `mock-placeholder`이다.

## 흐름

1. 앱 테스트 화면이 `POST /api/test/analyze`에 `multipart/form-data`의 `file`로 WAV/MP3를 업로드한다.
2. 서버는 24kHz, mono, 첫 2초, RMS -20dB 정규화 후 zero padding으로 그래프를 생성한다.
3. 추론 어댑터가 `prediction`과 `meta.modelName`을 반환한다. 현재는 파일명 기반 mock이다.
4. 서버가 예측을 스키마로 검증하고 음원 정보, 그래프, ID, 시각을 붙여 JSON으로 응답한다.
5. 앱은 응답을 검증하고 한국어 라벨과 %로 변환하며 수치 배열을 SVG/canvas로 표시한다.

테스트 요청은 운영 상태/개폐기/이력을 변경하지 않는다. 운영 분석 화면의 기존 데모 데이터는
별도 운영 조회 API 연동 대상이며 테스트 결과를 운영 데이터로 대신 사용하지 않는다.

## 모델 → 서버

Python 함수 반환 dict이며 별도의 HTTP 전송은 없다. `ai_model/src/inference.py`의
`analyze_audio`는 다음 구조를 제공한다. `timing`과 로컬 그래프는 실험용 추가 필드이며
서버는 `prediction`과 `meta.modelName`만 사용한다. MFCC와 전체 앱 그래프는 서버 책임이다.

```json
{
  "prediction": {
    "label": "wasp",
    "confidence": 0.968,
    "probabilities": {"wasp": 0.968, "bee": 0.021, "other": 0.011}
  },
  "meta": {"modelName": "선정된 모델명"}
}
```

최종 모델 선정 후 서버 `predictor.py`에서 모델을 시작 시 한 번 로드하고 위 함수를 호출하도록
교체한다. 모델을 요청마다 다시 로드하지 않는다. 클래스 순서는 모델 내부에서 정리한다.
학습용 노트북은 실험 기록으로 유지하며 서버 계약의 기준이 아니다.

## 서버 → 앱

| 필드 | 의미/단위 |
|---|---|
| analysisId | 분석 ID 문자열 |
| audio.fileName | 원본 업로드 이름 |
| audio.sampleRate | 분석 샘플링 주파수 24000 Hz |
| audio.duration | 패딩/절단 후 분석 창 길이 2초. 원본 파일 길이가 아님 |
| prediction.label | wasp / bee / other |
| prediction.confidence, probabilities | 0~1. 앱 표시 시에만 100을 곱함 |
| waveform.time, amplitude | 같은 길이의 초/정규화 진폭 배열 |
| fft.frequency, magnitudeDb | 같은 길이의 Hz/dB 배열. 전체 FFT 최대 크기 기준 상대 dB |
| spectrogram.time, frequency, db | 초/Hz/[주파수][시간] dB 행렬 |
| mfcc.time, coefficients | 초/[계수][시간] 행렬. MFCC 값은 dB로 표시하지 않음 |
| meta.source | user_test / auto_detection |
| meta.modelName | 현재 mock-placeholder. 앱에서 임시 예측임을 표시 |
| meta.timestamp | 시간대가 포함된 ISO 8601 시각 |

파형은 1500점, FFT는 1024점, Mel은 128×96, MFCC는 20×96으로 축소한다.
축 배열을 그대로 사용하며 원본 sampleRate로 축소 배열의 인덱스를 나누지 않는다.
Mel/표시용 MFCC는 n_fft=1024, hop_length=256을 사용한다. ML 학습 특징 추출은 변경하지 않는다.
분류 모델은 마릿수를 반환하지 않는다. 운영 화면의 마릿수를 확률에서 유추하면 안 된다.

## 실행

서버: 프로젝트 루트에서 `.venv/Scripts/python.exe -m pip install -r ai_server/requirements.txt`,
이후 `.venv/Scripts/python.exe ai_server/run.py`.
앱: `android-app`에서 `npm run dev` 후 테스트 화면에서 파일을 선택한다.
기본 서버 주소는 `http://localhost:8000`이다. 실제 Android에서는 `.env.local`에
`VITE_API_BASE_URL=http://PC의접근가능한IP:8000`을 지정한 뒤 앱을 다시 빌드해야 한다.
서버 접근 및 Android 네트워크 설정도 해당 실행 환경에서 확인해야 한다.

## 검증

개발 의존성은 `ai_server/requirements-dev.txt`에 기록했다.
`.venv/Scripts/python.exe -m unittest discover -s ai_server/tests -v`는 실제 WAV 디코딩,
FastAPI 응답 직렬화, 3개 클래스의 앱 변환, 그래프 차원, 오류 처리, 운영 상태 불변을 확인한다.
임시 업로드 저장만 메모리로 대체하며 최종 학습 모델 정확도나 실제 Android 네트워크는 검증하지 않는다.
앱 빌드는 `android-app`에서 `npm run build`로 확인한다.
