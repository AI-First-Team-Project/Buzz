# BUZZ 웹 화면

`web/`는 PC 대시보드, `android-app/`는 모바일 브라우저 화면의 기준 소스입니다. Docker 웹 이미지는 두 화면을 함께 빌드합니다. 화면 폭이 768px 이하이면 모바일 화면을 표시합니다.

웹 진입점은 `web/src/main.js`입니다. 같은 이름의 과거 TS/TSX 사본은 제거했고, 고유한 TS/TSX 컴포넌트만 남겼습니다. 모바일 진입점은 `android-app/src/main.js`에서 `App.jsx`를 직접 불러옵니다.

프로젝트 루트에서 실행합니다.

```powershell
docker compose up -d --build
```

- PC 화면: <http://localhost:5173/>
- 모바일 화면 직접 확인: <http://localhost:5173/mobile/index.html>
- Chrome/Edge 개발자 도구에서 기기 화면 크기로 전환해 모바일 화면을 확인할 수 있습니다.
- 두 화면 모두 같은 출처의 `/api/` 프록시를 통해 FastAPI와 통신합니다.

로컬 개발 시 `web/`에서 `npm run dev`를 실행합니다. 이때 모바일 번들을 빌드하려면 `android-app/`에도 `npm ci`가 필요합니다. `web/android-app/`과 `web/web/`은 이전 중복 복사본이었고 현재 빌드에서는 사용하지 않습니다.
