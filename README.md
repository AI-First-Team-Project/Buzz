# 🐝 Buzz — AI 사운드 기반 말벌 침입 감지·예측 시스템

> 양봉장 주변 음향을 AI로 분석해 **wasp / non_wasp**를 분류하고, 말벌 감지 시 위험 상태·가상 방어문·상태별 영상을 Android 앱에서 확인하는 프로젝트입니다.

## 1. 프로젝트 목표

양봉장 주변의 음향을 지속적으로 분석해 **말벌 접근을 조기에 감지**하고, 여러 양봉장의 상태를 한눈에 확인할 수 있는 모니터링 환경을 구현합니다.

```text
음향 입력
→ FastAPI
→ 2초 / 24kHz 전처리
→ CNN 모델
→ wasp / non_wasp 판정
→ Android
→ 위험 상태 / 가상 방어문 / 영상 / 이력
```

## 2. 프로젝트 정보

| 항목 | 내용 |
|---|---|
| 개발 기간 | 2026.08.28 ~ 2026.09.11 |
| 발표일 | 2026.09.15 |
| 팀 인원 | 4명 |
| AI 입력 기준 | 2초 / 24kHz |
| 분류 클래스 | wasp / non_wasp |
| Backend | FastAPI |
| App | React + Vite + Capacitor + Android Studio |
| AI 비교 모델 | RandomForest / LightGBM / XGBoost / CNN / CRNN / MobileNetV2 |

## 3. 최종 아키텍처

멘토링 피드백을 반영해 **Kafka는 최종 아키텍처에서 제거**했습니다. 현재 프로젝트 규모에서는 별도의 메시지 브로커를 두는 것보다 FastAPI가 음향 입력을 직접 처리하는 구조가 더 단순하고 목적에 적합하다고 판단했습니다.

상태 시각화에는 실제 또는 사전 수집한 양봉장·꿀벌·말벌 영상을 활용합니다.

```text
[자동 감지 / 사용자 테스트 음향]
                ↓
             FastAPI
                ↓
       2초 / 24kHz 전처리
                ↓
            CNN 모델
                ↓
    wasp / non_wasp + confidence
                ↓
            Android App
        ┌───────┼─────────┐
        ↓       ↓         ↓
   상태/경고  분석그래프  영상/이력
```

> 영상은 AI 입력이 아니라 **판정 결과를 사용자가 직관적으로 이해하기 위한 시각화 데이터**입니다.

## 4. 자동 감지

Kafka 없이 FastAPI가 자동 감지용 음원을 직접 수신합니다.

### 직접 업로드
`POST /api/auto/analyze`

- `file`: MP3/WAV
- `site_id`: 사업장 ID
- AI 판정 결과에 따라 해당 사업장의 상태를 갱신

### 서버 파일 경로 분석
`POST /api/internal/analyze-file`

```json
{
  "file_path": "C:/Buzz/data/raw/wasp_001.wav",
  "site_id": 3,
  "source": "auto_detection"
}
```

자동 감지에서 `wasp`가 기준을 충족하면:

```text
wasp 감지
→ DANGER
→ 가상 방어문 CLOSED
→ 말벌 상황 영상 표시
→ 위험/문 제어 이력 저장
```

기본 설정에서는 연속 말벌 감지 3회에 위험으로 전환하고, 연속 미감지 3회에 정상으로 복귀합니다. 정상 복귀 시 가상 방어문은 자동으로 열리지 않습니다.

## 5. 사용자 테스트

`POST /api/test/analyze`

```text
MP3/WAV
→ FastAPI
→ 2초 / 24kHz 전처리
→ CNN 모델
→ 수치 JSON
→ Android 시각화
```

사용자 테스트 결과는 **자동 감지 상태, 가상 방어문, 자동 감지 이력에 영향을 주지 않습니다.**

## 6. AI 모델 전략

아래 6개 모델을 실험 대상으로 관리하며, **현재 서비스에는 CNN 이진분류 모델**을 탑재했습니다. 최종 성능 비교와 모델 선정은 별도 검증이 필요합니다.

- RandomForest
- LightGBM
- XGBoost
- CNN
- CRNN
- MobileNetV2

### 모델 선정 기준

- **Wasp Recall**
- **False Negative**
- F1-score
- Precision / Recall
- Confusion Matrix
- 추론 속도
- 모델 크기

## 7. 노이즈 대응

실제 양봉장 환경에서는 바람, 꿀벌 군집음, 주변 환경음이 함께 들어올 수 있으므로 **노이즈 제거 + 노이즈 환경 학습**을 함께 검토합니다.

```text
원본 음원
→ 24kHz 통일
→ 2초 window
→ 정규화
→ 필요 시 Noise Reduction / Band-pass Filter
→ Audio Augmentation
→ Train / Validation / Test
```

증강 후보:

- wasp + bee 혼합
- wasp + background/wind noise
- volume 변화
- pitch shift
- time shift

> 데이터 누수를 막기 위해 원본 source/group 기준으로 Train / Validation / Test를 먼저 분리한 뒤 **Train 데이터에만 증강을 적용**하는 방향을 사용합니다.

## 8. 데이터 출처

### 말벌
- AI-Hub 「지능형 양봉 데이터」
- https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71488
- 데이터셋에 포함된 **말벌 날개짓 음성**을 `wasp` 클래스 원천 데이터로 활용

### 꿀벌
- Hugging Face `NOSInovacao/AI-Belha`
- https://huggingface.co/datasets/NOSInovacao/AI-Belha
- 벌통/꿀벌 음향을 `non_wasp` 클래스 원천 데이터로 활용

### 기타 환경음
- 별도로 확보한 환경음 및 기타 음원도 현재 모델에서는 `non_wasp` 클래스에 포함

## 9. FastAPI 분석 응답

FastAPI는 분석 이미지를 PNG로 생성하지 않고 Android에서 직접 그래프를 그릴 수 있도록 **수치 JSON**을 반환합니다.

- Prediction: `label`, `confidence`, `probabilities`
- Waveform: `amplitude[]`
- FFT: `frequency[]`, `magnitudeDb[]`
- Mel-Spectrogram: `time[]`, `frequency[]`, `db[][]`
- MFCC: `time[]`, `coefficients[][]`

## 10. 주요 폴더

```text
Buzz-dev/
├─ ai_model/       # AI 학습/모델 비교 실험
├─ ai_server/      # FastAPI, 음향 분석, AI 추론 서비스
├─ android-app/    # React/Vite/Capacitor 기반 Android UI
├─ backend/        # 현재 미사용/확장용
├─ database/       # DB 관련
├─ docker/         # Docker/Compose 관련
├─ docs/           # 프로젝트 문서
└─ README.md
```

`kafka/` 폴더는 최종 아키텍처에서 제거했습니다. 이전 Kafka 실험 기록은 Git 히스토리와 프로젝트 문서의 의사결정 이력으로만 남깁니다.

## 11. 실행 방법

### FastAPI

```bash
cd ai_server
pip install -r requirements.txt
python run.py
```

- Swagger: `http://localhost:8000/docs`
- Health Check: `GET http://localhost:8000/health`

### Android UI 개발 서버

```bash
cd android-app
npm install
npm run dev
```

Capacitor/Android 빌드는 `android-app/ANDROID-BUILD-GUIDE.md`를 참고합니다.

## 12. 현재 구현 상태

### 구현/구조 정리 완료
- [x] FastAPI 기본 서버 및 API 구조
- [x] 2초 / 24kHz 분석 기준
- [x] wasp / non_wasp 응답 데이터 계약
- [x] Waveform / FFT / Mel-Spectrogram / MFCC 수치 JSON 구조
- [x] Kafka 제거 및 FastAPI 직접 입력 구조
- [x] 실제/사전 수집 영상 데이터 시각화 방향 확정
- [x] Android UI 기본 구조

### 진행 예정
- [ ] 6개 모델 동일 조건 실제 성능 비교
- [ ] Best Model 최종 선정
- [ ] 노이즈/증강 실험
- [x] `predictor.py`에 CNN 모델 연결
- [ ] FastAPI → Android End-to-End 연동
- [x] 연속 감지·미감지에 따른 위험 해제 / 가상 문 OPEN·CLOSED 로직
- [ ] 상태별 영상 연동
- [x] MySQL 분석·상태 변경 이력 저장 및 사업장 현재 상태 복원 코드
- [ ] Docker / Jenkins CI/CD
- [ ] 최종 통합 테스트 및 발표 준비

## 13. 핵심 기술 선택 이유

- **FastAPI**: Python AI 코드와 직접 연결하기 쉽고 현재 규모의 API 처리에 충분
- **Librosa**: 음향 전처리 및 특징 추출
- **6개 AI 모델 비교**: 서비스 목적에 적합한 모델을 정량적으로 선정
- **React + Capacitor**: 웹 기반 UI를 Android 앱으로 패키징
- **Docker / Jenkins**: 최종 통합 이후 실행환경 표준화와 CI/CD 자동화에 사용 예정
