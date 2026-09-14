import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.database import load_app_settings, save_app_settings
from app.detection_settings import get_settings, get_wasp_threshold_percent, set_settings
from app.main import app
from app.services.predictor import predict_audio
from app.schemas import Probabilities
from app.store import apply_prediction, get_site, restore_sites


class DetectionSettingsTest(unittest.TestCase):
    def setUp(self):
        self.original = get_settings()

    def tearDown(self):
        set_settings(self.original)

    def test_api_threshold_changes_real_model_classification(self):
        with patch("app.routers.settings.db_enabled", return_value=False), TestClient(app) as client:
            self.assertEqual(client.put("/api/settings", json={"wasp_threshold_percent": 60}).status_code, 200)
            self.assertEqual(client.get("/api/settings").json()["wasp_threshold_percent"], 60)
            with (
                patch("app.services.predictor.load_audio_file", return_value=([], 24000)),
                patch("app.services.predictor.predict_with_single_model", return_value={"probabilities": [0.25, 0.75]}),
            ):
                self.assertEqual(predict_audio(Path("sample.wav"))["prediction"]["label"], "wasp")
                self.assertEqual(client.put("/api/settings", json={"wasp_threshold_percent": 90}).status_code, 200)
                self.assertEqual(predict_audio(Path("sample.wav"))["prediction"]["label"], "non_wasp")
            self.assertEqual(client.put("/api/settings", json={"wasp_threshold_percent": 59}).status_code, 422)
            self.assertEqual(client.get("/api/settings").json()["wasp_threshold_percent"], 90)

    def test_database_failure_does_not_claim_setting_was_saved(self):
        with (
            patch("app.routers.settings.db_enabled", return_value=True),
            patch("app.routers.settings.save_app_settings", side_effect=OSError("database unavailable")),
            TestClient(app) as client,
        ):
            response = client.put("/api/settings", json={"wasp_threshold_percent": 80})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(get_settings(), self.original)

    def test_startup_restores_saved_threshold(self):
        with (
            patch("app.main.db_enabled", return_value=True),
            patch("app.main.list_site_records", return_value=[]),
            patch("app.main.list_site_runtime_states", return_value=[]),
            patch("app.main.load_app_settings", return_value={"wasp_threshold_percent": 83, "wasp_alert": False}),
            TestClient(app) as client,
        ):
            self.assertEqual(client.get("/api/settings").json()["wasp_threshold_percent"], 83)
            self.assertFalse(client.get("/api/settings").json()["wasp_alert"])

    def test_database_round_trip_queries_use_saved_value(self):
        from unittest.mock import Mock
        connection = Mock()
        cursor = connection.cursor.return_value
        with patch("app.database.get_db_connection", return_value=connection):
            settings = {"wasp_threshold_percent": 85, "wasp_alert": False, "vibration": False, "auto_close": True}
            save_app_settings(settings)
            self.assertIn('"wasp_threshold_percent": 85', cursor.execute.call_args.args[1][0])
            cursor.fetchone.return_value = (settings,)
            self.assertEqual(load_app_settings(), settings)

    def test_changed_threshold_starts_new_three_detection_sequence(self):
        original = get_site(3)
        saved = dict(original)
        saved["probabilities"] = original["probabilities"].model_dump()
        saved["last_analysis_time"] = (
            original["last_analysis_time"].isoformat() if original["last_analysis_time"] else None
        )
        clean = dict(saved, status="NORMAL", door_status="OPEN", consecutive_wasp=0, consecutive_non_wasp=0)
        probabilities = Probabilities(non_wasp=0.2, wasp=0.8)
        now = datetime.now(timezone.utc)
        try:
            with (
                patch("app.routers.settings.db_enabled", return_value=False),
                patch("app.store.safe_save_site_runtime_state"),
                patch("app.store.safe_save_history_events"),
                TestClient(app) as client,
            ):
                restore_sites([clean])
                apply_prediction(3, "wasp", 0.8, probabilities, now, "before-1")
                apply_prediction(3, "wasp", 0.8, probabilities, now, "before-2")
                self.assertEqual(get_site(3)["consecutive_wasp"], 2)
                next_value = 80 if self.original["wasp_threshold_percent"] != 80 else 81
                self.assertEqual(client.put("/api/settings", json={"wasp_threshold_percent": next_value}).status_code, 200)
                self.assertEqual(get_site(3)["consecutive_wasp"], 0)
                for index in range(2):
                    apply_prediction(3, "wasp", 0.8, probabilities, now, f"after-{index}")
                self.assertEqual(get_site(3)["status"], "NORMAL")
                apply_prediction(3, "wasp", 0.8, probabilities, now, "after-3")
                self.assertEqual(get_site(3)["status"], "DANGER")
        finally:
            restore_sites([saved])

    def test_auto_close_toggle_controls_real_gate_and_closes_existing_danger(self):
        original = get_site(2)
        saved = dict(original)
        saved["probabilities"] = original["probabilities"].model_dump()
        saved["last_analysis_time"] = original["last_analysis_time"].isoformat() if original["last_analysis_time"] else None
        clean = dict(saved, status="NORMAL", door_status="OPEN", consecutive_wasp=0, consecutive_non_wasp=0)
        probabilities = Probabilities(non_wasp=0.1, wasp=0.9)
        try:
            with (
                patch("app.routers.settings.db_enabled", return_value=False),
                patch("app.routers.settings.safe_update_gate_status"),
                patch("app.store.safe_save_site_runtime_state"),
                patch("app.store.safe_save_history_events"),
                TestClient(app) as client,
            ):
                restore_sites([clean])
                self.assertEqual(client.put("/api/settings", json={"auto_close": False}).status_code, 200)
                for index in range(3):
                    apply_prediction(2, "wasp", 0.9, probabilities, datetime.now(timezone.utc), f"toggle-{index}")
                self.assertEqual(get_site(2)["status"], "DANGER")
                self.assertEqual(get_site(2)["door_status"], "OPEN")
                self.assertEqual(client.put("/api/settings", json={"auto_close": True}).status_code, 200)
                self.assertEqual(get_site(2)["door_status"], "CLOSED")
        finally:
            restore_sites([saved])


if __name__ == "__main__":
    unittest.main()
