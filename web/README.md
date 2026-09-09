<!-- 프로젝트 안내 - 웹 실행 방법과 구조 -->
# BUZZ 웹 대시보드

말벌 침입 감지 시스템(`com.buzz.detector`)의 프론트엔드입니다. React + TypeScript + Vite로 작성되었고,
`vite.config.ts`에서 `base: './'`로 상대 경로 빌드를 하도록 설정되어 있어 Capacitor(`webDir: dist`)로
그대로 감쌀 수 있습니다.

## 실행

```bash
npm install
npm run dev       # 개발 서버
npm run build     # dist/ 생성 (Capacitor sync 대상)
```

## 구조

```
src/
  components/   사이드바, 상단바, 카드, 배지 등 공용 UI
  pages/        대시보드 / 사업장 / AI분석 / 감지 이력 / 설정 / 음원 테스트
  data/         화면에 쓰이는 목(mock) 데이터
  types/        도메인 타입 정의
```

## 상태

현재는 목 데이터로 동작하는 화면 단계입니다. 실제 API 연동 시
`src/data/mockData.ts`의 데이터 소스를 백엔드(FastAPI) 호출로 교체하면 됩니다.
