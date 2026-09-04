'''
실제 WAV 넣어서 추론 테스트
'''

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

    audio_path = 'audio/test.wav'

    # =========================
    # 추론 방식
    # =========================

    # Ensemble 사용 시:
    # inference_type = 'ensemble'
    # model_name = None

    inference_type = 'single'
    model_name = 'CRNN'

    # =========================
    # 분석
    # =========================

    result = analyze_audio(
        audio_path = audio_path,
        models = models,
        inference_type = inference_type,
        model_name = model_name
    )

    # =========================
    # 결과 출력
    # =========================

    print('===== 분석 결과 =====')
    print('사용 모델 : ', result['model'])
    print('예측 결과 : ', result['prediction'])
    print(f"신뢰도 : {result['confidence']:.4f}")
    print('클래스 확률 : ')
    for class_name, probability in result['probilities'].items():
        print(f'{class_name} : {probability:.4f}')

    print()
    print('===== UI 데이터 =====')
    print('Waveform points : ', len(result['waveform']['time']))
    print('FFT points : ', len(result['fft']['frequency']))
    print('Spectrogram shape : ', len(result['spectrogram']['frequency']),
          'x',
          len(result['spectrogram']['time']))

    if __name__ == '__main__':
        main()