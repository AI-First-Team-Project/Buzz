from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import ANALYSIS_DIR
from .routers import analysis, health, monitoring

app = FastAPI(
    title="Buzz AI Sound Detection API",
    description="말벌/꿀벌/Other 사운드 분석 및 Buzz 앱 연동 API",
    version="0.1.0",
)

# 개발 중 React(Vite), Android WebView/Capacitor 연동을 위해 허용.
# 배포 시 실제 도메인만 허용하도록 변경한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/analysis", StaticFiles(directory=str(ANALYSIS_DIR)), name="analysis")

app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(monitoring.router)


@app.get("/", tags=["system"])
def root():
    return {
        "service": "Buzz AI Sound Detection API",
        "docs": "/docs",
        "health": "/health",
    }
