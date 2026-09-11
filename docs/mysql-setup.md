# Buzz MySQL 설정

## 1. 패키지 설치
프로젝트 루트에서 다음을 실행합니다.

```bash
pip install -r ai_server/requirements.txt
```

## 2. DB 생성
MySQL Workbench 또는 mysql CLI에서 프로젝트 루트의 `mysql.sql` 전체를 실행합니다.
이 스크립트는 `buzz` DB와 사업장 1~3, 분석 로그/그래프/문 상태 테이블을 생성합니다.

## 3. 환경변수
`ai_server/.env.example`을 `ai_server/.env`로 복사하고 비밀번호를 수정합니다.

```env
BUZZ_DB_ENABLED=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=본인_MySQL_비밀번호
DB_NAME=buzz
```

DB 저장을 임시로 끄려면 `BUZZ_DB_ENABLED=false`로 설정합니다. DB 저장 실패가 발생해도 AI 추론 API는 계속 동작하고 서버 로그에 원인이 출력됩니다.

## 4. 저장되는 로그
- `/api/test/analyze` → `analysis_type=test`
- `/api/auto/analyze` → `analysis_type=live`
- `/api/auto/analyze-batch` → `analysis_type=simulation`
- `/api/internal/analyze-file` → `analysis_type=live`

사용자 테스트 요청에는 선택적으로 `expected_label=wasp` 또는 `expected_label=non_wasp`를 multipart form 값으로 함께 보낼 수 있습니다. 이 경우 `is_correct`도 자동 저장됩니다.

## 5. 로그 조회

```text
GET /api/analysis-logs?limit=100
GET /api/analysis-logs?analysis_type=test
GET /api/analysis-logs?analysis_type=simulation
```

## 6. 저장 구조
- 음성 파일 자체: 파일 시스템
- `detection_events`: 분석 메타데이터/예측/확률/정답 여부
- `analysis_graph_data`: waveform/FFT/spectrogram/MFCC JSON
- `gate_status`: 현재 문 상태
- `gate_events`: 문 제어 이력용 테이블
