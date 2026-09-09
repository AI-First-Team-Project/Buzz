# 말벌 포함 여부 이진분류 — 1단계

이번 변경은 `ai_model` 내부의 학습·평가·추론 코드만 대상으로 한다.
데이터 수집, 전체 재학습, FastAPI/앱 연동, 랜덤 공급기는 다음 작업이다.

## 라벨과 판정

| 인덱스 | 라벨 | 의미 |
|---|---|---|
| 0 | `non_wasp` | 말벌이 없는 소리. 꿀벌, 바람, 사람, 기계음 및 이들의 혼합음 |
| 1 | `wasp` | 말벌 단독 또는 말벌이 포함된 혼합음 |

CNN/MobileNetV2/CRNN은 `Dense(2, softmax)`와
`sparse_categorical_crossentropy`를 사용한다. 두 클래스 확률의 합은 1이다.
이진분류에 반드시 sigmoid 출력 1개가 필요한 것은 아니며, 2개 softmax 출력은
기존 확률 평균 앙상블·머신러닝 모델과 동일한 형식을 유지할 수 있다.

RandomForest도 두 라벨로 학습한다. LightGBM은 `binary`, XGBoost는
`binary:logistic`/`logloss`로 학습한다. 클래스 가중치 또는 샘플 가중치는
학습 세트에서만 계산한다.

최종 판정은 `P(wasp) >= WASP_THRESHOLD`이면 `wasp`다. 기본값은 **0.5**이며
검증된 최적값이 아니다. `src/config.py`에서 변경한 뒤 검증/평가를 다시 실행한다.
테스트 세트로 임계값을 조정하지 않는다. `confidence`는 선택한 라벨의 확률이며,
말벌 포함 확률은 항상 `prediction.probabilities.wasp`로 읽는다.

## 데이터 배치

```text
ai_model/
  audio/
    non_wasp/
      youtube_video_A/
        clip_000.wav
        clip_001.wav
      recording_B/
        clip_000.wav
    wasp/
      youtube_video_C/
        wasp_only_000.wav
        wasp_with_bees_001.wav
      recording_D/
        wasp_with_wind_000.wav
  demo_audio/                  # 별도 확보한 시연 음원, 학습에서 읽지 않음
  models/                     # 노트북 실행 시 새 모델·분할 목록·평가 요약 저장
```

- `wasp`에는 단독음과 혼합음을 함께 넣는다. 별도 혼합 클래스는 만들지 않는다.
- **학습 WAV는 2초 이하이며 비어 있지 않아야 한다.** 긴 영상 음원은 먼저 구간을
  나누고, 각 구간에 실제로 말벌 소리가 있는지 확인한다. 긴 파일에 라벨 하나를
  붙인 뒤 앞부분만 학습하는 실수를 막기 위해 긴 학습 WAV는 오류로 처리한다.
- 샘플레이트와 채널은 로딩할 때 24kHz/모노로 통일하고 짧은 구간은 뒤를 0으로 채운다.
- 클래스 바로 아래 폴더 이름은 **원본 영상/녹음 ID**다. 같은 영상에서 얻은
  음원은 라벨이 달라도 같은 ID를 사용한다. 서로 다른 원본에는 다른 ID를 부여한다.
- 원본별로 약 70/15/15 비율로 Train/Validation/Test를 자동 분리한다.
  원본 개수·길이에 따라 실제 비율은 달라지며, 모든 분할에 두 클래스가 있어야 한다.
  클래스별 최소 3개의 독립 원본은 분할을 위한 최소 조건일 뿐 성능 확보 기준이 아니다.
- 여러 원본을 합성한 경우 **재료 원본과 그 파생 음원 전체를 같은 그룹 ID로 묶는다.**
  예를 들어 A+B, A+C 합성음은 A/B/C와 모두 같은 그룹이다. 서로 다른 그룹에
  같은 재료를 재사용하면 이 폴더 기반 분할만으로는 누수를 막을 수 없다.
- 노트북의 **Train 전용 혼합음 학습** 셀에서 학습용 말벌음과 학습용 일반음을
  메모리에서 합성한다. 폴더에 혼합 WAV를 직접 추가할 필요는 없다.
  `ENABLE_MIXING=True`, `MIX_REPLACE_RATIO=0.5`로 말벌 구간의 약 절반을 대체하며, SNR +10/+5/0/-5dB를 초기 설정으로 사용한다.
  Validation/Test 음원은 합성 재료로도 사용하지 않는다. 따라서 해당 분할에만 있는
  배경 종류는 합성에 포함되지 않는다. 합성 후 학습 클래스 가중치를 다시 계산한다.
  `ENABLE_MIXING=False`이면 원래 데이터만으로 학습한다.
- 기존 `audio/bee`, `audio/other`는 읽지 않는다. 말벌이 없는 구간만 원본 관계를
  확인해 `non_wasp/<원본ID>/`로 정리한다. 기존 `wasp`의 WAV도 원본별 하위 폴더에 넣는다.
- 시연용 원본은 학습/검증/테스트 원본과 분리해 `demo_audio` 등 `audio` 밖에 보관한다.
  위 트리는 배치 예시이며 기존 데이터와 모델을 자동 이동·삭제하지 않는다.

## 학습과 실행

1. 위 구조로 음원을 준비한다.
2. 저장소 루트 또는 `ai_model`에서 `sound_analysis.ipynb`를 열고 커널을 재시작한다.
3. 공통 설정과 데이터 분포를 확인한 뒤 위에서부터 실행한다.
4. 6개 모델과 앙상블을 validation에서 비교하고 최종 방식의 test 결과를 확인한다.
5. Wasp Recall 외에 Wasp Precision, False Negative(말벌 미탐), False Positive(일반음 오탐),
   False Positive Rate도 확인한다. 최종 성능은 실제 미사용 음원으로 평가해야 한다.

학습 결과는 `models/`의 모델 파일들과 `dataset_split.csv`,
`training_summary.json`에 저장된다. 추론도 같은 폴더의 `.keras`, `.pkl` 파일을 로드한다.
혼합 재료와 음량 조건은 `mixing_manifest.csv`에 기록한다. 혼합음은 DL/ML 모두에서
동일한 위치의 원본 특징을 대체하며 전체 Train 개수는 유지된다. `paths_train_mel`은 원본 경로 목록이며 혼합음 경로는 포함하지 않는다.
새 실험은 커널 재시작 후 노트북을 위에서부터 순차 실행한다.
클래스 출력 개수만 이름을 바꿔 기존 3분류 가중치를 재사용할 수는 없다.

저장소 루트에서 재학습한 모델을 사용할 때:

```powershell
.venv/Scripts/python.exe ai_model/predict.py ai_model/demo_audio/example.wav --model RandomForest
.venv/Scripts/python.exe ai_model/predict.py ai_model/demo_audio/example.wav --model CNN --offset 4
.venv/Scripts/python.exe ai_model/predict.py ai_model/demo_audio/example.wav --ensemble
```

`--model`은 `training_summary.json`에 기록된 최종 단일 모델 이름을 지정한다.
CLI 기본 모델은 MobileNetV2다. 앙상블이면 6개 모델 모두 필요하지만 단일 모델은
선택한 파일만 로드한다. `--threshold`를 변경할 수 있으나 평가에 사용한 값과 맞춰야 한다.
`--offset 4`는 4~6초 구간을 분석한다. **현재 한 번의 호출은 한 구간만 분석**하며,
긴 파일 전체 순회·실시간 공급은 다음 단계에서 구현한다.

반환 예시(설명용 수치):

```json
{
  "prediction": {
    "label": "wasp",
    "confidence": 0.82,
    "probabilities": {"non_wasp": 0.18, "wasp": 0.82}
  },
  "meta": {
    "modelName": "RandomForest",
    "waspThreshold": 0.5,
    "offset": 0.0,
    "duration": 2.0
  }
}
```

실제 반환에는 기존 waveform/FFT/spectrogram 및 timing도 포함된다.
서버와 앱은 아직 3분류 스키마이므로 이 결과를 연결하는 작업은 다음 단계다.

## 무엇을 어떻게, 왜 변경했는가

| 파일 | 어떻게 수정 | 이유 |
|---|---|---|
| `src/config.py` | 라벨 0/1, 말벌 임계값, 이진 모델 저장 경로 정의 | 학습·평가·추론 기준 통일 |
| `src/binary_classification.py` | 확률 검증, 임계값 판정, ML 확률 열 정렬 공통화 | 클래스 순서 혼동·3분류 출력의 오사용 방지 |
| `src/dataset.py` | 원본별 WAV 수집·길이 검증·그룹 분할 | 같은 영상의 잘린 구간이 평가로 새는 문제 방지 |
| `sound_analysis.ipynb` | 6개 모델 이진 학습, 가중치 보정, 양성=1 평가, 미탐/오탐 집계 | 말벌 포함 여부 기준으로 학습·비교 |
| `sound_analysis.ipynb` | 동일한 파형에서 DL/ML 특징 생성, src 공통 전처리·추론 사용 | 학습/추론 구간과 구현 불일치 방지 |
| `sound_analysis.ipynb` | 기존 실행 출력 제거, 분할·실행 설정 저장 | 과거 3분류 점수를 새 성능으로 오인하지 않도록 함 |
| `src/audio_preprocessing.py` | duration 하드코딩 제거, offset 지원, 빈 구간 검증 | 선택한 구간을 일관되게 분석 |
| `src/model_loader.py` | 필요한 모델만 로드, 2개 출력 확인, 재학습 안내 | 잘못된 가중치 로딩 및 불필요한 모델 의존 방지 |
| `src/inference.py` | 공통 이진 판정과 두 클래스 확률 반환 | 말벌 단독·혼합을 같은 양성 결과로 표현 |
| `predict.py` | 파일·모델·임계값·시작 위치 CLI 인자 제공 | 코드 편집 없이 음원 추론 확인 |
| `tests/test_binary_model.py` | 판정·누수·WAV·모델 학습 및 추론 테스트 | 구조 변경으로 생길 수 있는 오류 확인 |

검증 명령(저장소 루트):

```powershell
.venv/Scripts/python.exe -m unittest discover -s ai_model/tests -v
```

테스트의 합성 신호는 코드 동작 확인용이다. 실제 말벌 인식 성능을 나타내지 않는다.
딥러닝 검사는 실제 구조로 1회 학습하되 MobileNetV2의 다운로드를 피하기 위해
검사에서만 ImageNet 가중치를 사용하지 않는다. 본 학습 노트북은 ImageNet 가중치를 사용한다.
