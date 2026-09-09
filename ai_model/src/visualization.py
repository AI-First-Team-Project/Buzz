'''
Waveform
FFT
Spectrogram
UI 전송용 downsampling / list 변환
'''

import numpy as np
import librosa

from .config import HOP_LENGTH, N_MELS, WAVEFORM_MAX_POINTS, FFT_MAX_POINTS, FFT_MAX_FREQUENCY

from .audio_preprocessing import create_mel_spectrogram_from_audio

'''
UI 그래프 전송용 1차원 데이터 다운샘플링
'''
def downsample_1d(x, y, max_points):
    if len(x) <= max_points:
        return x, y

    indices = np.linspace(0, len(x) - 1, max_points, dtype = int)

    return (x[indices], y[indices])

'''
UI에서 사용할 Waveform / FFT / Spectrogram 데이터 생성
'''
def create_audio_visualization_data(y, sr):
    # =========================
    # Waveform
    # =========================

    waveform_time = np.arange(len(y)) / sr

    (waveform_time, waveform_amplitude) = downsample_1d(waveform_time, y, WAVEFORM_MAX_POINTS)

    # =========================
    # FFT
    # =========================

    fft_values = np.fft.rfft(y)
    fft_magnitude = np.abs(fft_values)
    # 전체 FFT 최대 크기에 대한 상대 dB. 주파수 범위를 자르기 전에 기준을 정한다.
    fft_magnitude = librosa.amplitude_to_db(fft_magnitude, ref=np.max)
    fft_frequency = np.fft.rfftfreq(len(y), d = 1 / sr)

    # UI에 필요한 주파수 범위만 사용
    fft_mask = fft_frequency <= FFT_MAX_FREQUENCY
    fft_frequency = fft_frequency[fft_mask]
    fft_magnitude = fft_magnitude[fft_mask]

    # FastAPI와 동일하게 전체 FFT의 최대 크기를 기준으로 dB 변환 후 축소한다.
    (fft_frequency, fft_magnitude) = downsample_1d(
        fft_frequency,
        fft_magnitude,
        FFT_MAX_POINTS
    )

    # =========================
    # Mel-Spectrogram
    # =========================

    mel_spec_db = create_mel_spectrogram_from_audio(y, sr)

    spec_times = librosa.frames_to_time(
        np.arange(mel_spec_db.shape[1]),
        sr = sr,
        hop_length = HOP_LENGTH
    )

    spec_frequencies = librosa.mel_frequencies(
        n_mels = N_MELS,
        fmin = 0,
        fmax = sr / 2
    )

    # =========================
    # JSON 직렬화
    # =========================

    return {
        'waveform': {
            'time': waveform_time.tolist(),
            'amplitude': waveform_amplitude.tolist()
        },
        'fft': {
            'frequency': fft_frequency.tolist(),
            'magnitudeDb': fft_magnitude.tolist()
        },
        'spectrogram': {
            'time': spec_times.tolist(),
            'frequency': spec_frequencies.tolist(),
            'db': mel_spec_db.tolist()
        }
    }
