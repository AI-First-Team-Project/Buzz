from pathlib import Path
from uuid import uuid4

import librosa
import librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from ..config import ANALYSIS_DIR, DURATION_SEC, HOP_LENGTH, N_FFT, N_MELS, SAMPLE_RATE
from ..schemas import AnalysisImages


def load_audio(audio_path: Path):
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True, duration=DURATION_SEC)
    if len(y) == 0:
        raise ValueError("오디오 데이터가 비어 있습니다.")

    target_len = int(SAMPLE_RATE * DURATION_SEC)
    if len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))
    elif len(y) > target_len:
        y = y[:target_len]

    return y.astype(np.float32), sr


def _save(fig, path: Path):
    fig.tight_layout()
    fig.savefig(path, dpi=130, bbox_inches="tight")
    plt.close(fig)


def create_analysis_images(audio_path: Path, base_url: str) -> tuple[str, float, AnalysisImages]:
    y, sr = load_audio(audio_path)
    analysis_id = uuid4().hex
    out_dir = ANALYSIS_DIR / analysis_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Waveplot
    fig, ax = plt.subplots(figsize=(8, 3))
    librosa.display.waveshow(y, sr=sr, ax=ax)
    ax.set(title="Waveplot", xlabel="Time (s)", ylabel="Amplitude")
    _save(fig, out_dir / "waveplot.png")

    # FFT
    fft_values = np.fft.rfft(y)
    magnitude = np.abs(fft_values)
    frequency = np.fft.rfftfreq(len(y), d=1 / sr)
    fig, ax = plt.subplots(figsize=(8, 3))
    ax.plot(frequency, magnitude, linewidth=0.8)
    ax.set(title="FFT Spectrum", xlabel="Frequency (Hz)", ylabel="Magnitude")
    ax.set_xlim(0, sr / 2)
    _save(fig, out_dir / "fft.png")

    # Mel-Spectrogram
    mel = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS, power=2.0
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)
    fig, ax = plt.subplots(figsize=(8, 4))
    img = librosa.display.specshow(mel_db, sr=sr, hop_length=HOP_LENGTH, x_axis="time", y_axis="mel", ax=ax)
    ax.set(title="Mel-Spectrogram")
    fig.colorbar(img, ax=ax, format="%+2.0f dB")
    _save(fig, out_dir / "mel.png")

    # MFCC
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20, n_fft=N_FFT, hop_length=HOP_LENGTH)
    fig, ax = plt.subplots(figsize=(8, 4))
    img = librosa.display.specshow(mfcc, sr=sr, hop_length=HOP_LENGTH, x_axis="time", ax=ax)
    ax.set(title="MFCC", ylabel="MFCC Coefficient")
    fig.colorbar(img, ax=ax)
    _save(fig, out_dir / "mfcc.png")

    prefix = base_url.rstrip("/") + f"/analysis/{analysis_id}"
    images = AnalysisImages(
        waveplot=f"{prefix}/waveplot.png",
        fft=f"{prefix}/fft.png",
        mel=f"{prefix}/mel.png",
        mfcc=f"{prefix}/mfcc.png",
    )

    return analysis_id, len(y) / sr, images
