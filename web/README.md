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

## API 연결 상태

음원 테스트 화면은 `VITE_API_BASE_URL`(기본값 `http://localhost:8000`)의
`POST /api/test/analyze`를 호출해 실제 모델 결과와 파형/스펙트로그램을 표시합니다.
대시보드, 사업장, 이력 화면은 아직 `src/data/mockData.ts`의 목 데이터를 사용합니다.
