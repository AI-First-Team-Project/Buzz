'''
MFCC / Chroma / Spectral Feature 등 ML용 특징 추출
'''

import numpy as np
import librosa

'''
이미 로드된 오디오 신호에서 머신러닝 모델용 음향 특징 추출
- MFCC 평균 / 표준편차
- Chroma 평균 / 표준편차
- Spectral Centroid
- Spectral Bandwidth
- Spectral Rolloff
- Zero Crossing Rate
- RMS
'''
def extract_audio_features_from_audio(y, sr):
    features = []

    # =========================
    # MFCC
    # =========================

    mfcc = librosa.feature.mfcc(y = y, sr = sr, n_mfcc = 20)

    features.extend(np.mean(mfcc, axis = 1))
    features.extend(np.std(mfcc, axis = 1))

    # =========================
    # Chroma
    # =========================

    chroma = librosa.feature.chroma_stft(y = y, sr = sr)

    features.extend(np.mean(chroma, axis = 1))
    features.extend(np.std(chroma, axis = 1))

    # =========================
    # Spectral Centroid
    # =========================

    spectral_centroid = librosa.feature.spectral_centroid(y = y, sr = sr)

    features.append(np.mean(spectral_centroid))
    features.append(np.std(spectral_centroid))

    # =========================
    # Spectral Bandwidth
    # =========================

    spectral_bandwidth = librosa.feature.spectral_bandwidth(y = y, sr = sr)

    features.append(np.mean(spectral_bandwidth))
    features.append(np.std(spectral_bandwidth))

    # =========================
    # Spectral Rolloff
    # =========================

    spectral_rolloff = librosa.feature.spectral_rolloff(y = y, sr = sr)

    features.append(np.mean(spectral_rolloff))
    features.append(np.std(spectral_rolloff))

    # =========================
    # Zero Crossing Rate
    # =========================

    zcr = librosa.feature.zero_crossing_rate(y)

    features.append(np.mean(zcr))
    features.append(np.std(zcr))

    # =========================
    # RMS
    # =========================

    rms = librosa.feature.rms(y = y)

    features.append(np.mean(rms))
    features.append(np.std(rms))

    return np.array(features, dtype = np.float32)