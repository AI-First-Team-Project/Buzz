# ===== [수정 시작 9월 11일 09:50] MySQL 연결 및 저장 로직 안정화 =====

import json
import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

from .schemas import AnalysisResponse


# 프로젝트 루트: Buzz/
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Buzz/.env 파일을 명시적으로 불러옴
load_dotenv(PROJECT_ROOT / ".env")


def get_db_connection():
    """
    MySQL 연결 객체를 생성하여 반환한다.
    """
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
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

    반환값:
        detection_events 테이블에 생성된 id
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

        cursor.execute(
            detection_sql,
            detection_values,
        )

        # 방금 INSERT된 detection_events.id
        detection_event_id = cursor.lastrowid

        # 분석 그래프 저장
        graph_sql = """
            INSERT INTO analysis_graph_data (
                detection_event_id,
                waveform,
                fft,
                spectrogram,
                mfcc
            )
            VALUES (
                %s, %s, %s, %s, %s
            )
        """

        graph_values = (
            detection_event_id,
            json.dumps(
                result.waveform.model_dump(mode="json"),
                ensure_ascii=False,
            ),
            json.dumps(
                result.fft.model_dump(
                    mode="json",
                    by_alias=True,
                ),
                ensure_ascii=False,
            ),
            json.dumps(
                result.spectrogram.model_dump(mode="json"),
                ensure_ascii=False,
            ),
            json.dumps(
                result.mfcc.model_dump(mode="json"),
                ensure_ascii=False,
            ),
        )

        cursor.execute(
            graph_sql,
            graph_values,
        )

        # detection_events와 analysis_graph_data를 함께 확정
        connection.commit()

        return detection_event_id

    except Exception:
        if connection is not None:
            connection.rollback()

        raise

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_site_threshold(site_id: int) -> float:
    """
    사이트별 말벌 자동 차단 기준값을 조회한다.
    """

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

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def close_gate_auto(
    site_id: int,
    detection_event_id: int,
) -> None:
    """
    말벌 자동 감지로 게이트를 닫는다.

    이미 닫혀 있다면 같은 close 이벤트를
    중복해서 저장하지 않는다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # 현재 게이트 상태 조회
        cursor.execute(
            """
            SELECT status
            FROM gate_status
            WHERE site_id = %s
            """,
            (site_id,),
        )

        row = cursor.fetchone()

        # 이미 닫혀 있으면 추가 작업하지 않음
        if row is not None and row[0] == "closed":
            return

        # gate_status가 없으면 생성,
        # 있으면 closed 상태로 변경
        cursor.execute(
            """
            INSERT INTO gate_status (
                site_id,
                status
            )
            VALUES (
                %s,
                'closed'
            )
            ON DUPLICATE KEY UPDATE
                status = 'closed'
            """,
            (site_id,),
        )

        # 자동 닫힘 이력 저장
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

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


# ===== [수정 종료] =====


# ===== [추가 시작 9월 11일 16:00] 수동 문 제어 DB 저장 함수 추가 =====
def set_gate_manual(
    site_id: int,
    action: str,
) -> None:
    """
    사용자의 수동 문 열기/닫기 요청을 저장한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        if action not in ("open", "close"):
            raise ValueError(
                f"지원하지 않는 게이트 동작입니다: {action}"
            )

        status = "open" if action == "open" else "closed"

        cursor.execute(
            """
            INSERT INTO gate_status (
                site_id,
                status
            )
            VALUES (
                %s,
                %s
            )
            ON DUPLICATE KEY UPDATE
                status = %s
            """,
            (
                site_id,
                status,
                status,
            ),
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
                NULL,
                %s,
                'manual',
                'success',
                'manual_request'
            )
            """,
            (
                site_id,
                action,
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

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()
# ===== [추가 종료] =====


# ===== [추가 시작 9월 11일 17:10] 전체 MySQL 조회 함수 추가 =====

def get_sites():
    """
    전체 사업장 목록을 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                location,
                wasp_close_threshold
            FROM sites
            ORDER BY id ASC
            """
        )

        return cursor.fetchall()

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_site_info(site_id: int):
    """
    특정 사업장 정보를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                location,
                wasp_close_threshold
            FROM sites
            WHERE id = %s
            """,
            (site_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(site_id)

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_detection_history(
    limit: int = 100,
    site_id: int | None = None,
):
    """
    AI 감지 이력을 최신순으로 조회한다.

    site_id가 지정되면 해당 사업장만 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if site_id is None:
            cursor.execute(
                """
                SELECT
                    de.id,
                    de.analysis_id,
                    de.site_id,
                    s.name AS site_name,
                    de.file_name,
                    de.file_path,
                    de.sample_rate,
                    de.duration,
                    de.prediction,
                    de.confidence,
                    de.wasp_probability,
                    de.non_wasp_probability,
                    de.model_name,
                    de.source,
                    de.audio_time,
                    de.inference_time,
                    de.visualization_time,
                    de.total_time,
                    de.detected_at
                FROM detection_events de
                JOIN sites s
                    ON s.id = de.site_id
                ORDER BY de.id DESC
                LIMIT %s
                """,
                (limit,),
            )

        else:
            cursor.execute(
                """
                SELECT
                    de.id,
                    de.analysis_id,
                    de.site_id,
                    s.name AS site_name,
                    de.file_name,
                    de.file_path,
                    de.sample_rate,
                    de.duration,
                    de.prediction,
                    de.confidence,
                    de.wasp_probability,
                    de.non_wasp_probability,
                    de.model_name,
                    de.source,
                    de.audio_time,
                    de.inference_time,
                    de.visualization_time,
                    de.total_time,
                    de.detected_at
                FROM detection_events de
                JOIN sites s
                    ON s.id = de.site_id
                WHERE de.site_id = %s
                ORDER BY de.id DESC
                LIMIT %s
                """,
                (
                    site_id,
                    limit,
                ),
            )

        return cursor.fetchall()

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_detection_event(
    detection_event_id: int,
):
    """
    detection_events.id 기준으로
    특정 AI 감지 이벤트를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                de.id,
                de.analysis_id,
                de.site_id,
                s.name AS site_name,
                de.file_name,
                de.file_path,
                de.sample_rate,
                de.duration,
                de.prediction,
                de.confidence,
                de.wasp_probability,
                de.non_wasp_probability,
                de.model_name,
                de.source,
                de.audio_time,
                de.inference_time,
                de.visualization_time,
                de.total_time,
                de.detected_at
            FROM detection_events de
            JOIN sites s
                ON s.id = de.site_id
            WHERE de.id = %s
            """,
            (detection_event_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(detection_event_id)

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_detection_event_by_analysis_id(
    analysis_id: str,
):
    """
    analysis_id 기준으로 특정 AI 감지 이벤트를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                de.id,
                de.analysis_id,
                de.site_id,
                s.name AS site_name,
                de.file_name,
                de.file_path,
                de.sample_rate,
                de.duration,
                de.prediction,
                de.confidence,
                de.wasp_probability,
                de.non_wasp_probability,
                de.model_name,
                de.source,
                de.audio_time,
                de.inference_time,
                de.visualization_time,
                de.total_time,
                de.detected_at
            FROM detection_events de
            JOIN sites s
                ON s.id = de.site_id
            WHERE de.analysis_id = %s
            """,
            (analysis_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(analysis_id)

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_analysis_graph_data(
    detection_event_id: int,
):
    """
    특정 AI 감지 이벤트의 분석 그래프 데이터를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                detection_event_id,
                waveform,
                fft,
                spectrogram,
                mfcc
            FROM analysis_graph_data
            WHERE detection_event_id = %s
            """,
            (detection_event_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(detection_event_id)

        # JSON 컬럼이 문자열로 반환될 경우 Python 객체로 변환
        for key in (
            "waveform",
            "fft",
            "spectrogram",
            "mfcc",
        ):
            if (
                row[key] is not None
                and isinstance(row[key], str)
            ):
                row[key] = json.loads(row[key])

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_gate_status(
    site_id: int,
):
    """
    특정 사업장의 현재 게이트 상태를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                gs.site_id,
                s.name AS site_name,
                gs.status,
                gs.updated_at
            FROM gate_status gs
            JOIN sites s
                ON s.id = gs.site_id
            WHERE gs.site_id = %s
            """,
            (site_id,),
        )

        return cursor.fetchone()

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_all_gate_status():
    """
    전체 사업장의 현재 게이트 상태를 조회한다.

    gate_status 데이터가 아직 없는 사업장도
    sites 기준으로 함께 반환한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                s.id AS site_id,
                s.name AS site_name,
                gs.status,
                gs.updated_at
            FROM sites s
            LEFT JOIN gate_status gs
                ON gs.site_id = s.id
            ORDER BY s.id ASC
            """
        )

        return cursor.fetchall()

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_gate_events(
    limit: int = 100,
    site_id: int | None = None,
):
    """
    gate_events 원본 데이터를 최신순으로 조회한다.

    site_id가 지정되면 해당 사업장의
    게이트 이벤트만 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if site_id is None:
            cursor.execute(
                """
                SELECT
                    ge.id,
                    ge.site_id,
                    s.name AS site_name,
                    ge.detection_event_id,
                    ge.action,
                    ge.trigger_type,
                    ge.result,
                    ge.reason,
                    ge.created_at
                FROM gate_events ge
                JOIN sites s
                    ON s.id = ge.site_id
                ORDER BY ge.id DESC
                LIMIT %s
                """,
                (limit,),
            )

        else:
            cursor.execute(
                """
                SELECT
                    ge.id,
                    ge.site_id,
                    s.name AS site_name,
                    ge.detection_event_id,
                    ge.action,
                    ge.trigger_type,
                    ge.result,
                    ge.reason,
                    ge.created_at
                FROM gate_events ge
                JOIN sites s
                    ON s.id = ge.site_id
                WHERE ge.site_id = %s
                ORDER BY ge.id DESC
                LIMIT %s
                """,
                (
                    site_id,
                    limit,
                ),
            )

        return cursor.fetchall()

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_gate_event(
    gate_event_id: int,
):
    """
    특정 게이트 이벤트 상세 정보를 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                ge.id,
                ge.site_id,
                s.name AS site_name,
                ge.detection_event_id,
                ge.action,
                ge.trigger_type,
                ge.result,
                ge.reason,
                ge.created_at
            FROM gate_events ge
            JOIN sites s
                ON s.id = ge.site_id
            WHERE ge.id = %s
            """,
            (gate_event_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(gate_event_id)

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_detection_with_graph(
    detection_event_id: int,
):
    """
    AI 감지 이벤트와 분석 그래프 데이터를
    한 번에 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                de.id AS detection_event_id,
                de.analysis_id,
                de.site_id,
                s.name AS site_name,
                de.file_name,
                de.file_path,
                de.sample_rate,
                de.duration,
                de.prediction,
                de.confidence,
                de.wasp_probability,
                de.non_wasp_probability,
                de.model_name,
                de.source,
                de.audio_time,
                de.inference_time,
                de.visualization_time,
                de.total_time,
                de.detected_at,
                ag.id AS graph_id,
                ag.waveform,
                ag.fft,
                ag.spectrogram,
                ag.mfcc
            FROM detection_events de
            JOIN sites s
                ON s.id = de.site_id
            LEFT JOIN analysis_graph_data ag
                ON ag.detection_event_id = de.id
            WHERE de.id = %s
            """,
            (detection_event_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise KeyError(detection_event_id)

        for key in (
            "waveform",
            "fft",
            "spectrogram",
            "mfcc",
        ):
            if (
                row[key] is not None
                and isinstance(row[key], str)
            ):
                row[key] = json.loads(row[key])

        return row

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


def get_gate_history(
    limit: int = 100,
):
    """
    프론트엔드 HistoryItem 형식으로
    게이트 이력을 조회한다.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                ge.id,
                ge.site_id,
                s.name AS site_name,
                ge.action,
                ge.trigger_type,
                ge.result,
                ge.reason,
                ge.created_at
            FROM gate_events ge
            JOIN sites s
                ON s.id = ge.site_id
            ORDER BY ge.id DESC
            LIMIT %s
            """,
            (limit,),
        )

        rows = cursor.fetchall()

        history = []

        for row in rows:
            # 이벤트 당시의 action을 기준으로 문 상태 결정
            door_status = (
                "OPEN"
                if row["action"] == "open"
                else "CLOSED"
            )

            if row["trigger_type"] == "manual":
                title = (
                    "사용자 문 열기"
                    if row["action"] == "open"
                    else "사용자 문 닫기"
                )
            else:
                title = (
                    "자동 문 열기"
                    if row["action"] == "open"
                    else "말벌 감지로 문 닫기"
                )

            history.append(
                {
                    "id": f"gate-{row['id']}",
                    "type": "gate",
                    "site_id": row["site_id"],
                    "site_name": row["site_name"],
                    "title": title,
                    "timestamp": row["created_at"],
                    "result": None,
                    "confidence": None,
                    "door_status": door_status,
                    "action": row["action"],
                }
            )

        return history

    finally:
        if cursor is not None:
            cursor.close()

        if (
            connection is not None
            and connection.is_connected()
        ):
            connection.close()


# ===== [추가 종료] =====