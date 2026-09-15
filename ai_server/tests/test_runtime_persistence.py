import json
import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from ai_server.app import database, store
from ai_server.app.schemas import Probabilities


class RuntimePersistenceTest(unittest.TestCase):
    def test_runtime_snapshot_round_trip(self):
        connection = Mock()
        cursor = connection.cursor.return_value
        site = {"site_id": 2, "site_name": "사업장 2", "status": "DANGER",
                "detected_class": "wasp", "confidence": .9,
                "probabilities": Probabilities(non_wasp=.1, wasp=.9),
                "door_status": "CLOSED", "auto_closed": True, "last_analysis_time": datetime.now(timezone.utc),
                "latest_analysis_id": "a", "consecutive_wasp": 1, "consecutive_non_wasp": 0}
        with patch.object(database, "get_db_connection", return_value=connection):
            database.save_site_runtime_state(site)
            saved = json.loads(cursor.execute.call_args_list[-1].args[1][1])
            self.assertEqual(saved["status"], "DANGER")
            self.assertEqual(saved["door_status"], "CLOSED")
            self.assertTrue(saved["auto_closed"])
            cursor.fetchall.return_value = [{"state_json": json.dumps(saved)}]
            self.assertEqual(database.list_site_runtime_states()[0]["site_id"], 2)

    def test_restore_keeps_danger_and_closed(self):
        original = store.get_site(1)
        saved = dict(original, status="DANGER", door_status="CLOSED", auto_closed=True, detected_class="wasp",
                     confidence=.9, probabilities={"non_wasp":.1,"wasp":.9},
                     consecutive_wasp=1, consecutive_non_wasp=0)
        if saved["last_analysis_time"]:
            saved["last_analysis_time"] = saved["last_analysis_time"].isoformat()
        try:
            store.restore_sites([saved])
            restored = store.get_site(1)
            self.assertEqual((restored["status"], restored["door_status"]), ("DANGER", "CLOSED"))
            self.assertTrue(restored["auto_closed"])
            legacy = dict(saved)
            legacy.pop("auto_closed")
            store.restore_sites([legacy])
            self.assertFalse(store.get_site(1)["auto_closed"])
        finally:
            clean = dict(original)
            clean["probabilities"] = original["probabilities"].model_dump()
            if clean["last_analysis_time"]:
                clean["last_analysis_time"] = clean["last_analysis_time"].isoformat()
            store.restore_sites([clean])


if __name__ == "__main__": unittest.main()
