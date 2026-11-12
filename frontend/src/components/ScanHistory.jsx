
import React, { useEffect, useState } from "react";
import {
    History,
    RefreshCw,
    Trash2,
    ShieldCheck,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database
} from "lucide-react";

import "./ScanHistory.css";

const API_URL = "http://127.0.0.1:5000/api";

function ScanHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [clearing, setClearing] = useState(false);

    // Fetch scan history
    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("access_token");

            if (!token) {
                throw new Error("Please login to view scan history.");
            }

            const response = await fetch(`${API_URL}/history`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to fetch scan history."
                );
            }

            setHistory(data.history || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Clear scan history
    const handleClearHistory = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to permanently delete all your scan history?"
        );

        if (!confirmed) return;

        try {
            setClearing(true);
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
                throw new Error(
                    data.error || "Unable to clear scan history."
                );
            }

            setHistory([]);

            alert(
                `${data.deleted_count ?? 0} scan records deleted successfully.`
            );

        } catch (err) {
            setError(err.message);
        } finally {
            setClearing(false);
        }
    };

    // Load history when component opens
    useEffect(() => {
        fetchHistory();
    }, []);

    // Calculate statistics
    const totalScans = history.length;

    const phishingScans = history.filter(
        item =>
            item.detection_status?.toLowerCase() === "phishing"
    ).length;

    const safeScans = history.filter(
        item =>
            item.detection_status?.toLowerCase() === "safe"
    ).length;

    const suspiciousScans = history.filter(
        item =>
            item.detection_status?.toLowerCase() === "suspicious"
    ).length;

    // Format date
    const formatDate = (date) => {
        if (!date) return "N/A";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return date;
        }

        return parsedDate.toLocaleString();
    };

    // Risk level styling
    const getRiskClass = (level) => {
        switch (level?.toLowerCase()) {
            case "high":
                return "risk-high";

            case "medium":
                return "risk-medium";

            case "low":
                return "risk-low";

            default:
                return "risk-unknown";
        }
    };

    // Detection status styling
    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case "phishing":
                return "status-phishing";

            case "safe":
                return "status-safe";

            case "suspicious":
                return "status-suspicious";

            default:
                return "status-unknown";
        }
    };

    return (
        <div className="history-page">

            {/* Page Heading */}
            <div className="history-heading">
                <div>
                    <h1>
                        <History size={27} />
                        Scan History
                    </h1>

                    <p>
                        View and manage your previous phishing detection scans.
                    </p>
                </div>

                <div className="history-actions">

                    <button
                        className="history-refresh-btn"
                        onClick={fetchHistory}
                        disabled={loading}
                    >
                        <RefreshCw size={17} />
                        {loading ? "Loading..." : "Refresh"}
                    </button>

                    <button
                        className="history-clear-btn"
                        onClick={handleClearHistory}
                        disabled={clearing || loading || history.length === 0}
                    >
                        <Trash2 size={17} />
                        {clearing ? "Clearing..." : "Clear History"}
                    </button>

                </div>
            </div>

            {/* Statistics */}
            <div className="history-stats">

                <div className="history-stat-card">
                    <div className="history-stat-icon">
                        <Database size={22} />
                    </div>

                    <div>
                        <span>Total Scans</span>
                        <h2>{totalScans}</h2>
                    </div>
                </div>

                <div className="history-stat-card">
                    <div className="history-stat-icon">
                        <AlertTriangle size={22} />
                    </div>

                    <div>
                        <span>Phishing Detected</span>
                        <h2>{phishingScans}</h2>
                    </div>
                </div>

                <div className="history-stat-card">
                    <div className="history-stat-icon">
                        <ShieldCheck size={22} />
                    </div>

                    <div>
                        <span>Safe Scans</span>
                        <h2>{safeScans}</h2>
                    </div>
                </div>

                <div className="history-stat-card">
                    <div className="history-stat-icon">
                        <Clock size={22} />
                    </div>

                    <div>
                        <span>Suspicious Scans</span>
                        <h2>{suspiciousScans}</h2>
                    </div>
                </div>

            </div>

            {/* Error Message */}
            {error && (
                <div className="history-error">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* History Table */}
            <div className="history-table-section">

                <div className="history-table-heading">
                    <div>
                        <h2>Recent Scan Records</h2>
                        <p>Your previously analyzed messages and URLs.</p>
                    </div>
                </div>

                {loading ? (

                    <div className="history-empty">
                        <RefreshCw size={30} />
                        <h3>Loading scan history...</h3>
                    </div>

                ) : history.length === 0 && !error ? (

                    <div className="history-empty">
                        <History size={35} />
                        <h3>No Scan History Found</h3>
                        <p>
                            Your previous scan records will appear here.
                        </p>
                    </div>

                ) : history.length > 0 ? (

                    <div className="history-table-wrapper">

                        <table className="history-table">

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Scan Type</th>
                                    <th>Scanned Input</th>
                                    <th>Risk Score</th>
                                    <th>Risk Level</th>
                                    <th>Detection Status</th>
                                    <th>Date</th>
                                    <th>Reasons</th>
                                </tr>
                            </thead>

                            <tbody>

                                {history.map((item) => (

                                    <tr key={item.id}>

                                        <td>{item.id}</td>

                                        <td>
                                            <span className="scan-type">
                                                {item.scan_type || "N/A"}
                                            </span>
                                        </td>

                                        <td className="history-input">
                                            {item.scanned_input || "N/A"}
                                        </td>

                                        <td>
                                            {item.risk_score ?? 0}%
                                        </td>

                                        <td>
                                            <span
                                                className={`risk-badge ${getRiskClass(item.risk_level)}`}
                                            >
                                                {item.risk_level || "Unknown"}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`status-badge ${getStatusClass(item.detection_status)}`}
                                            >
                                                {item.detection_status || "Unknown"}
                                            </span>
                                        </td>

                                        <td>
                                            {formatDate(item.created_at)}
                                        </td>

                                        <td className="history-reasons">
                                            {Array.isArray(item.reasons)
                                                ? item.reasons.join(", ")
                                                : item.reasons || "N/A"}
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                ) : null}

            </div>

            {/* Footer */}
            <div className="history-footer">
                <CheckCircle size={16} />
                Your scan records are securely managed by PhishShield.
            </div>

        </div>
    );
}

export default ScanHistory;
