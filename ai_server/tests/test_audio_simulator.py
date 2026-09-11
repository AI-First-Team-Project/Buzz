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
    collect_site_batch,
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

        chunks = list(split_audio(source))

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0].size, chunk_samples)
        np.testing.assert_array_equal(chunks[0], source[:chunk_samples])
        np.testing.assert_array_equal(chunks[1][:123], source[chunk_samples:])
        self.assertTrue(np.all(chunks[1][123:] == 0))

    def test_worker_upload_uses_chunk_specific_wav_name(self):
        audio = np.zeros(int(SAMPLE_RATE * DURATION_SEC), dtype=np.float32)
        job = AnalysisJob(2, Path("sample.mp3"), 4, encode_wav(audio))

        self.assertEqual(job.upload_name, "sample_part_00005.wav")
        self.assertTrue(job.wav_bytes.startswith(b"RIFF"))

    def test_batch_collects_one_chunk_for_each_site(self):
        async def collect():
            queues = {site_id: asyncio.Queue() for site_id in (1, 2, 3)}
            for site_id, queue in queues.items():
                await queue.put(AnalysisJob(site_id, Path(f"site{site_id}.wav"), 0, b"wav"))
            return await collect_site_batch(queues)

        jobs = asyncio.run(collect())

        self.assertEqual([job.site_id for job in jobs], [1, 2, 3])


if __name__ == "__main__":
    unittest.main()
