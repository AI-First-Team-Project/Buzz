"""MySQL persistence helpers for Buzz.

DB errors are intentionally allowed to bubble from this module. Routers call the
safe_* wrappers below so audio analysis can continue even when MySQL is offline.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import timezone
from threading import Lock
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
from .config import NOTIFICATION_COOLDOWN_SECONDS

load_dotenv()

logger = logging.getLogger("buzz.database")
AnalysisType = Literal["live", "test", "simulation"]

_NOTIFICATION_DDL = """CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    detection_id BIGINT NOT NULL,
    type ENUM('WASP_DETECTED') NOT NULL DEFAULT 'WASP_DETECTED',
    wasp_probability DECIMAL(7,6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,
    CONSTRAINT fk_notification_site FOREIGN KEY (site_id) REFERENCES sites(id),
    CONSTRAINT fk_notification_detection FOREIGN KEY (detection_id) REFERENCES detection_events(id) ON DELETE CASCADE,
    INDEX idx_notification_created (created_at),
    INDEX idx_notification_unread (is_read, created_at),
    INDEX idx_notification_site_created (site_id, created_at)
)"""


def _ensure_notification_table(cursor) -> None:
    cursor.execute(_NOTIFICATION_DDL)


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


def _ensure_app_settings_table(cursor) -> None:
    cursor.execute("""CREATE TABLE IF NOT EXISTS app_settings (
        id TINYINT PRIMARY KEY,
        settings_json JSON NOT NULL
    )""")


def load_app_settings() -> dict | None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_app_settings_table(cursor)
        cursor.execute("SELECT settings_json FROM app_settings WHERE id=1")
        row = cursor.fetchone()
        return (row[0] if isinstance(row[0], dict) else json.loads(row[0])) if row else None
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def save_app_settings(settings: dict) -> None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_app_settings_table(cursor)
        cursor.execute("""INSERT INTO app_settings (id, settings_json) VALUES (1,%s)
            ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)""", (_json(settings),))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def _ensure_site_runtime_table(cursor) -> None:
    cursor.execute("""CREATE TABLE IF NOT EXISTS site_runtime_state (
        site_id INT PRIMARY KEY,
        state_json JSON NOT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_runtime_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )""")


def save_site_runtime_state(site: dict) -> None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        payload = dict(site)
        payload["probabilities"] = site["probabilities"].model_dump()
        if site["last_analysis_time"] is not None:
            payload["last_analysis_time"] = site["last_analysis_time"].isoformat()
        _ensure_site_runtime_table(cursor)
        cursor.execute("""INSERT INTO site_runtime_state (site_id,state_json,updated_at)
            VALUES (%s,%s,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE
            state_json=VALUES(state_json), updated_at=VALUES(updated_at)""",
            (site["site_id"], _json(payload)))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def safe_save_site_runtime_state(site: dict) -> None:
    if not db_enabled(): return
    try:
        save_site_runtime_state(site)
    except Exception:
        logger.exception("MySQL 사업장 현재 상태 저장 실패: site_id=%s", site["site_id"])


def list_site_runtime_states() -> list[dict]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_site_runtime_table(cursor)
        cursor.execute("SELECT state_json FROM site_runtime_state")
        return [row["state_json"] if isinstance(row["state_json"], dict) else json.loads(row["state_json"])
                for row in cursor.fetchall()]
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def save_detection_result(
    *,
    site_id: int | None,
    file_path: str | Path | None,
    result: AnalysisResponse,
    analysis_type: AnalysisType,
    expected_label: str | None = None,
    force_record: bool = False,
) -> int | None:
    """Persist one AI analysis and its visualization data."""
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        periodic_due = False
        if analysis_type in {"live", "simulation"}:
            _ensure_history_tables(cursor)
            cursor.execute("INSERT IGNORE INTO analysis_record_schedule (site_id) VALUES (%s)", (site_id,))
            cursor.execute("SELECT last_periodic_at, UTC_TIMESTAMP() FROM analysis_record_schedule WHERE site_id=%s FOR UPDATE", (site_id,))
            last_periodic, now = cursor.fetchone()
            periodic_due = last_periodic is None or (now - last_periodic).total_seconds() >= 300
            if not periodic_due and not force_record:
                connection.rollback()
                return None
        cursor.execute("SELECT id FROM detection_events WHERE analysis_id=%s", (result.analysis_id,))
        existing = cursor.fetchone()
        if existing:
            connection.rollback()
            return int(existing[0])
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
        if periodic_due:
            cursor.execute("UPDATE analysis_record_schedule SET last_periodic_at=%s WHERE site_id=%s", (now, site_id))
        if site_id is not None and predicted == "wasp":
            _ensure_notification_table(cursor)
            cursor.execute(
                """SELECT id FROM notifications
                   WHERE site_id=%s AND created_at >= UTC_TIMESTAMP() - INTERVAL %s SECOND
                   ORDER BY created_at DESC LIMIT 1 FOR UPDATE""",
                (site_id, NOTIFICATION_COOLDOWN_SECONDS),
            )
            recent = cursor.fetchone()
            wasp_probability = float(result.prediction.probabilities.wasp)
            if recent:
                cursor.execute(
                    "UPDATE notifications SET detection_id=%s, wasp_probability=GREATEST(wasp_probability,%s) WHERE id=%s",
                    (detection_event_id, wasp_probability, recent[0]),
                )
            else:
                cursor.execute(
                    "INSERT INTO notifications (site_id,detection_id,wasp_probability) VALUES (%s,%s,%s)",
                    (site_id, detection_event_id, wasp_probability),
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


def list_notifications(limit=100, unread_only=False, site_id=None):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_notification_table(cursor)
        sql = """SELECT notifications.id, notifications.site_id, sites.name AS site_name,
                        notifications.detection_id, notifications.type,
                        notifications.wasp_probability, notifications.created_at,
                        notifications.is_read, notifications.read_at
                 FROM notifications JOIN sites ON sites.id=notifications.site_id"""
        conditions, values = [], []
        if unread_only:
            conditions.append("notifications.is_read=FALSE")
        if site_id is not None:
            conditions.append("notifications.site_id=%s")
            values.append(site_id)
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY notifications.created_at DESC LIMIT %s"
        values.append(limit)
        cursor.execute(sql, tuple(values))
        return list(cursor.fetchall())
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def unread_notification_count() -> int:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_notification_table(cursor)
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read=FALSE")
        return int(cursor.fetchone()[0])
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def mark_notification_read(notification_id: int) -> bool:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_notification_table(cursor)
        cursor.execute("UPDATE notifications SET is_read=TRUE, read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE id=%s", (notification_id,))
        connection.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def mark_all_notifications_read() -> int:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        _ensure_notification_table(cursor)
        cursor.execute("UPDATE notifications SET is_read=TRUE, read_at=UTC_TIMESTAMP() WHERE is_read=FALSE")
        changed = cursor.rowcount
        connection.commit()
        return changed
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


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


def update_manual_gate(site_id: int, action: Literal["open", "close"]) -> None:
    """Persist a manual gate command and audit event atomically."""
    status = "open" if action == "open" else "closed"
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""INSERT INTO gate_status (site_id,status) VALUES (%s,%s)
            ON DUPLICATE KEY UPDATE status=VALUES(status)""", (site_id, status))
        cursor.execute("""INSERT INTO gate_events
            (site_id,detection_event_id,action,trigger_type,result,reason)
            VALUES (%s,NULL,%s,'manual','success','manual_request')""", (site_id, action))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected(): connection.close()


def list_detection_events(
    limit: int = 100,
    analysis_type: str | None = None,
    site_id: int | None = None,
    prediction: str | None = None,
    start_at=None,
    end_at=None,
) -> list[dict]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        sql = """
            SELECT detection_events.id, analysis_id, site_id, sites.name AS site_name,
                   analysis_type, original_file_name,
                   expected_label, prediction, is_correct, confidence,
                   wasp_probability, non_wasp_probability, model_name, source,
                   detected_at
            FROM detection_events
            LEFT JOIN sites ON sites.id = detection_events.site_id
        """
        values: list[object] = []
        conditions = []
        if analysis_type:
            conditions.append("detection_events.analysis_type = %s")
            values.append(analysis_type)
        if site_id is not None:
            conditions.append("detection_events.site_id = %s")
            values.append(site_id)
        if prediction:
            conditions.append("detection_events.prediction = %s")
            values.append(prediction)
        if start_at is not None:
            conditions.append("detection_events.detected_at >= %s")
            values.append(start_at)
        if end_at is not None:
            conditions.append("detection_events.detected_at <= %s")
            values.append(end_at)
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
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


_HISTORY_DDL = (
    """CREATE TABLE IF NOT EXISTS status_history (
        event_id VARCHAR(64) PRIMARY KEY,
        occurred_at DATETIME(6) NOT NULL,
        payload JSON NOT NULL,
        INDEX idx_status_history_time (occurred_at)
    )""",
    """CREATE TABLE IF NOT EXISTS analysis_record_schedule (
        site_id INT PRIMARY KEY,
        last_periodic_at DATETIME NULL
    )""",
)
_history_tables_ready = False
_history_tables_lock = Lock()


def _ensure_history_tables(cursor):
    global _history_tables_ready
    with _history_tables_lock:
        if not _history_tables_ready:
            for statement in _HISTORY_DDL:
                cursor.execute(statement)
            _history_tables_ready = True


def safe_save_history_events(events):
    if not db_enabled():
        return
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        _ensure_history_tables(cursor)
        for event in events:
            payload = dict(event)
            timestamp = payload["timestamp"]
            payload["timestamp"] = timestamp.isoformat()
            occurred_at = timestamp.astimezone(timezone.utc).replace(tzinfo=None)
            cursor.execute(
                "INSERT INTO status_history (event_id, occurred_at, payload) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE event_id=event_id",
                (event["id"], occurred_at, _json(payload)),
            )
        connection.commit()
    except Exception:
        if connection is not None:
            connection.rollback()
        logger.exception("MySQL 상태 변경 이력 저장 실패")
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


def list_status_history(limit=100):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_history_tables(cursor)
        cursor.execute("SELECT payload FROM status_history ORDER BY occurred_at DESC, event_id DESC LIMIT %s", (limit,))
        return [row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"]) for row in cursor.fetchall()]
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def get_detection_event_detail(event_id: int) -> dict | None:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT detection_events.*, sites.name AS site_name,
                   analysis_graph_data.waveform, analysis_graph_data.fft,
                   analysis_graph_data.spectrogram, analysis_graph_data.mfcc
            FROM detection_events
            LEFT JOIN sites ON sites.id = detection_events.site_id
            LEFT JOIN analysis_graph_data
              ON analysis_graph_data.detection_event_id = detection_events.id
            WHERE detection_events.id = %s
            """,
            (event_id,),
        )
        row = cursor.fetchone()
        if row:
            for key in ("waveform", "fft", "spectrogram", "mfcc"):
                if row[key] is not None and not isinstance(row[key], (dict, list)):
                    row[key] = json.loads(row[key])
        return row
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def _ensure_report_table(cursor) -> None:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_history (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            site_id INT NULL,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            file_name VARCHAR(255) NOT NULL,
            report_type ENUM('pdf','csv') NOT NULL,
            filters_json JSON NULL,
            CONSTRAINT fk_report_site FOREIGN KEY (site_id) REFERENCES sites(id),
            INDEX idx_report_created (created_at)
        )
    """)


def save_report_record(site_id, period_start, period_end, file_name, report_type, filters):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_report_table(cursor)
        cursor.execute(
            """INSERT INTO report_history
               (site_id, period_start, period_end, file_name, report_type, filters_json)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (site_id, period_start, period_end, file_name, report_type, _json(filters)),
        )
        connection.commit()
        cursor.execute("SELECT * FROM report_history WHERE id=%s", (cursor.lastrowid,))
        return cursor.fetchone()
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def list_report_records(limit=100):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_report_table(cursor)
        cursor.execute("""
            SELECT report_history.*, sites.name AS site_name
            FROM report_history LEFT JOIN sites ON sites.id=report_history.site_id
            ORDER BY created_at DESC LIMIT %s
        """, (limit,))
        return list(cursor.fetchall())
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def list_status_history_since(since_utc, site_id: int | None = None):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        _ensure_history_tables(cursor)
        sql = "SELECT occurred_at, payload FROM status_history WHERE occurred_at >= %s"
        values = [since_utc]
        if site_id is not None:
            sql += " AND CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.site_id')) AS UNSIGNED) = %s"
            values.append(site_id)
        sql += " ORDER BY occurred_at ASC, event_id ASC"
        cursor.execute(sql, tuple(values))
        rows = []
        for row in cursor.fetchall():
            payload = row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"])
            payload["_occurred_at_utc"] = row["occurred_at"].isoformat()
            rows.append(payload)
        return rows
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def list_site_records() -> list[dict]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM sites LIKE 'description'")
        if cursor.fetchone() is None:
            cursor.execute("ALTER TABLE sites ADD COLUMN description VARCHAR(500) NULL AFTER location")
            connection.commit()
        cursor.execute("SELECT id, name, location, description, created_at FROM sites ORDER BY id")
        return list(cursor.fetchall())
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()


def create_site_record(name: str, location: str, description: str | None) -> dict:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM sites LIKE 'description'")
        if cursor.fetchone() is None:
            cursor.execute("ALTER TABLE sites ADD COLUMN description VARCHAR(500) NULL AFTER location")
        cursor.execute(
            "INSERT INTO sites (name, location, description) VALUES (%s, %s, %s)",
            (name.strip(), location.strip(), description.strip() if description else None),
        )
        site_id = cursor.lastrowid
        cursor.execute("INSERT INTO gate_status (site_id, status) VALUES (%s, 'open')", (site_id,))
        connection.commit()
        cursor.execute("SELECT id, name, location, description, created_at FROM sites WHERE id=%s", (site_id,))
        return cursor.fetchone()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if connection.is_connected():
            connection.close()
