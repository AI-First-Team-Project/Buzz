from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Buzz 프로젝트 공통 AI 입력 기준 (2026-09-02 확정)
SAMPLE_RATE = 48_000
DURATION_SEC = 2.0
N_FFT = 2048
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
