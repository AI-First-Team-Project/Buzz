'''
WAV 로드
RMS 정규화
Mel-Spectrogram
DL 입력 전처리
'''

import numpy as np
import librosa
import tensorflow as tf

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from .config import SR, DURATION, TARGET_DB, IMG_HEIGHT, IMG_WIDTH, N_FFT, HOP_LENGTH, N_MELS

'''
오디오 RMS 음량 정규화
'''
def normalize_rms(y, target_db = TARGET_DB):
    rms = np.sqrt(np.mean(y ** 2))

    if rms < 1e-8:
        return y

    target_rms = 10 ** (target_db / 20)

    y = y * (target_rms / rms)

    return np.clip(y, -1.0, 1.0)

'''
오디오 파일 로드 및 기본 전처리
- mono 변환
- Sample Rate 통일
- 지정 길이로 자르기
- RMS 정규화
- 짧은 오디오는 zero padding
'''
def load_audio_file(audio_path, sr = SR, duration = DURATION):
    y, sr = librosa.load(audio_path, sr = sr, mono = True)

    target_length = int(sr * duration)

    # 지정 길이보다 긴 경우
    if len(y) > target_length:
        max_start = (len(y) - target_length)

        start = np.random.randint(0, max_start + 1)

        y = y[start:start + target_length]

    # RMS 정규화
    y = normalize_rms(y)

    # 지정 길이보다 짧은 경우
    if len(y) < target_length:
        padding = target_length - len(y)

        y = np.pad(y, (0, padding), mode = 'constant')

    return (y.astype(np.float32), sr)

'''
이미 로드된 오디오 신호에서 Mel-Spectrogram 생성
'''
def create_mel_spectrogram_from_audio(y, sr):
    mel_spec = librosa.feature.melspectrogram(
        y = y,
        sr = sr,
        n_fft = N_FFT,
        hop_length = HOP_LENGTH,
        n_mels = N_MELS,
        power = 2.0
    )

    mel_spec_db = librosa.power_to_db(mel_spec, ref = np.max)

    return mel_spec_db.astype(np.float32)

'''
Mel-Spectrogram dB 값
-80 ~ 0 → 0 ~ 1
'''
def normalize_mel_db(X):
    X_normalized = (X + 80.0) / 80.0

    X_normalized = np.clip(X_normalized, 0.0, 1.0)

    return X_normalized.astype(np.float32)

'''
CNN 입력 전처리
(N, Mel, Time) → (N, 128, 128, 1)
'''
def prepare_cnn_dataset(X):
    X_normalized = normalize_mel_db(X)

    X_normalized = X_normalized[..., np.newaxis]

    X_resized = tf.image.resize(X_normalized, (IMG_HEIGHT, IMG_WIDTH))

    return X_resized.numpy().astype(np.float32)

'''
MobileNetV2 입력 전처리
Mel
→ 0 ~ 1
→ Resize
→ RGB 3채널
→ 0 ~ 255
→ MobileNetV2 preprocess_input
'''
def prepare_mobilenet_dataset(X):
    X_normalized = normalize_mel_db(X)

    X_normalized = X_normalized[..., np.newaxis]

    X_resized = tf.image.resize(X_normalized, (IMG_HEIGHT, IMG_WIDTH))

    X_rgb = tf.repeat(X_resized, repeats = 3, axis = -1)

    X_rgb = X_rgb * 255.0

    X_preprocessed = preprocess_input(X_rgb)

    return X_preprocessed.numpy().astype(np.float32)

'''
CRNN 입력 전처리
- 시간축은 Resize하지 않고 그대로 유지
'''
def prepare_crnn_dataset(X):
    X_normalized = normalize_mel_db(X)

    X_normalized = X_normalized[..., np.newaxis]

    return X_normalized.astype(np.float32)