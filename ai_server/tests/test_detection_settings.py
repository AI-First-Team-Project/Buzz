import unittest
from unittest.mock import patch

from ai_server.app.detection_settings import get_settings, set_settings
from ai_server.app.routers.settings import DetectionSettingsUpdate, update_settings


class DetectionSettingsTest(unittest.TestCase):
    def setUp(self): self.original = get_settings()
    def tearDown(self): set_settings(self.original)

    def test_auto_close_cannot_be_disabled(self):
        with self.assertRaises(Exception) as raised:
            update_settings(DetectionSettingsUpdate(auto_close=False))
        self.assertEqual(raised.exception.status_code, 422)

    def test_setting_is_saved_before_memory_changes(self):
        with patch("ai_server.app.routers.settings.db_enabled", return_value=True), \
             patch("ai_server.app.routers.settings.save_app_settings") as save, \
             patch("ai_server.app.routers.settings.reset_detection_streaks"):
            result = update_settings(DetectionSettingsUpdate(wasp_threshold_percent=81))
        save.assert_called_once()
        self.assertEqual(result["wasp_threshold_percent"], 81)
        self.assertTrue(result["auto_close"])


if __name__ == "__main__": unittest.main()
