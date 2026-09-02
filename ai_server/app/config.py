from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ANALYSIS_DIR = BASE_DIR / "static" / "analysis"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

# Buzz 학습 노트북과 동일한 기본 전처리 기준
SAMPLE_RATE = 48_000
DURATION_SEC = 1.0
N_FFT = 2048
HOP_LENGTH = 256
N_MELS = 128

ALLOWED_EXTENSIONS = {".wav", ".mp3"}
MAX_UPLOAD_BYTES = 30 * 1024 * 1024
