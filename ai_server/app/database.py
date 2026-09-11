"""MySQL persistence helpers for Buzz.

DB errors are intentionally allowed to bubble from this module. Routers call the
safe_* wrappers below so audio analysis can continue even when MySQL is offline.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Literal

try:
    import mysql.connector as mysql_connector
except ImportError:  # requirements 설치 전에도 FastAPI 모듈 로드는 가능하게 한다.
    mysql_connector = None

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv() -> bool:
        return False

from .schemas import AnalysisResponse

load_dotenv()

logger = logging.getLogger("buzz.database")
AnalysisType = Literal["live", "test", "simulation"]


def db_enabled() -> bool:
    return os.getenv("BUZZ_DB_ENABLED", "true").lower() in {"1", "true", "yes", "on"}


def get_db_connection():
    if mysql_connector is None:
        raise RuntimeError(
            "mysql-connector-python이 설치되지 않았습니다. pip install -r ai_server/requirements.txt 를 실행하세요."
        )
    password = os.getenv("DB_PASSWORD")
    if password is None:
        raise RuntimeError("DB_PASSWORD 환경변수가 설정되지 않았습니다.")

    return mysql_connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=password,
        database=os.getenv("DB_NAME", "buzz"),
        connection_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
    )


def _json(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def save_detection_result(
    *,
    site_id: int | None,
    file_path: str | Path | None,
    result: AnalysisResponse,
    analysis_type: AnalysisType,
    expected_label: str | None = None,
) -> int:
    """Persist one AI analysis and its visualization data."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        predicted = result.prediction.label
        is_correct = None if expected_label is None else predicted == expected_label

        cursor.execute(
            """
            INSERT INTO detection_events (
                analysis_id, site_id, analysis_type,
                original_file_name, file_path, expected_label, prediction, is_correct,
                sample_rate, duration, confidence,
                wasp_probability, non_wasp_probability,
                model_name, source, detected_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s
            )
            """,
            (
                result.analysis_id,
                site_id,
                analysis_type,
                result.audio.file_name,
                str(file_path) if file_path is not None else None,
                expected_label,
                predicted,
                is_correct,
                result.audio.sample_rate,
                result.audio.duration,
                result.prediction.confidence,
                result.prediction.probabilities.wasp,
                result.prediction.probabilities.non_wasp,
                result.meta.model_name,
                result.meta.source,
                result.meta.timestamp,
            ),
        )
        detection_event_id = cursor.lastrowid

        # Batch simulator responses intentionally omit heavy visualization data.
        # Persist their detection event without manufacturing graph payloads.
        if all(hasattr(result, field) for field in ("waveform", "fft", "spectrogram", "mfcc")):
            cursor.execute(
                """
                INSERT INTO analysis_graph_data (
                    detection_event_id, waveform, fft, spectrogram, mfcc
                ) VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    detection_event_id,
                    _json(result.waveform.model_dump()),
                    _json(result.fft.model_dump(by_alias=True)),
                    _json(result.spectrogram.model_dump()),
                    _json(result.mfcc.model_dump()),
                ),
            )
        connection.commit()
        return int(detection_event_id)
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def safe_save_detection_result(**kwargs) -> int | None:
    """Best-effort persistence: DB failure must not break AI inference."""
    if not db_enabled():
        return None
    try:
        return save_detection_result(**kwargs)
    except Exception:
        logger.exception("MySQL 분석 로그 저장 실패")
        return None


def update_gate_status(site_id: int, status: Literal["open", "closed"]) -> None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO gate_status (site_id, status)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
            """,
            (site_id, status),
        )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def safe_update_gate_status(site_id: int, status: Literal["open", "closed"]) -> None:
    if not db_enabled():
        return
    try:
        update_gate_status(site_id, status)
    except Exception:
        logger.exception("MySQL 문 상태 저장 실패: site_id=%s", site_id)


def list_detection_events(limit: int = 100, analysis_type: str | None = None) -> list[dict]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        sql = """
            SELECT id, analysis_id, site_id, analysis_type, original_file_name,
                   expected_label, prediction, is_correct, confidence,
                   wasp_probability, non_wasp_probability, model_name, source,
                   detected_at
            FROM detection_events
        """
        values: list[object] = []
        if analysis_type:
            sql += " WHERE analysis_type = %s"
            values.append(analysis_type)
        sql += " ORDER BY detected_at DESC LIMIT %s"
        values.append(limit)
        cursor.execute(sql, tuple(values))
        return list(cursor.fetchall())
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def _ensure_file_test_table(cursor) -> None:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_test_runs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            test_id VARCHAR(64) NOT NULL UNIQUE,
            site_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            tested_at DATETIME NOT NULL,
            total_duration DECIMAL(10,3) NOT NULL,
            max_confidence DECIMAL(7,6) NOT NULL,
            final_result ENUM('wasp','non_wasp') NOT NULL,
            result_json JSON NOT NULL,
            INDEX idx_file_test_time (tested_at),
            INDEX idx_file_test_site (site_id, tested_at)
        )
    """)


def save_file_test_result(result: dict) -> None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_file_test_table(cursor)
        cursor.execute("""
            INSERT INTO file_test_runs
              (test_id, site_id, file_name, tested_at, total_duration, max_confidence, final_result, result_json)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE result_json=VALUES(result_json)
        """, (
            result['testId'], result['siteId'], result['fileName'], __import__('datetime').datetime.fromisoformat(result['testedAt']),
            result['totalDuration'], result['maxConfidence'], result['finalResult'], _json(result),
        ))
        connection.commit()
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def safe_save_file_test_result(result: dict) -> None:
    if not db_enabled(): return
    try:
        save_file_test_result(result)
    except Exception:
        logger.exception("MySQL 파일 테스트 이력 저장 실패")


def list_file_test_results(limit: int = 20) -> list[dict]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_file_test_table(cursor)
        cursor.execute("SELECT result_json FROM file_test_runs ORDER BY tested_at DESC LIMIT %s", (limit,))
        rows = cursor.fetchall()
        return [row['result_json'] if isinstance(row['result_json'], dict) else json.loads(row['result_json']) for row in rows]
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def safe_list_file_test_results(limit: int = 20) -> list[dict] | None:
    if not db_enabled(): return None
    try:
        return list_file_test_results(limit)
    except Exception:
        logger.exception("MySQL 파일 테스트 이력 조회 실패")
        return None
