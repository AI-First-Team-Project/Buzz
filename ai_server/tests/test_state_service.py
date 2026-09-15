import sys
from copy import deepcopy
from pathlib import Path
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.services.state_service import advance_detection_state
from app.schemas import Probabilities
from app import store
from app.store import apply_prediction, get_site, list_history, set_door


class StateServiceTest(unittest.TestCase):
    def setUp(self):
        self.original_sites = deepcopy(store._sites)
        self.original_history = deepcopy(store._history)
        for function in ("safe_save_history_events", "safe_save_site_runtime_state"):
            patcher = patch.object(store, function)
            patcher.start()
            self.addCleanup(patcher.stop)

    def tearDown(self):
        store._sites.clear()
        store._sites.update(self.original_sites)
        store._history[:] = self.original_history

    def test_first_wasp_prediction_enters_danger(self):
        decision = advance_detection_state("NORMAL", "wasp", 0, 0)
        self.assertEqual((decision.status, decision.consecutive_wasp, decision.transition), ("DANGER", 1, "danger"))

    def test_non_wasp_interrupts_wasp_streak(self):
        decision = advance_detection_state("NORMAL", "non_wasp", 1, 0)
        self.assertEqual(decision.status, "NORMAL")
        self.assertEqual(decision.consecutive_wasp, 0)
        self.assertEqual(decision.consecutive_non_wasp, 1)

    def test_three_consecutive_non_wasp_predictions_recover(self):
        decision = advance_detection_state("DANGER", "non_wasp", 1, 0)
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
        site = apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-1")
        self.assertEqual(site["status"], "DANGER")
        self.assertEqual(site["door_status"], "CLOSED")
        self.assertTrue(site["auto_closed"])
        self.assertEqual(site["latest_analysis_id"], "analysis-1")
        event_count = len(list_history())

        apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-2")
        self.assertEqual(len(list_history()), event_count)

        site = set_door(1, "open")
        self.assertEqual(site["status"], "DANGER")
        self.assertEqual(site["door_status"], "OPEN")
        site = apply_prediction(1, "wasp", 0.9, probabilities, now, "analysis-3")
        self.assertEqual(site["door_status"], "CLOSED")
        self.assertEqual(list_history()[0]["action"], "자동 재폐쇄")

        safe_probabilities = Probabilities(non_wasp=0.9, wasp=0.1)
        for number in range(1, 4):
            site = apply_prediction(1, "non_wasp", 0.9, safe_probabilities, now, f"recovery-{number}")
        self.assertEqual(site["status"], "NORMAL")
        self.assertEqual(site["door_status"], "OPEN")
        self.assertFalse(site["auto_closed"])
        self.assertEqual(list_history()[0]["type"], "recovery")
        self.assertTrue(any(event["action"] == "자동 개방" for event in list_history()))

    def test_manually_closed_door_stays_closed_on_recovery(self):
        now = datetime.now(timezone.utc)
        set_door(1, "close")
        danger = apply_prediction(1, "wasp", 0.9, Probabilities(non_wasp=.1, wasp=.9), now, "manual-closed-danger")
        self.assertFalse(danger["auto_closed"])
        for number in range(3):
            recovered = apply_prediction(1, "non_wasp", 0.9, Probabilities(non_wasp=.9, wasp=.1), now, f"manual-closed-recovery-{number}")
        self.assertEqual((recovered["status"], recovered["door_status"]), ("NORMAL", "CLOSED"))
        self.assertFalse(any(event["action"] == "자동 개방" for event in list_history()))

    def test_manual_close_during_danger_cancels_automatic_reopen(self):
        now = datetime.now(timezone.utc)
        danger = apply_prediction(1, "wasp", 0.9, Probabilities(non_wasp=.1, wasp=.9), now, "auto-closed-danger")
        self.assertTrue(danger["auto_closed"])
        self.assertFalse(set_door(1, "close")["auto_closed"])
        for number in range(3):
            recovered = apply_prediction(1, "non_wasp", 0.9, Probabilities(non_wasp=.9, wasp=.1), now, f"manual-override-recovery-{number}")
        self.assertEqual((recovered["status"], recovered["door_status"]), ("NORMAL", "CLOSED"))


if __name__ == "__main__":
    unittest.main()
