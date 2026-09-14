import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.database import list_site_runtime_states, save_site_runtime_state
from app.schemas import Probabilities


class RuntimePersistenceTest(unittest.TestCase):
    def test_existing_state_json_schema_saves_and_loads_snapshot(self):
        connection = Mock()
        cursor = connection.cursor.return_value
        site = {
            "site_id": 2,
            "status": "DANGER",
            "door_status": "CLOSED",
            "probabilities": Probabilities(non_wasp=0.1, wasp=0.9),
            "last_analysis_time": datetime.now(timezone.utc),
        }

        with patch("app.database.get_db_connection", return_value=connection):
            save_site_runtime_state(site)
            insert = cursor.execute.call_args_list[-1]
            self.assertIn("state_json", insert.args[0])
            self.assertIn("updated_at", insert.args[0])
            saved = json.loads(insert.args[1][1])
            self.assertEqual(saved["status"], "DANGER")
            self.assertEqual(saved["door_status"], "CLOSED")
            self.assertEqual(saved["probabilities"]["wasp"], 0.9)

            cursor.fetchall.return_value = [{"site_id": 2, "state_json": json.dumps(saved)}]
            self.assertEqual(list_site_runtime_states(), [saved])
            self.assertIn("state_json", cursor.execute.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
