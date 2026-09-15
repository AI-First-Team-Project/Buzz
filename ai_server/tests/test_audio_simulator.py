import sys
import asyncio
from pathlib import Path
import unittest
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from ai_server.app.config import DURATION_SEC, SAMPLE_RATE
from ai_server.app.workers.audio_simulator import (
    AnalysisJob,
    discover_audio_files,
    encode_wav,
    split_audio,
)


class AudioSimulatorTest(unittest.TestCase):
    def test_audio_files_are_filtered_and_sorted(self):
        directory = Path("site")
        files = [Path("b.wav"), Path("A.mp3"), Path("ignore.txt")]
        with (
            patch.object(Path, "exists", return_value=True),
            patch.object(Path, "iterdir", return_value=iter(files)),
            patch.object(Path, "is_file", return_value=True),
        ):
            self.assertEqual(
                [path.name for path in discover_audio_files(directory)],
                ["A.mp3", "b.wav"],
            )

    def test_all_audio_is_split_and_final_chunk_is_padded(self):
        chunk_samples = int(SAMPLE_RATE * DURATION_SEC)
        source = np.arange(chunk_samples + 123, dtype=np.float32)

        chunks = [chunk for _, chunk, _, _ in split_audio(source)]

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0].size, chunk_samples)
        np.testing.assert_array_equal(chunks[0], source[:chunk_samples])
        np.testing.assert_array_equal(chunks[1][:123], source[chunk_samples:])
        self.assertTrue(np.all(chunks[1][123:] == 0))

    def test_resampling_zero_sample_does_not_create_silent_chunk(self):
        chunk_samples = int(SAMPLE_RATE * DURATION_SEC)
        source = np.ones(chunk_samples + 1, dtype=np.float32)
        source[-1] = 0
        self.assertEqual(len(list(split_audio(source))), 1)

        source[-1] = 0.5
        self.assertEqual(len(list(split_audio(source))), 2)
        self.assertEqual(len(list(split_audio(np.zeros(chunk_samples, dtype=np.float32)))), 1)

    def test_worker_upload_uses_chunk_specific_wav_name(self):
        audio = np.zeros(int(SAMPLE_RATE * DURATION_SEC), dtype=np.float32)
        job = AnalysisJob(2, Path("sample.mp3"), 4, 8.0, 10.0, encode_wav(audio))

        self.assertEqual(job.upload_name, "sample_part_00005.wav")
        self.assertTrue(job.wav_bytes.startswith(b"RIFF"))

if __name__ == "__main__":
    unittest.main()
