'''
실제 WAV 넣어서 추론 테스트
'''

import argparse
import time
from src.config import WASP_THRESHOLD
from src.model_loader import load_models
from src.inference import analyze_audio

def main():
    # =========================
    # 모델 로드
    # =========================

    parser = argparse.ArgumentParser(description='2초 구간의 말벌 포함 여부 이진분류')
    parser.add_argument('audio_path', help='분석할 음원 경로')
    parser.add_argument('--model', default='MobileNetV2',
                        choices=['CNN', 'MobileNetV2', 'CRNN', 'RandomForest', 'LightGBM', 'XGBoost'])
    parser.add_argument('--ensemble', action='store_true', help='6개 모델 확률 평균')
    parser.add_argument('--threshold', type=float, default=WASP_THRESHOLD)
    parser.add_argument('--offset', type=float, default=0.0, help='분석 시작 위치(초)')
    args = parser.parse_args()
    models = load_models(None if args.ensemble else [args.model])

    # =========================
    # 테스트할 오디오 파일
    # =========================

    audio_path = args.audio_path

    # =========================
    # 추론 방식
    # =========================

    # Ensemble 사용 시:
    # inference_type = 'ensemble' / 'single'
    # model_name = None / 'CNN', 'MobileNetV2', 'CRNN', 'RandomForest', 'LightGBM', 'XGBoost'

    inference_type = 'ensemble' if args.ensemble else 'single'
    model_name = None if args.ensemble else args.model

    # =========================
    # 분석
    # =========================

    start_time = time.perf_counter()

    result = analyze_audio(
        audio_path = audio_path,
        models = models,
        inference_type = inference_type,
        model_name = model_name,
        threshold = args.threshold,
        offset = args.offset,
    )

    elapsed_time = time.perf_counter() - start_time

    # =========================
    # 결과 출력
    # =========================

    print('===== 분석 결과 =====')
    print('사용 모델 : ', result['meta']['modelName'])
    print('예측 결과 : ', result['prediction']['label'])
    print('말벌 포함 : ', result['prediction']['label'] == 'wasp')
    print('말벌 판정 임계값 : ', result['meta']['waspThreshold'])
    print(f"신뢰도 : {result['prediction']['confidence']:.4f}")
    print(f'분석 시간 : {elapsed_time:.4f}초')
    print('클래스 확률 : ')
    for class_name, probability in result['prediction']['probabilities'].items():
        print(f'{class_name} : {probability:.4f}')

    print()
    print('===== UI 데이터 =====')
    print('Waveform points : ', len(result['waveform']['time']))
    print('FFT points : ', len(result['fft']['frequency']))
    print('Spectrogram shape : ', len(result['spectrogram']['frequency']),
          'x',
          len(result['spectrogram']['time']))

    print()
    print('===== 처리 시간 =====')
    print(f"오디오 로딩/전처리  : {result['timing']['audio']:.4f}초")
    print(f"모델 추론           : {result['timing']['inference']:.4f}초")
    print(f"UI 데이터 생성      : {result['timing']['visualization']:.4f}초")
    print(f"전체 분석           : {result['timing']['total']:.4f}초")

if __name__ == '__main__':
    main()
