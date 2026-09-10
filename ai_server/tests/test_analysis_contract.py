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
from app.services.analysis_service import create_visualization_response
from app.services.predictor import predict_audio, predict_audio_batch


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
            after = client.get('/api/status/3').json()
            before.pop('last_analysis_age_seconds', None)
            after.pop('last_analysis_age_seconds', None)
            self.assertEqual(before, after)
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

    def test_model_batch_preserves_every_input(self):
        audio_paths = []
        for frequency in (440, 880):
            buffer = io.BytesIO()
            y = .03 * np.sin(2 * np.pi * frequency * np.arange(48000) / 24000)
            sf.write(buffer, y, 24000, format='WAV')
            buffer.seek(0)
            audio_paths.append(buffer)

        results = predict_audio_batch(audio_paths)

        self.assertEqual(len(results), 2)
        for result in results:
            prediction = PredictionInfo.model_validate(result['prediction'])
            self.assertIn(prediction.label, ('non_wasp', 'wasp'))
            self.assertAlmostEqual(
                prediction.probabilities.non_wasp + prediction.probabilities.wasp,
                1.0,
                places=5,
            )

    def test_batch_endpoint_preserves_site_mapping(self):
        buffer = io.BytesIO()
        y = .03 * np.sin(2 * np.pi * 440 * np.arange(48000) / 24000)
        sf.write(buffer, y, 24000, format='WAV')
        wav_bytes = buffer.getvalue()

        def save_in_memory(upload):
            result = io.BytesIO(upload.file.read())
            result.name = upload.filename
            return result

        with TestClient(app) as client:
            with (
                patch('app.routers.analysis._save_upload', side_effect=save_in_memory),
                patch('app.routers.analysis.apply_prediction') as apply_prediction,
            ):
                response = client.post(
                    '/api/auto/analyze-batch',
                    data={'site_ids': ['1', '2', '3']},
                    files=[
                        ('files', (f'site{site_id}.wav', wav_bytes, 'audio/wav'))
                        for site_id in (1, 2, 3)
                    ],
                )
            with patch(
                'app.routers.analysis.create_visualization_response',
                wraps=create_visualization_response,
            ) as create_visualization:
                latest_response = client.get('/api/analysis/latest/1')
                cached_response = client.get('/api/analysis/latest/1')

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([item['siteId'] for item in response.json()], [1, 2, 3])
        self.assertEqual(apply_prediction.call_count, 3)
        self.assertEqual(latest_response.status_code, 200, latest_response.text)
        self.assertEqual(cached_response.status_code, 200, cached_response.text)
        self.assertEqual(create_visualization.call_count, 1)
        latest = latest_response.json()
        self.assertEqual(latest['analysisId'], response.json()[0]['analysis']['analysisId'])
        self.assertEqual(len(latest['waveform']['amplitude']), 1500)
        self.assertEqual(np.asarray(latest['spectrogram']['db']).shape, (128, 96))
        self.assertNotIn('mfcc', latest)
        self.assertEqual(latest, cached_response.json())
        self.assertEqual(latest_response.headers.get('content-encoding'), 'gzip')

    def test_status_list_contains_three_worker_states(self):
        with TestClient(app) as client:
            response = client.get('/api/status')

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual([site['site_id'] for site in data], [1, 2, 3])
        self.assertTrue(all(site['worker_status'] in ('WAITING', 'RUNNING', 'DEGRADED') for site in data))

    def test_door_command_is_visible_in_follow_up_status(self):
        with TestClient(app) as client:
            closed = client.post('/api/door/2', json={'action': 'close'})
            self.assertEqual(closed.status_code, 200, closed.text)
            self.assertEqual(closed.json()['door_status'], 'CLOSED')
            self.assertEqual(client.get('/api/status/2').json()['door_status'], 'CLOSED')

            opened = client.post('/api/door/2', json={'action': 'open'})
            self.assertEqual(opened.status_code, 200, opened.text)
            self.assertEqual(opened.json()['door_status'], 'OPEN')
            self.assertEqual(client.get('/api/status/2').json()['door_status'], 'OPEN')


if __name__ == '__main__':
    unittest.main()
