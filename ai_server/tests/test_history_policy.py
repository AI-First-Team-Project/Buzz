import sys
import unittest
from pathlib import Path
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from unittest.mock import Mock, patch
from copy import deepcopy

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import database, store
from app.schemas import Probabilities


class RecordingPolicyTest(unittest.TestCase):
    def attempt(self, age, force=False, kind="simulation", existing=None, fail=False):
        now = datetime(2026, 9, 11, 12)
        cursor = Mock(lastrowid=42)
        answers = [] if kind == "test" else [(None if age is None else now - timedelta(seconds=age), now)]
        answers.append(existing)
        cursor.fetchone.side_effect = answers
        connection = Mock()
        connection.cursor.return_value = cursor
        if fail:
            def execute(sql, args=None):
                if "INSERT INTO detection_events" in sql:
                    raise RuntimeError("database unavailable")
            cursor.execute.side_effect = execute
        result = NS(analysis_id="a", prediction=NS(label="non_wasp", confidence=.9, probabilities=NS(wasp=.1, non_wasp=.9)),
                    audio=NS(file_name="chunk.wav", sample_rate=24000, duration=2), meta=NS(model_name="CNN", source="auto_detection", timestamp=now))
        with patch.object(database, "get_db_connection", return_value=connection), patch.object(database, "_ensure_history_tables"):
            if fail:
                with self.assertRaises(RuntimeError):
                    database.save_detection_result(site_id=1, file_path=None, result=result, analysis_type=kind, force_record=force)
                value = None
            else:
                value = database.save_detection_result(site_id=1, file_path=None, result=result, analysis_type=kind, force_record=force)
        statements = [call.args[0] for call in cursor.execute.call_args_list]
        return value, statements, connection

    def test_history_uses_persisted_events_after_memory_reset(self):
        from app.routers import monitoring
        event = {"id": "persisted", "timestamp": "2026-09-11T12:00:00+00:00", "type": "danger"}
        with patch.object(monitoring, "db_enabled", return_value=True), patch.object(monitoring, "list_status_history", return_value=[event]), patch.object(monitoring, "list_history", return_value=[]):
            self.assertEqual(monitoring.history(100), [event])
        with patch.object(monitoring, "db_enabled", return_value=True), patch.object(monitoring, "list_status_history", return_value=[event]), patch.object(monitoring, "list_history", return_value=[event]):
            self.assertEqual(monitoring.history(100), [event])

    def test_first_sample_and_five_minute_boundary(self):
        for age, expected in [(None, 42), (2, None), (299, None), (300, 42), (601, 42)]:
            with self.subTest(age=age):
                value, sql, connection = self.attempt(age)
                self.assertEqual(value, expected)
                self.assertEqual(any("UPDATE analysis_record_schedule" in q for q in sql), expected is not None)

    def test_transition_saves_without_resetting_periodic_schedule(self):
        value, sql, _ = self.attempt(20, force=True)
        self.assertEqual(value, 42)
        self.assertFalse(any("UPDATE analysis_record_schedule" in q for q in sql))

    def test_overlapping_transition_and_periodic_save_once(self):
        _, sql, _ = self.attempt(300, force=True)
        self.assertEqual(sum("INSERT INTO detection_events" in q for q in sql), 1)

    def test_duplicate_analysis_does_not_insert(self):
        value, sql, _ = self.attempt(300, force=True, existing=(42,))
        self.assertEqual(value, 42)
        self.assertFalse(any("INSERT INTO detection_events" in q for q in sql))

    def test_failed_save_does_not_advance_schedule(self):
        _, sql, connection = self.attempt(300, fail=True)
        connection.rollback.assert_called_once()
        self.assertFalse(any("UPDATE analysis_record_schedule" in q for q in sql))

    def test_file_test_bypasses_sampling(self):
        value, sql, _ = self.attempt(2, kind="test")
        self.assertEqual(value, 42)
        self.assertFalse(any("analysis_record_schedule" in q for q in sql))

    def test_transition_events_persist_but_repeated_state_does_not(self):
        saved_sites, saved_history = deepcopy(store._sites), deepcopy(store._history)
        try:
            store._sites[1].update(status="NORMAL", door_status="OPEN", consecutive_wasp=0, consecutive_non_wasp=0)
            with patch.object(store, "safe_save_history_events") as save:
                for i in range(4):
                    store.apply_prediction(1, "wasp", .9, Probabilities(wasp=.9, non_wasp=.1), datetime.now(timezone.utc), str(i))
                self.assertEqual(save.call_count, 1)
                self.assertEqual([v["type"] for v in save.call_args.args[0]], ["danger", "gate"])
                store.set_door(1, "close")
                self.assertEqual(save.call_count, 1)
                for i in range(3):
                    store.apply_prediction(1, "non_wasp", .9, Probabilities(wasp=.1, non_wasp=.9), datetime.now(timezone.utc), str(i+4))
                self.assertEqual(save.call_count, 2)
                self.assertEqual(save.call_args.args[0][0]["type"], "recovery")
        finally:
            store._sites.clear(); store._sites.update(saved_sites)
            store._history[:] = saved_history

if __name__ == "__main__":
    unittest.main()
