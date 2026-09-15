"""이진 라벨 음원 수집과 원본 녹음(source) 단위 데이터 분할."""

from pathlib import Path

import numpy as np
import soundfile as sf
from sklearn.model_selection import GroupShuffleSplit

from .config import AUDIO_DIR, CLASSES, DURATION


def collect_audio_files(audio_dir=AUDIO_DIR):
    """audio/{non_wasp,wasp}/{source_id}/*.wav만 학습에 사용한다.

    source_id는 원본 영상/녹음 ID. 같은 원본은 클래스가 달라도 같은 ID를 쓴다.
    긴 음원은 말벌 유무를 확인한 2초 이하 구간으로 먼저 분리해야 한다.
    """
    records = []
    for label, class_name in enumerate(CLASSES):
        class_dir = Path(audio_dir) / class_name
        files = sorted(p for p in class_dir.rglob('*') if p.is_file() and p.suffix.lower() == '.wav')
        if not files:
            raise ValueError(f'{class_dir}/<source_id>/ 폴더에 WAV를 준비하세요.')
        for path in files:
            relative = path.relative_to(class_dir)
            if len(relative.parts) < 2:
                raise ValueError(f'{path}: 원본별 하위 폴더(source_id)에 넣어 주세요. README.md 참고.')
            info = sf.info(path)
            if info.frames <= 0 or info.duration > DURATION + 1 / info.samplerate:
                raise ValueError(f'{path}: 학습 음원은 라벨을 확인한 0~{DURATION}초(빈 음원 제외) 구간이어야 합니다.')
            records.append({'path': str(path), 'label': label, 'source_id': relative.parts[0]})
    return records


def split_by_source(labels, groups, seed=42):
    """약 70/15/15 분할. 같은 source는 하나의 split에만 포함된다."""
    labels, groups = np.asarray(labels), np.asarray(groups)
    if labels.ndim != 1 or groups.shape != labels.shape or set(labels.tolist()) != {0, 1}:
        raise ValueError('동일한 길이의 이진 라벨과 source_id가 필요합니다.')
    if any(len(set(groups[labels == label])) < 3 for label in (0, 1)):
        raise ValueError('Train/Validation/Test 분리를 위해 클래스별 독립 원본이 최소 3개 필요합니다.')
    best = None
    group_count = len(set(groups))
    # 원본이 적어도 val/test 양쪽에 두 클래스가 들어갈 공간을 확보한다.
    remaining_count = min(group_count - 1, max(4 if group_count >= 6 else 2,
                                              int(np.ceil(group_count * 0.30))))
    outer = GroupShuffleSplit(n_splits=100, test_size=remaining_count, random_state=seed)
    for attempt, (train, remaining) in enumerate(outer.split(labels, labels, groups)):
        if len(set(groups[remaining])) < 2:
            continue
        inner = GroupShuffleSplit(n_splits=1, test_size=0.5, random_state=seed + attempt)
        val_rel, test_rel = next(inner.split(labels[remaining], groups=groups[remaining]))
        parts = (train, remaining[val_rel], remaining[test_rel])
        if any(set(labels[indices]) != {0, 1} for indices in parts):
            continue
        # 모델 예측을 보지 않고 전체/클래스별 구간 비율로만 분할을 선택한다.
        score = sum(
            abs(len(indices) / len(labels) - target)
            + sum(abs(np.sum(labels[indices] == label) / np.sum(labels == label) - target)
                  for label in (0, 1))
            for indices, target in zip(parts, (0.7, 0.15, 0.15))
        )
        if best is None or score < best[0]:
            best = (score, parts)
    if best is None:
        raise ValueError('두 클래스를 포함하는 원본별 분할을 만들지 못했습니다. 독립 원본을 추가하세요.')
    return best[1]
