
import React, { useState } from "react";
import {
    ShieldCheck,
    BrainCircuit,
    Database,
    Trash2,
    Info,
    AlertTriangle,
    CheckCircle
} from "lucide-react";
import "./SettingsPage.css";

const API_URL = "http://127.0.0.1:5000/api";

function SettingsPage({ onHistoryCleared }) {
    const [clearing, setClearing] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleClearHistory = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to permanently delete all scan history? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            setClearing(true);
            setMessage("");
            setError("");

            const token = localStorage.getItem("access_token");

            if (!token) {
                throw new Error("Please login again to continue.");
            }

            const response = await fetch(`${API_URL}/history/clear`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Unable to clear scan history.");
            }

            setMessage(
                `${data.deleted_count ?? 0} scan records deleted successfully.`
            );

            if (onHistoryCleared) {
                await onHistoryCleared();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-heading">
                <div>
                    <h1>Settings</h1>
                    <p>Manage your PhishShield application and detection information.</p>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-title">
                    <Info size={21} />
                    <div>
                        <h2>Application Information</h2>
                        <p>Basic details about the PhishShield platform.</p>
                    </div>
                </div>

                <div className="settings-info-grid">
                    <div className="settings-info-card">
                        <span>Application Name</span>
                        <h3>PhishShield</h3>
                    </div>

                    <div className="settings-info-card">
                        <span>Version</span>
                        <h3>1.0.0</h3>
                    </div>

                    <div className="settings-info-card">
                        <span>Application Type</span>
                        <h3>AI Cybersecurity Platform</h3>
                    </div>

                    <div className="settings-info-card">
                        <span>Backend</span>
                        <h3>Python Flask</h3>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-title">
                    <BrainCircuit size={21} />
                    <div>
                        <h2>Detection Information</h2>
                        <p>Learn how PhishShield analyzes suspicious content.</p>
                    </div>
                </div>

                <div className="detection-info-list">
                    <div className="detection-info-item">
                        <div className="settings-feature-icon">
                            <ShieldCheck />
                        </div>
                        <div>
                            <h3>Message Phishing Detection</h3>
                            <p>
                                Uses a trained Machine Learning model with
                                TF-IDF text features and Logistic Regression
                                to classify messages as phishing or safe.
                            </p>
                        </div>
                    </div>

                    <div className="detection-info-item">
                        <div className="settings-feature-icon">
                            <BrainCircuit />
                        </div>
                        <div>
                            <h3>Explainable AI</h3>
                            <p>
                                Provides explanations and reasons to help
                                users understand suspicious message indicators.
                            </p>
                        </div>
                    </div>

                    <div className="detection-info-item">
                        <div className="settings-feature-icon">
                            <AlertTriangle />
                        </div>
                        <div>
                            <h3>URL Security Analysis</h3>
                            <p>
                                Analyzes URLs using security rules and
                                suspicious indicators to calculate a risk score.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-title">
                    <Database size={21} />
                    <div>
                        <h2>Data Management</h2>
                        <p>Manage scan records stored in the database.</p>
                    </div>
                </div>

                <div className="settings-danger-card">
                    <div>
                        <h3>Clear Scan History</h3>
                        <p>
                            Permanently delete all previously saved message
                            and URL scan records from your account.
                        </p>
                    </div>

                    <button
                        className="settings-delete-btn"
                        onClick={handleClearHistory}
                        disabled={clearing}
                    >
                        <Trash2 size={17} />
                        {clearing ? "Clearing..." : "Clear All History"}
                    </button>
                </div>

                {message && (
                    <div className="settings-success">
                        <CheckCircle size={18} />
                        {message}
                    </div>
                )}

                {error && (
                    <div className="settings-error">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}
            </div>

            <div className="settings-footer">
                PhishShield · AI-Powered Cybersecurity Protection · Version 1.0.0
            </div>
        </div>
    );
}

export default SettingsPage;
