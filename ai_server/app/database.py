# ===== [추가 시작 9월 10일 14:54] MySQL 저장 및 조회 함수 추가 =====

import json
import os

import mysql.connector
from dotenv import load_dotenv

from .schemas import AnalysisResponse


load_dotenv()cd C:\Users\GARAM\Documents



def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "buzz"),
    )


def save_detection_result(
    site_id: int,
    file_path: str,
    result: AnalysisResponse,
) -> int:
    """
    AI 분석 결과와 그래프 데이터를 MySQL에 저장한다.
    반환값은 detection_events.id
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # detection_events 저장
        detection_sql = """
            INSERT INTO detection_events (
                analysis_id,
                site_id,
                file_name,
                file_path,
                sample_rate,
                duration,
                prediction,
                confidence,
                wasp_probability,
                non_wasp_probability,
                model_name,
                source,
                detected_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            )
        """

        detection_values = (
            result.analysis_id,
            site_id,
            result.audio.file_name,
            file_path,
            result.audio.sample_rate,
            result.audio.duration,
            result.prediction.label,
            result.prediction.confidence,
            result.prediction.probabilities.wasp,
            result.prediction.probabilities.non_wasp,
            result.meta.model_name,
            result.meta.source,
            result.meta.timestamp,
        )

        cursor.execute(detection_sql, detection_values)

        detection_event_id = cursor.lastrowid

        # analysis_graph_data 저장
        graph_sql = """
            INSERT INTO analysis_graph_data (
                detection_event_id,
                waveform,
                fft,
                spectrogram,
                mfcc
            )
            VALUES (%s, %s, %s, %s, %s)
        """

        graph_values = (
            detection_event_id,
            json.dumps(
                result.waveform.model_dump(),
                ensure_ascii=False,
            ),
            json.dumps(
                result.fft.model_dump(by_alias=True),
                ensure_ascii=False,
            ),
            json.dumps(
                result.spectrogram.model_dump(),
                ensure_ascii=False,
            ),
            json.dumps(
                result.mfcc.model_dump(),
                ensure_ascii=False,
            ),
        )

        cursor.execute(graph_sql, graph_values)

        connection.commit()

        return detection_event_id

    except Exception:
        if connection is not None:
            connection.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


def get_site_threshold(site_id: int) -> float:
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT wasp_close_threshold
            FROM sites
            WHERE id = %s
            """,
            (site_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(site_id)

        return float(row[0])

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


def close_gate_auto(
    site_id: int,
    detection_event_id: int,
) -> None:
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO gate_status (
                site_id,
                status
            )
            VALUES (%s, 'closed')
            ON DUPLICATE KEY UPDATE
                status = 'closed'
            """,
            (site_id,),
        )

        cursor.execute(
            """
            INSERT INTO gate_events (
                site_id,
                detection_event_id,
                action,
                trigger_type,
                result,
                reason
            )
            VALUES (
                %s,
                %s,
                'close',
                'auto',
                'success',
                'wasp_detected'
            )
            """,
            (
                site_id,
                detection_event_id,
            ),
        )

        connection.commit()

    except Exception:
        if connection is not None:
            connection.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()

# ===== [추가 종료] =====