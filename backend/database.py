
import sqlite3
import json
from pathlib import Path
from datetime import datetime


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "database"
DB_PATH = DB_DIR / "scan_history.db"


def get_connection():
    DB_DIR.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def init_db():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_type TEXT NOT NULL,
            scanned_input TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            detection_status TEXT NOT NULL,
            reasons TEXT,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("PRAGMA table_info(scan_history)")
    columns = [column["name"] for column in cursor.fetchall()]

    if "user_id" not in columns:
        cursor.execute("""
            ALTER TABLE scan_history
            ADD COLUMN user_id TEXT
        """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scan_history_user_id
        ON scan_history(user_id)
    """)

    connection.commit()
    connection.close()

    print("PhishShield database initialized successfully!")


def save_scan(user_id, scan_type, scanned_input, risk_score,
              risk_level, detection_status, reasons=None):

    if user_id is None:
        raise ValueError("User ID is required to save a scan.")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO scan_history (
            user_id,
            scan_type,
            scanned_input,
            risk_score,
            risk_level,
            detection_status,
            reasons,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(user_id),
        scan_type,
        scanned_input,
        int(risk_score),
        risk_level,
        detection_status,
        json.dumps(reasons or []),
        datetime.now().astimezone().isoformat(timespec="seconds")
    ))

    scan_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return scan_id


def get_history(user_id):
    if user_id is None:
        raise ValueError("User ID is required to retrieve scan history.")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT * FROM scan_history
        WHERE user_id = ?
        ORDER BY id DESC
    """, (str(user_id),))

    rows = cursor.fetchall()
    history = []

    for row in rows:
        item = dict(row)

        try:
            item["reasons"] = json.loads(item["reasons"] or "[]")
        except json.JSONDecodeError:
            item["reasons"] = []

        history.append(item)

    connection.close()

    return history


def clear_history(user_id):
    if user_id is None:
        raise ValueError("User ID is required to clear scan history.")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        DELETE FROM scan_history
        WHERE user_id = ?
    """, (str(user_id),))

    connection.commit()
    deleted_count = cursor.rowcount
    connection.close()

    return deleted_count


def get_stats(user_id):
    if user_id is None:
        raise ValueError("User ID is required to retrieve statistics.")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) AS total_scans,
            SUM(CASE
                WHEN LOWER(detection_status) = 'safe'
                THEN 1 ELSE 0
            END) AS safe_scans,
            SUM(CASE
                WHEN LOWER(detection_status) IN ('phishing', 'suspicious')
                THEN 1 ELSE 0
            END) AS threats_detected,
            SUM(CASE
                WHEN scan_type = 'MESSAGE'
                THEN 1 ELSE 0
            END) AS message_scans,
            SUM(CASE
                WHEN scan_type = 'URL'
                THEN 1 ELSE 0
            END) AS url_scans
        FROM scan_history
        WHERE user_id = ?
    """, (str(user_id),))

    row = cursor.fetchone()

    cursor.execute("""
        SELECT
            risk_level,
            COUNT(*) AS count
        FROM scan_history
        WHERE user_id = ?
        GROUP BY risk_level
    """, (str(user_id),))

    risk_rows = cursor.fetchall()

    risk_distribution = {
        "Low": 0,
        "Medium": 0,
        "High": 0
    }

    for item in risk_rows:
        level = item["risk_level"].capitalize()

        if level in risk_distribution:
            risk_distribution[level] = item["count"]

    cursor.execute("""
        SELECT *
        FROM scan_history
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 5
    """, (str(user_id),))

    recent_rows = cursor.fetchall()
    recent_scans = []

    for item in recent_rows:
        scan = dict(item)

        try:
            scan["reasons"] = json.loads(scan["reasons"] or "[]")
        except json.JSONDecodeError:
            scan["reasons"] = []

        recent_scans.append(scan)

    stats = {
        "total_scans": row["total_scans"] or 0,
        "safe_scans": row["safe_scans"] or 0,
        "threats_detected": row["threats_detected"] or 0,
        "message_scans": row["message_scans"] or 0,
        "url_scans": row["url_scans"] or 0,
        "risk_distribution": risk_distribution,
        "recent_scans": recent_scans
    }

    connection.close()

    return stats
