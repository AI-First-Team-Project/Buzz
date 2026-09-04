'''
실제 WAV 넣어서 추론 테스트
'''

import time
from src.model_loader import load_models
from src.inference import analyze_audio

def main():
    # =========================
    # 모델 로드
    # =========================

    models = load_models()

    # =========================
    # 테스트할 오디오 파일
    # =========================

    audio_path = 'audio/wasp/wasp_0010.wav'

    # =========================
    # 추론 방식
    # =========================

    # Ensemble 사용 시:
    # inference_type = 'ensemble' / 'single'
    # model_name = None / 'CNN', 'MobileNetV2', 'CRNN', 'RandomForest', 'LightGBM', 'XGBoost'

    inference_type = 'single'
    model_name = 'MobileNetV2'

    # =========================
    # 분석
    # =========================

    start_time = time.perf_counter()

    result = analyze_audio(
        audio_path = audio_path,
        models = models,
        inference_type = inference_type,
        model_name = model_name
    )

    elapsed_time = time.perf_counter() - start_time

    # =========================
    # 결과 출력
    # =========================

    print('===== 분석 결과 =====')
    print('사용 모델 : ', result['model'])
    print('예측 결과 : ', result['prediction'])
    print(f"신뢰도 : {result['confidence']:.4f}")
    print(f'분석 시간 : {elapsed_time:.4f}초')
    print('클래스 확률 : ')
    for class_name, probability in result['probabilities'].items():
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