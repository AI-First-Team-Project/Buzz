from pathlib import Path

import librosa
import numpy as np

from ..config import (
    DURATION_SEC,
    FFT_POINTS,
    HOP_LENGTH,
    MFCC_TIME_BINS,
    N_FFT,
    N_MELS,
    N_MFCC,
    SAMPLE_RATE,
    SPECTROGRAM_TIME_BINS,
    WAVEFORM_POINTS,
)
from ..schemas import FFTData, MFCCData, SpectrogramData, WaveformData


def load_audio(audio_path: Path) -> tuple[np.ndarray, int]:
    """Load one model input window using the project-wide 2 sec / 48 kHz rule."""
    y, sr = librosa.load(
        audio_path,
        sr=SAMPLE_RATE,
        mono=True,
        duration=DURATION_SEC,
    )
    if len(y) == 0:
        raise ValueError("오디오 데이터가 비어 있습니다.")

    target_len = int(SAMPLE_RATE * DURATION_SEC)
    if len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))
    elif len(y) > target_len:
        y = y[:target_len]

    return y.astype(np.float32), sr


def _sample_1d(values: np.ndarray, max_points: int) -> np.ndarray:
    if len(values) <= max_points:
        return values
    indices = np.linspace(0, len(values) - 1, max_points, dtype=np.int64)
    return values[indices]


def _sample_axis(matrix: np.ndarray, max_cols: int) -> np.ndarray:
    if matrix.shape[1] <= max_cols:
        return matrix
    indices = np.linspace(0, matrix.shape[1] - 1, max_cols, dtype=np.int64)
    return matrix[:, indices]


def _round_list(values: np.ndarray, digits: int = 6) -> list[float]:
    return np.round(values.astype(np.float64), digits).tolist()


def create_analysis_data(
    audio_path: Path,
) -> tuple[float, WaveformData, FFTData, SpectrogramData, MFCCData]:
    """Create numeric analysis data for Android-side visualization.

    No PNG files are created. Data sizes are bounded to keep the JSON response practical.
    """
    y, sr = load_audio(audio_path)

    # Waveform: 96,000 raw samples -> about 1,500 points for UI rendering.
    waveform = WaveformData(amplitude=_round_list(_sample_1d(y, WAVEFORM_POINTS)))

    # FFT: convert magnitude to dB, then reduce points for transport/rendering.
    fft_values = np.fft.rfft(y)
    magnitude = np.abs(fft_values)
    magnitude_db = librosa.amplitude_to_db(magnitude, ref=np.max)
    frequency = np.fft.rfftfreq(len(y), d=1 / sr)

    if len(frequency) > FFT_POINTS:
        indices = np.linspace(0, len(frequency) - 1, FFT_POINTS, dtype=np.int64)
        frequency = frequency[indices]
        magnitude_db = magnitude_db[indices]

    fft = FFTData(
        frequency=_round_list(frequency, digits=3),
        magnitudeDb=_round_list(magnitude_db, digits=4),
    )

    # Mel-Spectrogram.
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        power=2.0,
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_db = _sample_axis(mel_db, SPECTROGRAM_TIME_BINS)

    mel_times_full = librosa.frames_to_time(
        np.arange(librosa.feature.melspectrogram(
            y=y,
            sr=sr,
            n_fft=N_FFT,
            hop_length=HOP_LENGTH,
            n_mels=N_MELS,
            power=2.0,
        ).shape[1]),
        sr=sr,
        hop_length=HOP_LENGTH,
    )
    if len(mel_times_full) > mel_db.shape[1]:
        time_indices = np.linspace(0, len(mel_times_full) - 1, mel_db.shape[1], dtype=np.int64)
        mel_times = mel_times_full[time_indices]
    else:
        mel_times = mel_times_full
    mel_frequency = librosa.mel_frequencies(n_mels=N_MELS, fmin=0.0, fmax=sr / 2)

    spectrogram = SpectrogramData(
        time=_round_list(mel_times, digits=4),
        frequency=_round_list(mel_frequency, digits=2),
        db=np.round(mel_db.astype(np.float64), 4).tolist(),
    )

    # MFCC.
    mfcc_values = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    original_mfcc_cols = mfcc_values.shape[1]
    mfcc_values = _sample_axis(mfcc_values, MFCC_TIME_BINS)
    mfcc_times_full = librosa.frames_to_time(
        np.arange(original_mfcc_cols),
        sr=sr,
        hop_length=HOP_LENGTH,
    )
    if len(mfcc_times_full) > mfcc_values.shape[1]:
        time_indices = np.linspace(0, len(mfcc_times_full) - 1, mfcc_values.shape[1], dtype=np.int64)
        mfcc_times = mfcc_times_full[time_indices]
    else:
        mfcc_times = mfcc_times_full

    mfcc = MFCCData(
        time=_round_list(mfcc_times, digits=4),
        coefficients=np.round(mfcc_values.astype(np.float64), 4).tolist(),
    )

    return len(y) / sr, waveform, fft, spectrogram, mfcc
