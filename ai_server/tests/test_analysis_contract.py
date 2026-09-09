"""Run: .venv/Scripts/python.exe -m unittest discover -s ai_server/tests

Actual WAV decoding and FastAPI serialization; temporary upload storage is in memory.
No trained model is selected or loaded by this contract test.
"""
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))
from app.main import app
from app.config import AI_MODEL_NAME
from app.schemas import PredictionInfo
from app.services.predictor import predict_audio


class AnalysisContractTest(unittest.TestCase):
    def test_upload_response_and_app_adapter(self):
        with TestClient(app) as client:
            before = client.get('/api/status/3').json()
            buffer = io.BytesIO()
            y = .03 * np.sin(2 * np.pi * 440 * np.arange(24000) / 48000)
            sf.write(buffer, y, 48000, format='WAV')

            def save_in_memory(upload):
                result = io.BytesIO(upload.file.read())
                result.name = upload.filename
                return result

            with patch('app.routers.analysis._save_upload', side_effect=save_in_memory):
                response = client.post('/api/test/analyze', files={'file': ('test.wav', buffer.getvalue(), 'audio/wav')})
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()
            self.assertEqual(data['audio'], {'fileName': 'test.wav', 'sampleRate': 24000, 'duration': 2.0})
            self.assertIn(data['prediction']['label'], ('non_wasp', 'wasp'))
            self.assertEqual(set(data['prediction']['probabilities']), {'non_wasp', 'wasp'})
            self.assertAlmostEqual(sum(data['prediction']['probabilities'].values()), 1.0, places=5)
            self.assertEqual(data['meta']['modelName'], AI_MODEL_NAME)
            self.assertEqual(len(data['waveform']['time']), len(data['waveform']['amplitude']))
            self.assertEqual(len(data['waveform']['time']), 1500)
            self.assertEqual(len(data['fft']['frequency']), len(data['fft']['magnitudeDb']))
            self.assertEqual(np.asarray(data['spectrogram']['db']).shape, (128, 96))
            self.assertEqual(np.asarray(data['mfcc']['coefficients']).shape, (20, 96))
            self.assertEqual(before, client.get('/api/status/3').json())
            self.assertEqual(client.post('/api/test/analyze').status_code, 422)
            self.assertEqual(client.post('/api/test/analyze', files={'file': ('bad.txt', b'bad')}).status_code, 400)

    def test_model_return_matches_prediction_schema(self):
        buffer = io.BytesIO()
        sf.write(buffer, np.zeros(48000, dtype=np.float32), 24000, format='WAV')
        buffer.seek(0)
        result = predict_audio(buffer)
        prediction = PredictionInfo.model_validate(result['prediction'])
        self.assertIn(prediction.label, ('non_wasp', 'wasp'))
        self.assertEqual(result['meta']['modelName'], AI_MODEL_NAME)


if __name__ == '__main__':
    unittest.main()
