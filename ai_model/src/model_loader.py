'''
.keras / .pkl 파일 로딩
'''

import joblib
import tensorflow as tf

from .config import MODEL_DIR

CNN_MODEL_PATH = MODEL_DIR / 'cnn.keras'
MOBILENET_MODEL_PATH = MODEL_DIR / 'mobilenetv2.keras'
CRNN_MODEL_PATH = MODEL_DIR / 'crnn.keras'

RF_MODEL_PATH = MODEL_DIR / 'randomforest.pkl'
LGBM_MODEL_PATH = MODEL_DIR / 'lightgbm.pkl'
XGB_MODEL_PATH = MODEL_DIR / 'xgboost.pkl'

'''
저장된 딥러닝 / 머신러닝 모델을 로드
'''
def load_models():
    cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
    mobilenet_model = tf.keras.models.load_model(MOBILENET_MODEL_PATH)
    crnn_model = tf.keras.models.load_model(CRNN_MODEL_PATH)
    rf_model = joblib.load(RF_MODEL_PATH)
    lgbm_model = joblib.load(LGBM_MODEL_PATH)
    xgb_model = joblib.load(XGB_MODEL_PATH)

    return {
        'CNN': cnn_model,
        'MobileNetV2': mobilenet_model,
        'CRNN': crnn_model,
        'RandomForest': rf_model,
        'LightGBM': lgbm_model,
        'XGBoost': xgb_model
    }