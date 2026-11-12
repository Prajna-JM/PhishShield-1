
import sqlite3
import joblib
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from auth import init_auth, jwt
from preprocessing import preprocess_text
from security import analyze_url
from explain import generate_explanation

from database import (
    init_db,
    save_scan,
    get_history,
    clear_history,
    get_stats
)


app = Flask(__name__)
CORS(app)

init_auth(app)
init_db()

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "models" / "phishing_model.pkl"
USERS_DB_PATH = BASE_DIR / "users.db"
SCAN_DB_PATH = BASE_DIR / "database" / "scan_history.db"


@jwt.token_in_blocklist_loader
def check_user_status(jwt_header, jwt_payload):
    user_id = jwt_payload.get("sub")

    try:
        with sqlite3.connect(USERS_DB_PATH) as conn:
            user = conn.execute(
                "SELECT is_active FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()

        return user is None or user[0] != 1

    except Exception as e:
        print("Account status verification error:", str(e))
        return True


@jwt.revoked_token_loader
def revoked_token_response(jwt_header, jwt_payload):
    return jsonify({
        "success": False,
        "message": "Your account is inactive or no longer exists. Please contact the administrator."
    }), 401


if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )


model_data = joblib.load(MODEL_PATH)

if isinstance(model_data, dict):
    model = model_data["model"]
    vectorizer = model_data["vectorizer"]

elif isinstance(model_data, (list, tuple)) and len(model_data) == 2:
    model, vectorizer = model_data

else:
    raise ValueError(
        "Invalid model file. Expected model and vectorizer."
    )


print("PhishShield model loaded successfully!")


def check_admin():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    return None


@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to PhishShield API",
        "status": "Running"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "message": "PhishShield backend is running",
        "model_loaded": True
    }), 200


@app.route("/api/scan", methods=["POST"])
@jwt_required()
def scan_message():
    try:
        user_id = get_jwt_identity()

        data = request.get_json(silent=True) or {}
        message = data.get("message", "").strip()

        if not message:
            return jsonify({
                "success": False,
                "error": "Please enter a message to scan"
            }), 400

        processed_message = preprocess_text(message)
        features = vectorizer.transform([processed_message])
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        classes = list(model.classes_)

        phishing_index = next(
            (
                i for i, value in enumerate(classes)
                if str(value).lower() in
                ["1", "phishing", "spam", "true"]
            ),
            len(classes) - 1
        )

        phishing_probability = float(
            probabilities[phishing_index]
        )

        if str(prediction).lower() in [
            "1", "phishing", "spam", "true"
        ]:
            ml_prediction = "Phishing"
        else:
            ml_prediction = "Safe"

        explanation = generate_explanation(
            message,
            ml_prediction,
            phishing_probability
        )

        risk_score = round(phishing_probability * 100)

        if risk_score >= 70:
            risk_level = "High"
        elif risk_score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        if isinstance(explanation, dict):
            reasons = explanation.get("reasons", [])
        else:
            reasons = []

        save_scan(
            user_id=user_id,
            scan_type="MESSAGE",
            scanned_input=message,
            risk_score=risk_score,
            risk_level=risk_level,
            detection_status=ml_prediction,
            reasons=reasons
        )

        return jsonify({
            "success": True,
            "message": message,
            "prediction": ml_prediction,
            "phishing_probability": round(
                phishing_probability * 100, 2
            ),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "explanation": explanation
        }), 200

    except Exception as e:
        print("Message scan error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/scan-url", methods=["POST"])
@jwt_required()
def scan_url():
    try:
        user_id = get_jwt_identity()

        data = request.get_json(silent=True) or {}
        url = data.get("url", "").strip()

        if not url:
            return jsonify({
                "success": False,
                "error": "Please enter a URL to scan"
            }), 400

        result = analyze_url(url)

        is_suspicious = result.get(
            "is_suspicious",
            result.get("risk_level", "Low") != "Low"
        )

        detection_status = (
            "Suspicious" if is_suspicious else "Safe"
        )

        save_scan(
            user_id=user_id,
            scan_type="URL",
            scanned_input=url,
            risk_score=result.get("risk_score", 0),
            risk_level=result.get("risk_level", "Low"),
            detection_status=detection_status,
            reasons=result.get("reasons", [])
        )

        return jsonify({
            "success": True,
            "url": result.get("url", url),
            "risk_score": result.get("risk_score", 0),
            "risk_level": result.get("risk_level", "Low"),
            "is_suspicious": is_suspicious,
            "detection_status": detection_status,
            "reasons": result.get("reasons", [])
        }), 200

    except Exception as e:
        print("URL scan error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/history", methods=["GET"])
@jwt_required()
def scan_history():
    try:
        user_id = get_jwt_identity()
        history = get_history(user_id)

        return jsonify({
            "success": True,
            "total_scans": len(history),
            "history": history
        }), 200

    except Exception as e:
        print("History retrieval error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/stats", methods=["GET"])
@jwt_required()
def dashboard_stats():
    try:
        user_id = get_jwt_identity()
        stats = get_stats(user_id)

        return jsonify({
            "success": True,
            "stats": stats
        }), 200

    except Exception as e:
        print("Dashboard statistics error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/history/clear", methods=["DELETE"])
@jwt_required()
def delete_scan_history():
    try:
        user_id = get_jwt_identity()
        deleted_count = clear_history(user_id)

        return jsonify({
            "success": True,
            "message": "Scan history cleared successfully",
            "deleted_count": deleted_count
        }), 200

    except Exception as e:
        print("History deletion error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/admin/stats", methods=["GET"])
@jwt_required()
def admin_stats():
    access_error = check_admin()

    if access_error:
        return access_error

    try:
        with sqlite3.connect(USERS_DB_PATH) as conn:
            total_users = conn.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()[0]

            active_users = conn.execute(
                "SELECT COUNT(*) FROM users WHERE is_active = 1"
            ).fetchone()[0]

            inactive_users = conn.execute(
                "SELECT COUNT(*) FROM users WHERE is_active = 0"
            ).fetchone()[0]

        with sqlite3.connect(SCAN_DB_PATH) as conn:
            total_scans = conn.execute(
                "SELECT COUNT(*) FROM scan_history"
            ).fetchone()[0]

            threats = conn.execute("""
                SELECT COUNT(*) FROM scan_history
                WHERE LOWER(detection_status)
                IN ('phishing', 'suspicious')
            """).fetchone()[0]

            safe_scans = conn.execute("""
                SELECT COUNT(*) FROM scan_history
                WHERE LOWER(detection_status) = 'safe'
            """).fetchone()[0]

        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": inactive_users,
                "total_scans": total_scans,
                "threats_detected": threats,
                "safe_scans": safe_scans
            }
        }), 200

    except Exception as e:
        print("Admin stats error:", str(e))

        return jsonify({
            "success": False,
            "message": "Unable to retrieve admin statistics."
        }), 500


@app.route("/api/admin/users", methods=["GET"])
@jwt_required()
def admin_users():
    access_error = check_admin()

    if access_error:
        return access_error

    try:
        with sqlite3.connect(USERS_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row

            conn.execute(
                "ATTACH DATABASE ? AS scans",
                (str(SCAN_DB_PATH),)
            )

            users = conn.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.created_at,
                    u.is_active,
                    COUNT(s.id) AS total_scans
                FROM users u
                LEFT JOIN scans.scan_history s
                    ON CAST(s.user_id AS TEXT) = CAST(u.id AS TEXT)
                GROUP BY u.id
                ORDER BY u.id DESC
            """).fetchall()

        return jsonify({
            "success": True,
            "users": [dict(user) for user in users]
        }), 200

    except Exception as e:
        print("Admin users error:", str(e))

        return jsonify({
            "success": False,
            "message": "Unable to retrieve users."
        }), 500


@app.route("/api/admin/user/<int:user_id>/scans", methods=["GET"])
@jwt_required()
def admin_user_scans(user_id):
    access_error = check_admin()

    if access_error:
        return access_error

    try:
        with sqlite3.connect(USERS_DB_PATH) as conn:
            user = conn.execute(
                """
                SELECT id, name, email, role, is_active
                FROM users
                WHERE id = ?
                """,
                (user_id,)
            ).fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        history = get_history(user_id)

        return jsonify({
            "success": True,
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "role": user[3],
                "is_active": bool(user[4])
            },
            "total_scans": len(history),
            "history": history
        }), 200

    except Exception as e:
        print("Admin user scans error:", str(e))

        return jsonify({
            "success": False,
            "message": "Unable to retrieve user scans."
        }), 500


@app.route("/api/admin/users/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
def update_user_status(user_id):
    access_error = check_admin()

    if access_error:
        return access_error

    admin_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        return jsonify({
            "success": False,
            "message": "is_active must be true or false."
        }), 400

    if str(admin_id) == str(user_id):
        return jsonify({
            "success": False,
            "message": "You cannot change your own account status."
        }), 403

    try:
        with sqlite3.connect(USERS_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row

            user = conn.execute(
                "SELECT id, name, role FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()

            if not user:
                return jsonify({
                    "success": False,
                    "message": "User not found."
                }), 404

            if user["role"] == "admin":
                return jsonify({
                    "success": False,
                    "message": "Admin accounts cannot be deactivated."
                }), 403

            conn.execute(
                "UPDATE users SET is_active = ? WHERE id = ?",
                (1 if is_active else 0, user_id)
            )

        return jsonify({
            "success": True,
            "message": (
                "User account activated successfully."
                if is_active
                else "User account deactivated successfully."
            ),
            "user_id": user_id,
            "is_active": is_active
        }), 200

    except Exception as e:
        print("User status update error:", str(e))

        return jsonify({
            "success": False,
            "message": "Unable to update user status."
        }), 500


if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
