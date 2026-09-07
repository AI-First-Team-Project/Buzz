"""Run: .venv/Scripts/python.exe -m unittest discover -s ai_server/tests

Actual WAV decoding and FastAPI serialization; temporary upload storage is in memory.
No trained model is selected or loaded by this contract test.
"""
import ast
import io
import json
from pathlib import Path
import subprocess
import sys
import time
import unittest
from unittest.mock import patch

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))
from app.main import app
from app.schemas import PredictionInfo


class AnalysisContractTest(unittest.TestCase):
    def test_upload_response_and_app_adapter(self):
        with TestClient(app) as client:
            before = client.get('/api/status/3').json()
            for label in ('wasp', 'bee', 'other'):
                buffer = io.BytesIO()
                y = .03 * np.sin(2 * np.pi * 440 * np.arange(24000) / 48000)
                sf.write(buffer, y, 48000, format='WAV')

                def save_in_memory(upload):
                    result = io.BytesIO(upload.file.read())
                    result.name = upload.filename
                    return result

                with patch('app.routers.analysis._save_upload', side_effect=save_in_memory):
                    response = client.post('/api/test/analyze', files={'file': (label + '.wav', buffer.getvalue(), 'audio/wav')})
                self.assertEqual(response.status_code, 200, response.text)
                data = response.json()
                self.assertEqual(data['audio'], {'fileName': label + '.wav', 'sampleRate': 24000, 'duration': 2.0})
                self.assertEqual(data['prediction']['label'], label)
                self.assertEqual(data['meta']['modelName'], 'mock-placeholder')
                self.assertEqual(len(data['waveform']['time']), len(data['waveform']['amplitude']))
                self.assertEqual(len(data['waveform']['time']), 1500)
                self.assertEqual(len(data['fft']['frequency']), len(data['fft']['magnitudeDb']))
                self.assertEqual(np.asarray(data['spectrogram']['db']).shape, (128, 96))
                self.assertEqual(np.asarray(data['mfcc']['coefficients']).shape, (20, 96))
                # Feed the real API JSON to the same JS adapter that the app uses.
                checked = subprocess.run(['node', str(ROOT / 'android-app/scripts/check-analysis-contract.mjs')],
                                         input=json.dumps(data), text=True, capture_output=True)
                self.assertEqual(checked.returncode, 0, checked.stderr)
            self.assertEqual(before, client.get('/api/status/3').json())
            self.assertEqual(client.post('/api/test/analyze').status_code, 422)
            self.assertEqual(client.post('/api/test/analyze', files={'file': ('bad.txt', b'bad')}).status_code, 400)

    def test_model_return_matches_prediction_schema(self):
        # Exercise the actual public return assembly with a deterministic model result.
        # Heavy training dependencies are irrelevant to the transport contract.
        tree = ast.parse((ROOT / 'ai_model/src/inference.py').read_text(encoding='utf-8'))
        function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'analyze_audio')
        ns = {'time': time, 'SR': 24000, 'DURATION': 2.0, 'CLASSES': ['wasp', 'bee', 'other'],
              'load_audio_file': lambda *a, **kw: (np.zeros(48000), 24000),
              'predict_with_single_model': lambda *a: {'prediction': 'wasp', 'confidence': .8, 'probabilities': [.8, .1, .1]},
              'create_audio_visualization_data': lambda *a: {}}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'inference', 'exec'), ns)
        result = ns['analyze_audio']('unused.wav', {}, 'single', 'test-model')
        prediction = PredictionInfo.model_validate(result['prediction'])
        self.assertEqual(prediction.label, 'wasp')
        self.assertEqual(result['meta']['modelName'], 'test-model')


if __name__ == '__main__':
    unittest.main()
