'''
SR, DURATION, CLASSES, 경로 등 공통 설정
'''

from pathlib import Path

# =========================
# Path
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent
AUDIO_DIR = BASE_DIR / 'audio'
MODEL_DIR = BASE_DIR / 'models'

# =========================
# Audio
# =========================

CLASSES = ['wasp', 'bee', 'other']

SR = 48000
DURATION = 2.0

SAMPLES_PER_TRACK = int(SR * DURATION)

TARGET_DB = -20.0

# =========================
# Spectrogram
# =========================

IMG_HEIGHT = 128
IMG_WIDTH = 128

N_FFT = 2048
HOP_LENGTH = 256
N_MELS = 128

# =========================
# UI
# =========================

WAVEFORM_MAX_POINTS = 2000
FFT_MAX_POINTS = 2000
FFT_MAX_FREQUENCY = 8000