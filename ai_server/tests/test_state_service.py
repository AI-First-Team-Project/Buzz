import sys
from pathlib import Path
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.services.state_service import advance_detection_state
from app.main import app
from app.schemas import Probabilities
from app.store import apply_prediction, get_site, list_history, restore_sites, set_door


class StateServiceTest(unittest.TestCase):
    def test_startup_loads_saved_status_before_first_request(self):
        original = get_site(2)
        saved = {
            **original,
            "status": "DANGER",
            "door_status": "CLOSED",
            "detected_class": "wasp",
            "confidence": 0.9,
            "probabilities": {"non_wasp": 0.1, "wasp": 0.9},
            "last_analysis_time": datetime.now(timezone.utc).isoformat(),
            "consecutive_wasp": 3,
        }
        try:
            with (
                patch("app.main.db_enabled", return_value=True),
                patch("app.main.list_site_records", return_value=[{"id": 2, "name": "사업장 2"}]),
                patch("app.main.list_site_runtime_states", return_value=[saved]),
                TestClient(app) as client,
            ):
                status = client.get("/api/status/2")
                self.assertEqual(status.status_code, 200, status.text)
                self.assertEqual(status.json()["status"], "DANGER")
                self.assertEqual(status.json()["door_status"], "CLOSED")
        finally:
            original["probabilities"] = original["probabilities"].model_dump()
            original["last_analysis_time"] = (
                original["last_analysis_time"].isoformat()
                if original["last_analysis_time"] else None
            )
            restore_sites([original])

    def test_runtime_state_survives_restore_and_keeps_detection_streak(self):
        def stored(site):
            payload = deepcopy(site)
            payload["probabilities"] = site["probabilities"].model_dump()
            if site["last_analysis_time"] is not None:
                payload["last_analysis_time"] = site["last_analysis_time"].isoformat()
            return payload

        original = stored(get_site(2))
        snapshots = []
        probabilities = Probabilities(non_wasp=0.1, wasp=0.9)
        now = datetime.now(timezone.utc)
        try:
            with (
                patch("app.store.safe_save_site_runtime_state", side_effect=lambda site: snapshots.append(stored(site))),
                patch("app.store.safe_save_history_events"),
            ):
                restore_sites([original])
                apply_prediction(2, "wasp", 0.9, probabilities, now, "restore-1")
                apply_prediction(2, "wasp", 0.9, probabilities, now, "restore-2")
                self.assertEqual(snapshots[-1]["consecutive_wasp"], 2)

                restore_sites([original])
                restore_sites([snapshots[-1]])
                self.assertEqual(get_site(2)["consecutive_wasp"], 2)
                apply_prediction(2, "wasp", 0.9, probabilities, now, "restore-3")
                self.assertEqual(get_site(2)["status"], "DANGER")
                self.assertEqual(get_site(2)["door_status"], "CLOSED")

                danger_snapshot = snapshots[-1]
                restore_sites([original])
                restore_sites([danger_snapshot])
                self.assertEqual(get_site(2)["status"], "DANGER")
                self.assertEqual(get_site(2)["door_status"], "CLOSED")

                set_door(2, "open")
                restore_sites([original])
                restore_sites([snapshots[-1]])
                self.assertEqual(get_site(2)["door_status"], "OPEN")
        finally:
            restore_sites([original])

    def test_three_consecutive_wasp_predictions_enter_danger(self):
        decision = advance_detection_state("NORMAL", "wasp", 0, 0)
        self.assertEqual((decision.status, decision.consecutive_wasp, decision.transition), ("NORMAL", 1, None))
        decision = advance_detection_state(decision.status, "wasp", decision.consecutive_wasp, decision.consecutive_non_wasp)
        self.assertEqual((decision.status, decision.consecutive_wasp, decision.transition), ("NORMAL", 2, None))
        decision = advance_detection_state(decision.status, "wasp", decision.consecutive_wasp, decision.consecutive_non_wasp)
        self.assertEqual((decision.status, decision.consecutive_wasp, decision.transition), ("DANGER", 3, "danger"))

    def test_non_wasp_interrupts_wasp_streak(self):
        decision = advance_detection_state("NORMAL", "non_wasp", 2, 0)
        self.assertEqual(decision.status, "NORMAL")
        self.assertEqual(decision.consecutive_wasp, 0)
        self.assertEqual(decision.consecutive_non_wasp, 1)

    def test_three_consecutive_non_wasp_predictions_recover(self):
        decision = advance_detection_state("DANGER", "non_wasp", 3, 0)
        self.assertEqual((decision.status, decision.transition), ("DANGER", None))
        decision = advance_detection_state(decision.status, "non_wasp", decision.consecutive_wasp, decision.consecutive_non_wasp)
        self.assertEqual((decision.status, decision.transition), ("DANGER", None))
        decision = advance_detection_state(decision.status, "non_wasp", decision.consecutive_wasp, decision.consecutive_non_wasp)
        self.assertEqual((decision.status, decision.consecutive_non_wasp, decision.transition), ("NORMAL", 3, "recovery"))

    def test_wasp_interrupts_recovery_streak(self):
        decision = advance_detection_state("DANGER", "wasp", 0, 2)
        self.assertEqual(decision.status, "DANGER")
        self.assertEqual(decision.consecutive_wasp, 1)
        self.assertEqual(decision.consecutive_non_wasp, 0)

    def test_store_transitions_once_and_closes_door(self):
        probabilities = Probabilities(non_wasp=0.1, wasp=0.9)
        now = datetime.now(timezone.utc)
        for number in range(1, 3):
            site = apply_prediction(1, "wasp", 0.9, probabilities, now, f"analysis-{number}")
            self.assertEqual(site["status"], "NORMAL")
            self.assertEqual(site["door_status"], "OPEN")

        site = apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-3")
        self.assertEqual(site["status"], "DANGER")
        self.assertEqual(site["door_status"], "CLOSED")
        self.assertEqual(site["latest_analysis_id"], "analysis-3")
        event_count = len(list_history())

        apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-4")
        self.assertEqual(len(list_history()), event_count)

        site = set_door(1, "open")
        self.assertEqual(site["status"], "DANGER")
        self.assertEqual(site["door_status"], "OPEN")
        site = apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-5")
        self.assertEqual(site["door_status"], "CLOSED")
        self.assertEqual(list_history()[0]["action"], "자동 재폐쇄")

        safe_probabilities = Probabilities(non_wasp=0.9, wasp=0.1)
        for number in range(1, 4):
            site = apply_prediction(1, "non_wasp", 0.9, safe_probabilities, now, f"recovery-{number}")
        self.assertEqual(site["status"], "NORMAL")
        self.assertEqual(site["door_status"], "CLOSED")
        self.assertEqual(list_history()[0]["type"], "recovery")


if __name__ == "__main__":
    unittest.main()
