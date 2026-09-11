import sys
from pathlib import Path
import unittest
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.services.state_service import advance_detection_state
from app.schemas import Probabilities
from app.store import apply_prediction, get_site, list_history, set_door


class StateServiceTest(unittest.TestCase):
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
