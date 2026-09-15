# 🐝 Buzz — AI 사운드 기반 말벌 침입 감지·예측 시스템

> 양봉장 주변 음향을 AI로 분석해 말벌 접근을 조기에 감지하고, 여러 사업장의 상태·감지 이력·알림·가상 방어문을 웹/모바일에서 통합 관제하는 프로젝트입니다.

📚 **프로젝트 Notion**
https://app.notion.com/p/AI-3cda03e856c38100ac89c6e0adffcc50?source=copy_link

---
## 1. 프로젝트 개요

Buzz는 양봉장 주변 음원을 **2초 / 24kHz** 단위로 분석해 `wasp / non_wasp`를 판별합니다. 말벌 감지 시 사업장을 `DANGER` 상태로 전환하고 가상 방어문을 `CLOSED`로 변경하며, 감지 이력과 알림을 저장합니다.

최종 구조에서는 Kafka를 제거하고 **FastAPI 중심의 단일 AI API 구조**로 단순화했습니다. 웹 대시보드와 Capacitor 기반 Android 앱이 동일한 FastAPI API를 사용합니다.

```text
사업장 음원 / 파일 테스트
        ↓
      FastAPI
        ↓
  2초 · 24kHz 전처리
        ↓
      CNN 모델
        ↓
 wasp / non_wasp + confidence
        ↓
 MySQL 저장 + 상태 판단
        ↓
┌──────────────┬──────────────┐
│ Web Dashboard│ Android App  │
└──────────────┴──────────────┘
```

## 2. 프로젝트 정보

| 항목 | 내용 |
|---|---|
| 개발 기간 | 2026.08.28 ~ 2026.09.14 |
| 발표일 | 2026.09.15 |
| 팀 인원 | 4명 |
| AI 입력 기준 | 2초 / 24kHz / mono |
| 최종 분류 | wasp / non_wasp |
| 최종 운영 모델 | CNN |
| AI·Backend | FastAPI |
| DB | MySQL 8.4 |
| Web | React 18 + Vite 5 |
| Mobile | React 19 + Vite 7 + Capacitor + Android |
| 배포·통합 실행 | Docker Compose |

## 3. 핵심 기능

### 실시간/자동 감지
- 사업장별 음원 자동 분석
- 최대 3개 사업장 음원을 한 번에 배치 분석
- 말벌 감지 시 `NORMAL → DANGER` 상태 전환
- 위험 상태에서 가상 방어문 `CLOSED`
- 연속 비감지 시 `NORMAL` 복귀 로직
- 최신 분석 결과와 Waveform / FFT / Mel-Spectrogram / MFCC 제공

### 3개 사업장 시뮬레이터

```text
data/audio_simulator/
├─ site1/
├─ site2/
└─ site3/
```

- 각 사업장 폴더의 WAV/MP3 파일을 독립적으로 순차 재생
- 전체 음원을 2초 단위로 분할해 FastAPI로 전송
- 마지막 구간이 2초 미만이면 zero padding
- START / STOP 지원
- 현재 파일, chunk 번호, 분석 구간, AI 결과 상태 제공
- API 오류 발생 시 임의의 정상값으로 대체하지 않고 `ERROR` 상태 유지

### 파일 테스트
- WAV/MP3 파일 업로드
- 파일 전체를 처음부터 끝까지 2초 단위로 분석
- `0~2초`, `2~4초`처럼 chunk별 결과 기록
- 연속된 wasp chunk를 하나의 감지 구간으로 병합
- 특정 chunk 선택 시 상세 그래프 확인
- 테스트 결과는 자동 감지 상태/문 제어에 영향을 주지 않음
- 테스트 이력은 MySQL에 저장하고 DB 장애 시 프로세스 메모리로 fallback

### 이력·분석·보고서
- 최근 말벌 감지 이력
- 최근 7일 말벌 감지 추이 집계
- `live / test / simulation` 분석 로그 구분
- 분석 로그 상세 조회
- 감지 이력 기반 보고서 생성 이력 저장
- 웹 화면에서 PDF 보고서 생성 지원
- 긴 목록은 페이지네이션으로 표시

### 알림
- 감지 이벤트 기반 알림 저장
- 읽음 / 전체 읽음 처리
- 읽지 않은 알림 개수 조회
- 웹·모바일 알림 센터에서 확인

### 사업장 관리
- 사업장 목록 조회
- 신규 사업장 등록
- 사업장별 현재 위험 상태 / 마지막 분석 / 방어문 상태 확인
- 웹·모바일 모두 가로 스크롤 없이 반응형 레이아웃 적용

## 4. AI 모델

프로젝트에서는 다음 6개 모델을 동일한 문제에 비교했습니다.

- RandomForest
- LightGBM
- XGBoost
- CNN
- CRNN
- MobileNetV2

최종 서비스 모델은 **CNN**으로 설정되어 있으며 Docker 환경의 기본값도 `BUZZ_AI_MODEL_NAME=CNN`입니다.

주요 평가 기준:
- Wasp Recall
- F1-score
- False Negative
- Confusion Matrix
- 추론 속도
- 모델 크기

## 5. 데이터 및 전처리

### 기본 규격
- 24kHz
- mono
- 2초 단위 WAV

### 데이터 구성
- **wasp**: AI-Hub 「지능형 양봉 데이터」 및 공개 말벌 음원 중 말벌 버징이 명확한 구간
- **non_wasp**: Hugging Face `NOSInovacao/AI-Belha` 꿀벌/벌통 음향 + 환경음/기타 음원

### 전처리 원칙
- 말소리·장비음 등 타 소리가 지배적인 구간 제외
- 원본 source/group 기준으로 Train / Validation / Test 분리
- 증강은 Train 데이터에만 적용
- 필요 시 volume / pitch / time shift 및 환경 노이즈 혼합 적용

## 6. 주요 API

### 분석
- `POST /api/auto/analyze`
- `POST /api/auto/analyze-batch`
- `POST /api/internal/analyze-file`
- `GET /api/analysis/latest/{site_id}`
- `POST /api/test/analyze`
- `POST /api/test/analyze-full`
- `GET /api/test/history`
- `GET /api/test/history/{test_id}`

### 사업장·상태·이력
- `GET /api/status`
- `GET /api/status/{site_id}`
- `GET /api/sites`
- `POST /api/sites`
- `POST /api/door/{site_id}`
- `GET /api/history`
- `GET /api/history/summary`

### 로그·보고서
- `GET /api/analysis-logs`
- `GET /api/analysis-logs/{event_id}`
- `GET /api/reports`
- `POST /api/reports`

### 알림·시뮬레이터
- 알림 읽음/전체 읽음/미확인 개수 API
- 시뮬레이터 START / STOP / 상태 / 로그 API

Swagger에서 전체 스펙을 확인할 수 있습니다.

## 7. MySQL 저장 항목

주요 테이블:

- `sites` — 사업장
- `detection_events` — live/test/simulation 분석 이벤트
- `analysis_graph_data` — 분석 그래프 데이터
- `gate_status` — 현재 방어문 상태
- `gate_events` — 방어문 변경 이력
- `file_test_runs` — 파일 테스트 결과
- `status_history` — 상태 변경 이력
- `report_history` — 보고서 생성 이력
- `site_runtime_state` — 사업장 현재 상태 복원용
- `app_settings` — 감지 설정
- `notifications` — 알림

## 8. 프로젝트 구조

```text
Buzz-dev/
├─ ai_model/          # 데이터 분석, 모델 비교/학습, 추론 코드
├─ ai_server/         # FastAPI API, AI 추론, 상태/DB/시뮬레이터
├─ android-app/       # Capacitor 기반 모바일 앱
├─ web/               # PC 웹 관제 대시보드
├─ data/
│  └─ audio_simulator/# site1~site3 시뮬레이션 음원
├─ docs/              # 아키텍처·DB·완료 메모
├─ mysql.sql          # MySQL 초기 스키마
├─ docker-compose.yml # mysql + ai-server + simulator + web
├─ .env.example
└─ README.md
```

> `backend/`, `database/`, `docker/` 폴더 일부는 초기 구조/확장용 흔적이며, 현재 핵심 서버는 `ai_server/`의 FastAPI입니다.

## 9. 실행 방법

### 9-1. Docker Compose 전체 실행 — 권장

루트에서 `.env.example`을 복사해 `.env`를 생성합니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 직접 `.env` 파일을 만들고 아래 값을 설정해도 됩니다.

```env
MYSQL_DATABASE=buzz
MYSQL_USER=buzz_app
MYSQL_PASSWORD=원하는_로컬_비밀번호
MYSQL_ROOT_PASSWORD=루트용_다른_비밀번호
DB_CONNECT_TIMEOUT=5
```

실행:

```bash
docker compose up -d --build
```

접속:
- Web: `http://localhost:5173`
- FastAPI Swagger: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

로그:

```bash
docker compose logs -f ai-server simulator web mysql
```

중지:

```bash
docker compose down
```

DB 볼륨까지 초기화:

```bash
docker compose down -v
docker compose up -d --build
```

### 9-2. 웹 로컬 실행

```bash
cd web
npm install
npm run dev
```

### 9-3. FastAPI 로컬 실행

```bash
pip install -r ai_server/requirements.txt
python -m ai_server.run
```

또는 환경에 따라:

```bash
python ai_server/run.py
```

### 9-4. Android 앱

```bash
cd android-app
npm install
npm run build
npx cap sync android
npx cap open android
```

실기기에서 사용할 경우 `VITE_API_BASE_URL`을 FastAPI가 실행 중인 PC의 LAN 주소로 설정합니다.

```text
http://192.168.x.x:8000
```

## 10. 웹 화면 구성

- **대시보드**: 사업장별 현재 상태, 최근 분석, 감지 현황
- **분석**: 최신 실제 분석 결과와 Waveform / FFT / Mel / MFCC
- **이력**: 감지 내역, 최근 7일 추이, 필터, 보고서
- **음원 테스트**: 파일 전체 분석, chunk 상세, 테스트 이력
- **사업장**: 사업장 조회/등록
- **알림**: 위험 감지 알림 및 읽음 처리
- **설정**: 감지 관련 설정 관리

`최근 분석 결과`는 AI가 실제 음원 chunk를 분석한 결과이고, `시스템 로그`는 실행/통신/처리 상태를 확인하기 위한 운영 로그로 구분합니다.

## 11. 최종 구현 상태

- [x] Kafka 제거 및 FastAPI 직접 처리 구조
- [x] 2초 / 24kHz 음원 분석
- [x] CNN 운영 모델 연결
- [x] 3개 사업장 독립 오디오 시뮬레이터
- [x] MySQL 연동 및 런타임 상태 복원
- [x] 자동 감지 / 테스트 / 시뮬레이션 로그 구분 저장
- [x] 위험 상태 및 가상 방어문 제어
- [x] 파일 전체 2초 단위 테스트
- [x] Waveform / FFT / Mel-Spectrogram / MFCC 시각화
- [x] 감지 이력 및 7일 추이
- [x] 보고서 생성 이력
- [x] 사업장 등록
- [x] 알림 센터 및 읽음 처리
- [x] 웹 관제 대시보드
- [x] Capacitor Android 앱
- [x] Docker Compose 통합 실행
- [x] 주요 이력 목록 페이지네이션 및 모바일 반응형 UI

## 12. 검증

프로젝트 내 테스트 코드:

```text
ai_server/tests/
├─ test_analysis_contract.py
├─ test_audio_simulator.py
├─ test_detection_settings.py
├─ test_history_policy.py
├─ test_runtime_persistence.py
└─ test_state_service.py
```

최종 통합 확인 시 권장 순서:
1. `docker compose up -d --build`
2. `/health` 및 `/docs` 확인
3. `site1~site3` 시뮬레이터 동작 확인
4. 웹 대시보드 상태 갱신 확인
5. 말벌 감지 시 DANGER / CLOSED / 알림 / 이력 저장 확인
6. 파일 테스트 업로드 후 chunk별 결과 및 상세 그래프 확인
7. 보고서·사업장 등록·페이지네이션 확인
8. Android 실기기에서 같은 API 연결 확인

## 13. 기술 선택 이유

- **FastAPI**: Python 기반 AI 추론 코드와 직접 연결하기 쉽고 API 구성이 간결함
- **CNN**: 음향 특징을 학습하는 모델 비교 결과를 기반으로 최종 운영 모델로 사용
- **MySQL**: 사업장·감지·알림·보고서·테스트 이력을 영속적으로 관리
- **React + Vite**: 웹 관제 UI를 빠르게 구성하고 컴포넌트화하기 적합
- **Capacitor**: 웹 기술을 재사용하면서 Android 앱으로 패키징 가능
- **Docker Compose**: MySQL / FastAPI / Simulator / Web 실행 환경을 팀원 PC에서도 동일하게 재현


## 14. 데이터셋 및 참고 출처

### AI-Hub — 지능형 양봉 데이터
- 제공처: **AI-Hub**
- 데이터셋: **지능형 양봉 데이터** (`dataSetSn=71488`)
- Buzz 활용: 말벌 관련 음향 및 양봉 환경 데이터 참고, `wasp` 학습 데이터 구성에 활용
- 링크: https://www.aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100&aihubDataSe=realm&dataSetSn=71488
- 사용 시 AI-Hub 원문에 명시된 이용 조건과 라이선스를 확인합니다.

### Hugging Face — NOSInovacao/AI-Belha
- 제공처: **Hugging Face / NOSInovacao**
- 데이터셋: `NOSInovacao/AI-Belha`
- 구성: 실제 벌통에서 수집된 mono WAV 86개, 약 60초 길이, 16kHz 음원
- 원래 목적: 여왕벌의 존재 및 상태를 음향으로 분류하기 위한 데이터셋
- Buzz 활용: 원본의 여왕벌 상태 라벨을 말벌 정답 라벨로 사용하지 않고, **말벌이 없는 실제 꿀벌·벌통 환경 음향**으로 활용하여 `non_wasp` 데이터 구성에 사용
- 라이선스: **MIT License**
- 링크: https://huggingface.co/datasets/NOSInovacao/AI-Belha

### 공개 말벌 음원
- YouTube 등 공개 영상에서 말벌 버징이 명확하게 들리는 구간만 선별해 `wasp` 데이터 보강에 활용했습니다.
- 사람 음성, 장비음, 강한 환경음 등 말벌보다 다른 소리가 지배적인 구간은 제외했습니다.
- 원본 영상별 `source_id`를 유지해 동일 원본에서 잘린 음원이 Train / Validation / Test에 섞이지 않도록 관리했습니다.
- 공개 음원은 각 원본 게시물의 라이선스 및 이용 조건을 따릅니다.

### 데이터 사용 및 전처리 원칙
- 모든 학습 음원은 최종적으로 **24kHz / mono / 2초** 기준으로 통일합니다.
- 원본 source/group 기준으로 Train / Validation / Test를 분리해 데이터 누수를 방지합니다.
- 데이터 증강은 Train 데이터에만 적용합니다.
- 외부 데이터는 원본 데이터셋의 목적과 라벨 의미를 그대로 말벌 라벨로 오인하지 않고, Buzz의 `wasp / non_wasp` 기준에 맞게 재구성해 사용합니다.
- 외부 공개 데이터 사용 시 각 제공처의 라이선스와 이용 조건을 우선 적용합니다.

---

### 프로젝트 핵심 한 줄

**“양봉장 소리를 AI로 듣고, 말벌 위험을 웹·모바일에서 즉시 확인하는 사운드 기반 스마트 양봉 관제 시스템”**
