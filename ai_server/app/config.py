from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# FastAPI에서 사용할 ai_model 모델. 다른 종류로 바꾼 뒤 서버를 재시작한다.
AI_MODEL_NAME = "CRNN"
AI_MODEL_DIR = PROJECT_ROOT / "ai_model" / "models"
AI_MODEL_THRESHOLD = 0.5

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
