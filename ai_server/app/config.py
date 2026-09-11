import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

<<<<<<< HEAD
# FastAPI에서 사용할 ai_model 모델. 환경변수로 바꾼 뒤 서버를 재시작한다.
AI_MODEL_NAME = os.getenv("BUZZ_AI_MODEL_NAME", "CNN")
=======
# FastAPI에서 사용할 ai_model 모델. 다른 종류로 바꾼 뒤 서버를 재시작한다.
AI_MODEL_NAME = "CNN"
>>>>>>> dev
AI_MODEL_DIR = PROJECT_ROOT / "ai_model" / "models"
AI_MODEL_THRESHOLD = float(os.getenv("BUZZ_AI_MODEL_THRESHOLD", "0.7"))

# 지속 분석 상태 전환의 임시 운영 기준.
DANGER_CONSECUTIVE_DETECTIONS = int(os.getenv("BUZZ_DANGER_CONSECUTIVE_DETECTIONS", "3"))
NORMAL_CONSECUTIVE_NON_DETECTIONS = int(os.getenv("BUZZ_NORMAL_CONSECUTIVE_NON_DETECTIONS", "3"))
MANUAL_DANGER_CLEAR_ENABLED = os.getenv("BUZZ_MANUAL_DANGER_CLEAR_ENABLED", "true").lower() in {
    "1", "true", "yes", "on",
}

# ai_model/src/config.py의 학습/추론 전처리 기준과 동일하게 유지한다.
SAMPLE_RATE = 24_000
DURATION_SEC = 2.0
TARGET_DB = -20.0
N_FFT = 1024
HOP_LENGTH = 256
N_MELS = 128
N_MFCC = 20

# Android로 너무 큰 JSON을 보내지 않도록 시각화 데이터 크기를 제한한다.
WAVEFORM_POINTS = 1_500
FFT_POINTS = 1_024
SPECTROGRAM_TIME_BINS = 96
MFCC_TIME_BINS = 96

ALLOWED_EXTENSIONS = {".wav", ".mp3"}
MAX_UPLOAD_BYTES = 30 * 1024 * 1024

# 별도 프로세스로 실행하는 사업장 음원 공급 Worker 설정.
SIMULATOR_AUDIO_ROOT = Path(
    os.getenv("BUZZ_SIMULATOR_AUDIO_ROOT", str(PROJECT_ROOT / "data" / "audio_simulator"))
).expanduser().resolve()
SIMULATOR_API_URL = os.getenv(
    "BUZZ_SIMULATOR_API_URL", "http://127.0.0.1:8000/api/auto/analyze-batch"
)
SIMULATOR_INTERVAL_SECONDS = float(
    os.getenv("BUZZ_SIMULATOR_INTERVAL_SECONDS", str(DURATION_SEC))
)
SIMULATOR_RETRY_SECONDS = float(os.getenv("BUZZ_SIMULATOR_RETRY_SECONDS", "5"))
SIMULATOR_MAX_RETRIES = int(os.getenv("BUZZ_SIMULATOR_MAX_RETRIES", "3"))
SIMULATOR_REQUEST_TIMEOUT_SECONDS = float(
    os.getenv("BUZZ_SIMULATOR_REQUEST_TIMEOUT_SECONDS", "120")
)
SIMULATOR_QUEUE_SIZE = int(os.getenv("BUZZ_SIMULATOR_QUEUE_SIZE", "3"))
SIMULATOR_BATCH_WAIT_SECONDS = float(os.getenv("BUZZ_SIMULATOR_BATCH_WAIT_SECONDS", "0.5"))

# 마지막 자동 분석이 이 시간보다 오래되면 모니터링 API에서 Worker 연결 지연으로 표시한다.
WORKER_STALE_AFTER_SECONDS = float(os.getenv("BUZZ_WORKER_STALE_AFTER_SECONDS", "10"))
