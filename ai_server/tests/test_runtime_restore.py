"""The API must restore the last known state before serving status requests."""
import copy
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.main import app
import app.store as store
from app.schemas import Probabilities


class RuntimeRestoreTest(unittest.TestCase):
    def setUp(self):
        self.sites_patch = patch.object(store, "_sites", copy.deepcopy(store._sites))
        self.sites_patch.start()
        self.addCleanup(self.sites_patch.stop)
        history_patch = patch.object(store, "_history", copy.deepcopy(store._history))
        history_patch.start()
        self.addCleanup(history_patch.stop)

    def test_danger_and_closed_gate_survive_api_restart(self):
        detected_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        snapshot = {
            3: {
                "status": "DANGER",
                "door_status": "CLOSED",
                "detected_class": "wasp",
                "confidence": 0.94,
                "probabilities": {"wasp": 0.94, "non_wasp": 0.06},
                "last_analysis_time": detected_at,
                "latest_analysis_id": "before-restart",
                "consecutive_wasp": 3,
                "consecutive_non_wasp": 0,
            }
        }
        with patch("app.main.db_enabled", return_value=True), patch(
            "app.main.load_site_runtime_states", return_value=snapshot
        ):
            with TestClient(app) as client:
                response = client.get("/api/status/3")

        self.assertEqual(response.status_code, 200)
        site = response.json()
        self.assertEqual((site["status"], site["door_status"]), ("DANGER", "CLOSED"))
        self.assertEqual(site["latest_analysis_id"], "before-restart")
        self.assertEqual(site["worker_status"], "DEGRADED")

    def test_unavailable_database_prevents_default_status_from_being_served(self):
        with patch("app.main.db_enabled", return_value=True), patch(
            "app.main.load_site_runtime_states", side_effect=RuntimeError("database unavailable")
        ):
            with self.assertRaisesRegex(RuntimeError, "database unavailable"):
                with TestClient(app):
                    pass

    def test_each_detection_and_manual_gate_change_is_snapshotted(self):
        now = datetime.now(timezone.utc)
        with patch.object(store, "safe_save_site_runtime_state") as save, patch.object(
            store, "safe_save_history_events"
        ):
            store.apply_prediction(
                2, "wasp", 0.9, Probabilities(wasp=0.9, non_wasp=0.1), now, "new-analysis"
            )
            store.set_door(2, "close")

        self.assertEqual(save.call_count, 2)
        self.assertEqual(save.call_args.args[0]["door_status"], "CLOSED")
        self.assertEqual(save.call_args.args[0]["latest_analysis_id"], "new-analysis")


if __name__ == "__main__":
    unittest.main()
