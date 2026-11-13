
import os
import sqlite3
import smtplib
from pathlib import Path
from email.message import EmailMessage

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    JWTManager,
    create_access_token
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

auth_bp = Blueprint("auth", __name__)
jwt = JWTManager()

DB_PATH = Path(__file__).resolve().parent / "users.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth(app):
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY", "phishshield-development-secret"
    )

    jwt.init_app(app)

    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1
            )
        """)

        columns = [
            row["name"]
            for row in conn.execute("PRAGMA table_info(users)").fetchall()
        ]

        if "role" not in columns:
            conn.execute("""
                ALTER TABLE users
                ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
            """)

        if "is_active" not in columns:
            conn.execute("""
                ALTER TABLE users
                ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
            """)

        admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()

        if admin_email:
            conn.execute(
                "UPDATE users SET role = 'admin' WHERE email = ?",
                (admin_email,)
            )

    app.register_blueprint(auth_bp, url_prefix="/api/auth")


@jwt.user_lookup_loader
def load_user(jwt_header, jwt_data):
    user_id = jwt_data["sub"]

    with get_db() as conn:
        user = conn.execute(
            """
            SELECT id, name, email, role, is_active
            FROM users
            WHERE id = ?
            """,
            (user_id,)
        ).fetchone()

    if not user or user["is_active"] != 1:
        return None

    return dict(user)


@jwt.user_lookup_error_loader
def user_lookup_error(jwt_header, jwt_data):
    return jsonify({
        "success": False,
        "message": "Your account is inactive or no longer exists. Please contact the administrator."
    }), 401



def send_email(receiver, subject, body):
    sender = os.getenv("EMAIL_ADDRESS")
    password = os.getenv("EMAIL_PASSWORD")

    if not sender or not password:
        raise ValueError("Email configuration is missing.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"Team PhishShield <{sender}>"
    msg["To"] = receiver
    msg.set_content(body)

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=8) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)



@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"message": "All fields are required."}), 400

    if "@" not in email:
        return jsonify({"message": "Enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({
            "message": "Password must contain at least 8 characters."
        }), 400

    hashed_password = generate_password_hash(password)

    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO users (name, email, password, role, is_active)
                VALUES (?, ?, ?, 'user', 1)
                """,
                (name, email, hashed_password)
            )

    except sqlite3.IntegrityError:
        return jsonify({"message": "Email is already registered."}), 409

    try:
        send_email(
            email,
            "Welcome to PhishShield!",
            f"Hello {name},\n\n"
            "Your PhishShield account has been successfully created.\n"
            "Thank you for joining us!\n\n"
            "Stay safe online.\n"
            "Team PhishShield"
        )
    except Exception:
        return jsonify({
            "message": "Account created, but confirmation email could not be sent."
        }), 201

    return jsonify({
        "message": "Registration successful! Confirmation email sent."
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid email or password."}), 401

    if user["is_active"] != 1:
        return jsonify({
            "success": False,
            "message": "Your account has been deactivated. Please contact the administrator."
        }), 403

    role = user["role"]

    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": role}
    )

    email_sent = True

    try:
        send_email(
            email,
            "PhishShield Login Alert",
            f"Hello {user['name']},\n\n"
            "Your PhishShield account was successfully logged in.\n\n"
            "If this was not you, please secure your account immediately.\n\n"
            "Team PhishShield"
        )
    except Exception as e:
        print("Login notification email failed:", e)
        email_sent = False

    return jsonify({
        "message": "Login successful!",
        "access_token": access_token,
        "email_sent": email_sent,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": role,
            "is_active": bool(user["is_active"])
        }
    }), 200
