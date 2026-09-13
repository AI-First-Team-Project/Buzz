"""Uploads must respect the size limit and leave no temporary files behind."""

from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ai_server"))

from app.main import app
from app import upload_storage


class UploadStorageTest(unittest.TestCase):
    def test_limit_is_checked_while_copying_and_partial_file_is_removed(self):
        with TemporaryDirectory(dir=upload_storage.UPLOAD_DIR) as directory, patch.object(
            upload_storage, "UPLOAD_DIR", Path(directory)
        ), patch.object(upload_storage, "MAX_UPLOAD_BYTES", 8), patch.object(
            upload_storage, "COPY_CHUNK_BYTES", 4
        ):
            with self.assertRaises(HTTPException) as raised:
                upload_storage.save_upload(UploadFile(file=BytesIO(b"123456789"), filename="sample.wav"))
            self.assertEqual(raised.exception.status_code, 413)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_batch_partial_upload_failure_removes_previous_file(self):
        with TemporaryDirectory(dir=upload_storage.UPLOAD_DIR) as directory, patch.object(
            upload_storage, "UPLOAD_DIR", Path(directory)
        ), patch.object(upload_storage, "MAX_UPLOAD_BYTES", 8), patch(
            "app.main.db_enabled", return_value=False
        ):
            with TestClient(app) as client:
                response = client.post(
                    "/api/auto/analyze-batch",
                    data={"site_ids": ["1", "2"]},
                    files=[
                        ("files", ("first.wav", b"1234", "audio/wav")),
                        ("files", ("second.wav", b"123456789", "audio/wav")),
                    ],
                )
            self.assertEqual(response.status_code, 413)
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
