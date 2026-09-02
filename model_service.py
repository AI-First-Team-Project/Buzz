from pathlib import Path

import librosa
import numpy as np
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v2


# ===== [수정 시작 9월 2일 15:11] 로컬 실행 인자 방식 제거 및 백엔드 호출용 모델 서비스 구조로 변경 =====
PROJECT_DIR = Path(r"C:\Users\GARAM\Documents\buzz")

BEE_MODEL_PATH = PROJECT_DIR / "models" / "bee_autoencoder.pth"
HORNET_MODEL_PATH = PROJECT_DIR / "models" / "hornet_other_mobilenetv2_all.pth"

SAMPLE_RATE = 22050

BEE_DURATION = 3
HORNET_DURATION = 2

N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512
IMAGE_SIZE = 224

BEE_THRESHOLD = 0.00069606

LABEL_MAP = {
    0: "other",
    1: "hornet",
}
# ===== [수정 종료] =====


# ===== [추가 시작 9월 2일 15:11] Bee Autoencoder 모델 구조 =====
class BeeAutoencoder(nn.Module):
    def __init__(self):
        super().__init__()

        self.encoder = nn.Sequential(
            nn.Conv2d(
                1,
                16,
                3,
                stride=2,
                padding=1,
            ),
            nn.ReLU(),

            nn.Conv2d(
                16,
                32,
                3,
                stride=2,
                padding=1,
            ),
            nn.ReLU(),

            nn.Conv2d(
                32,
                64,
                3,
                stride=2,
                padding=1,
            ),
            nn.ReLU(),
        )

        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(
                64,
                32,
                3,
                stride=2,
                padding=1,
                output_padding=1,
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                32,
                16,
                3,
                stride=2,
                padding=1,
                output_padding=1,
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                16,
                1,
                3,
                stride=2,
                padding=1,
                output_padding=1,
            ),
            nn.Sigmoid(),
        )

    def forward(self, x):
        encoded = self.encoder(
            x
        )

        decoded = self.decoder(
            encoded
        )

        decoded = decoded[
            :,
            :,
            :x.shape[2],
            :x.shape[3],
        ]

        return decoded
# ===== [추가 종료] =====


# ===== [추가 시작 9월 2일 15:11] 체크포인트 state_dict 추출 =====
def extract_state_dict(
    checkpoint,
):
    if isinstance(
        checkpoint,
        dict,
    ):
        if (
            "model_state_dict"
            in checkpoint
        ):
            return checkpoint[
                "model_state_dict"
            ]

        if (
            "state_dict"
            in checkpoint
        ):
            return checkpoint[
                "state_dict"
            ]

    return checkpoint
# ===== [추가 종료] =====


# ===== [수정 시작 9월 2일 15:11] 서버 시작 시 두 모델을 한 번만 로드하도록 변경 =====
DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


def load_models():
    if not BEE_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Bee Autoencoder 모델이 없습니다: "
            f"{BEE_MODEL_PATH}"
        )

    if not HORNET_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"MobileNetV2 모델이 없습니다: "
            f"{HORNET_MODEL_PATH}"
        )

    bee_model = BeeAutoencoder().to(
        DEVICE
    )

    bee_checkpoint = torch.load(
        BEE_MODEL_PATH,
        map_location=DEVICE,
    )

    bee_model.load_state_dict(
        extract_state_dict(
            bee_checkpoint
        )
    )

    bee_model.eval()

    hornet_checkpoint = torch.load(
        HORNET_MODEL_PATH,
        map_location=DEVICE,
    )

    hornet_model = mobilenet_v2(
        weights=None
    )

    in_features = (
        hornet_model.classifier[
            1
        ].in_features
    )

    hornet_model.classifier[
        1
    ] = nn.Linear(
        in_features,
        2,
    )

    hornet_model.load_state_dict(
        extract_state_dict(
            hornet_checkpoint
        )
    )

    hornet_model = hornet_model.to(
        DEVICE
    )

    hornet_model.eval()

    return (
        bee_model,
        hornet_model,
    )


BEE_MODEL, HORNET_MODEL = load_models()
# ===== [수정 종료] =====


# ===== [추가 시작 9월 2일 15:11] 공통 오디오 및 Mel 전처리 =====
def fix_audio_length(
    audio,
    duration,
):
    target_length = int(
        SAMPLE_RATE
        * duration
    )

    if len(audio) > target_length:
        return audio[
            :target_length
        ]

    if len(audio) < target_length:
        return np.pad(
            audio,
            (
                0,
                target_length
                - len(audio),
            ),
        )

    return audio


def create_mel(
    audio,
):
    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=SAMPLE_RATE,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        power=2.0,
    )

    mel_db = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    return mel_db.astype(
        np.float32
    )


def minmax_normalize(
    mel,
):
    mel_min = mel.min()
    mel_max = mel.max()

    return (
        mel - mel_min
    ) / (
        mel_max
        - mel_min
        + 1e-8
    )
# ===== [추가 종료] =====


# ===== [추가 시작 9월 2일 15:11] Bee Autoencoder 1차 판정 =====
def predict_bee(
    audio,
):
    bee_audio = fix_audio_length(
        audio,
        BEE_DURATION,
    )

    mel = create_mel(
        bee_audio
    )

    mel = minmax_normalize(
        mel
    )

    tensor = torch.tensor(
        mel,
        dtype=torch.float32,
    ).unsqueeze(
        0
    ).unsqueeze(
        0
    ).to(
        DEVICE
    )

    with torch.no_grad():
        reconstructed = BEE_MODEL(
            tensor
        )

        reconstruction_error = (
            torch.mean(
                (
                    tensor
                    - reconstructed
                )
                ** 2
            )
            .item()
        )

    is_bee = (
        reconstruction_error
        <= BEE_THRESHOLD
    )

    return (
        is_bee,
        reconstruction_error,
    )
# ===== [추가 종료] =====


# ===== [추가 시작 9월 2일 15:11] MobileNetV2 2차 말벌/기타 판정 =====
def prepare_mobilenet_input(
    audio,
):
    hornet_audio = fix_audio_length(
        audio,
        HORNET_DURATION,
    )

    mel = create_mel(
        hornet_audio
    )

    mel = minmax_normalize(
        mel
    )

    tensor = torch.tensor(
        mel,
        dtype=torch.float32,
    ).unsqueeze(
        0
    )

    tensor = nn.functional.interpolate(
        tensor.unsqueeze(
            0
        ),
        size=(
            IMAGE_SIZE,
            IMAGE_SIZE,
        ),
        mode="bilinear",
        align_corners=False,
    ).squeeze(
        0
    )

    tensor = tensor.repeat(
        3,
        1,
        1,
    )

    mean = torch.tensor(
        [
            0.485,
            0.456,
            0.406,
        ],
        dtype=torch.float32,
    ).view(
        3,
        1,
        1,
    )

    std = torch.tensor(
        [
            0.229,
            0.224,
            0.225,
        ],
        dtype=torch.float32,
    ).view(
        3,
        1,
        1,
    )

    tensor = (
        tensor - mean
    ) / std

    return tensor.unsqueeze(
        0
    )


def predict_hornet_or_other(
    audio,
):
    tensor = prepare_mobilenet_input(
        audio
    ).to(
        DEVICE
    )

    with torch.no_grad():
        logits = HORNET_MODEL(
            tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1,
        )[0]

        predicted_index = int(
            torch.argmax(
                probabilities
            ).item()
        )

    prediction = LABEL_MAP[
        predicted_index
    ]

    confidence = float(
        probabilities[
            predicted_index
        ].item()
    )

    hornet_probability = float(
        probabilities[
            1
        ].item()
    )

    other_probability = float(
        probabilities[
            0
        ].item()
    )

    return {
        "prediction":
            prediction,
        "confidence":
            confidence,
        "hornet_probability":
            hornet_probability,
        "other_probability":
            other_probability,
    }
# ===== [추가 종료] =====


# ===== [수정 시작 9월 2일 15:11] 프론트엔드 업로드 파일을 bytes로 받아 추론할 수 있도록 변경 =====
def predict_from_bytes(
    audio_bytes,
    filename="uploaded_audio",
):
    import io
    import soundfile as sf

    audio, sample_rate = sf.read(
        io.BytesIO(
            audio_bytes
        ),
        dtype="float32",
    )

    if audio.ndim > 1:
        audio = np.mean(
            audio,
            axis=1,
        )

    if sample_rate != SAMPLE_RATE:
        audio = librosa.resample(
            audio,
            orig_sr=sample_rate,
            target_sr=SAMPLE_RATE,
        )

    return predict_from_waveform(
        audio=audio,
        filename=filename,
    )


def predict_from_file(
    file_path,
):
    file_path = Path(
        file_path
    )

    if not file_path.exists():
        raise FileNotFoundError(
            f"음원 파일이 없습니다: "
            f"{file_path}"
        )

    audio, _ = librosa.load(
        file_path,
        sr=SAMPLE_RATE,
        mono=True,
    )

    return predict_from_waveform(
        audio=audio.astype(
            np.float32
        ),
        filename=file_path.name,
    )


def predict_from_waveform(
    audio,
    filename="uploaded_audio",
):
    audio = np.asarray(
        audio,
        dtype=np.float32,
    )

    is_bee, reconstruction_error = predict_bee(
        audio
    )

    if is_bee:
        return {
            "filename":
                filename,
            "prediction":
                "bee",
            "confidence":
                None,
            "stage":
                "bee_autoencoder",
            "bee_reconstruction_error":
                reconstruction_error,
            "bee_threshold":
                BEE_THRESHOLD,
            "hornet_probability":
                None,
            "other_probability":
                None,
            "detected":
                False,
        }

    second_stage = (
        predict_hornet_or_other(
            audio
        )
    )

    return {
        "filename":
            filename,
        "prediction":
            second_stage[
                "prediction"
            ],
        "confidence":
            second_stage[
                "confidence"
            ],
        "stage":
            "mobilenetv2",
        "bee_reconstruction_error":
            reconstruction_error,
        "bee_threshold":
            BEE_THRESHOLD,
        "hornet_probability":
            second_stage[
                "hornet_probability"
            ],
        "other_probability":
            second_stage[
                "other_probability"
            ],
        "detected":
            (
                second_stage[
                    "prediction"
                ]
                == "hornet"
            ),
    }
# ===== [수정 종료] =====
