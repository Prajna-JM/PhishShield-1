
import ProfilePage from "./components/ProfilePage.jsx";
import AuthPages from "./components/AuthPages.jsx";
import SettingsPage from "./components/SettingPage.jsx";
import ScanHistory from "./components/ScanHistory.jsx";

import { useState, useEffect } from "react";
import axios from "axios";

import {
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  History,
  Settings,
  User,
  Search,
  Link,
  Mail,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  Menu,
  X,
  LogOut,
  Users,
  RefreshCw,
  Eye,
  UserCheck
} from "lucide-react";

import "./App.css";

const API_BASE_URL = "https://phishshield-1-backend.onrender.com";

function App() {

  // Logged-in user details
  const getLoggedInUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const loggedInUser = getLoggedInUser();
  const userName = loggedInUser.name || "User";
  const userEmail = loggedInUser.email || "Email not available";
  const userInitial = userName.charAt(0).toUpperCase();
  const isAdmin = loggedInUser.role === "admin";

  const [adminStats, setAdminStats] = useState({
    total_users: 0,
    total_scans: 0,
    threats_detected: 0,
    safe_scans: 0
  });

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("all");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [selectedUserScans, setSelectedUserScans] = useState([]);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);

  const filteredAdminUsers = adminUsers.filter((user) => {
    const search = adminSearch.trim().toLowerCase();

    const matchesSearch =
      !search ||
      (user.name || "").toLowerCase().includes(search) ||
      (user.email || "").toLowerCase().includes(search);

    const matchesRole =
      adminRoleFilter === "all" ||
      (user.role || "user") === adminRoleFilter;

    return matchesSearch && matchesRole;
  });

  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const [url, setUrl] = useState("");
  const [urlResult, setUrlResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanMode, setScanMode] = useState("message");

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  const [stats, setStats] = useState({
    total_scans: 0,
    safe_scans: 0,
    threats_detected: 0,
    message_scans: 0,
    url_scans: 0,
    risk_distribution: {
      Low: 0,
      Medium: 0,
      High: 0
    },
    recent_scans: []
  });

  // Authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");

    return {
      Authorization: `Bearer ${token}`
    };
  };

  // Common API error handler
  const getApiErrorMessage = (err, action) => {
    console.error(`${action} error:`, err);
    console.error("Error response:", err.response);
    console.error("Error message:", err.message);

    if (err.response) {
      if (err.response.status === 401) {
        return "Your session has expired. Please log out and log in again.";
      }

      if (err.response.status === 403) {
        return "You do not have permission to perform this action.";
      }

      return (
        err.response.data?.message ||
        err.response.data?.error ||
        `Backend returned error ${err.response.status}.`
      );
    }

    if (err.request) {
      return "No response received from the backend. Please check the Render deployment and browser Console.";
    }

    return err.message || `Unable to complete ${action}.`;
  };

  // Logout function
  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) return;

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setIsAuthenticated(false);
    setActiveTab("Dashboard");

    setMessage("");
    setResult(null);
    setUrl("");
    setUrlResult(null);
    setError("");
    setLoading(false);
    setMobileMenu(false);

    setStats({
      total_scans: 0,
      safe_scans: 0,
      threats_detected: 0,
      message_scans: 0,
      url_scans: 0,
      risk_distribution: {
        Low: 0,
        Medium: 0,
        High: 0
      },
      recent_scans: []
    });
  };

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setStats({
        total_scans: 0,
        safe_scans: 0,
        threats_detected: 0,
        message_scans: 0,
        url_scans: 0,
        risk_distribution: {
          Low: 0,
          Medium: 0,
          High: 0
        },
        recent_scans: []
      });

      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/stats`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.data.success) {
        setStats(response.data.stats);
      }

    } catch (err) {
      console.error(
        "Unable to load dashboard statistics:",
        err
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
      }
    }
  };

  // Load statistics after login
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  // Load administrator dashboard data
  const loadAdminData = async () => {
    const token = localStorage.getItem("access_token");

    if (!token || !isAdmin) return;

    setAdminLoading(true);
    setAdminError("");

    try {
      const [statsResponse, usersResponse] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/api/admin/stats`,
          {
            headers: getAuthHeaders()
          }
        ),

        axios.get(
          `${API_BASE_URL}/api/admin/users`,
          {
            headers: getAuthHeaders()
          }
        )
      ]);

      if (statsResponse.data.success) {
        setAdminStats(statsResponse.data.stats);
      }

      if (usersResponse.data.success) {
        setAdminUsers(usersResponse.data.users || []);
      }

    } catch (err) {
      console.error("Unable to load admin dashboard:", err);

      setAdminError(
        getApiErrorMessage(err, "loading administrator data")
      );

    } finally {
      setAdminLoading(false);
    }
  };

  // Load selected user's scans
  const loadSelectedUserScans = async (user) => {
    setSelectedAdminUser(user);
    setSelectedUserScans([]);
    setSelectedUserLoading(true);
    setAdminError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/user/${user.id}/scans`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.data.success) {
        setSelectedUserScans(response.data.history || []);
      }

    } catch (err) {
      console.error("Unable to load user scan history:", err);

      setAdminError(
        getApiErrorMessage(err, "loading this user's scan history")
      );

    } finally {
      setSelectedUserLoading(false);
    }
  };

  // Load admin data when admin dashboard opens
  useEffect(() => {
    if (isAuthenticated && isAdmin && activeTab === "Admin Dashboard") {
      loadAdminData();
    }
  }, [isAuthenticated, activeTab]);

  // Message scanning
  const scanMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message to scan.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setUrlResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/scan`,
        {
          message: message
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          timeout: 60000
        }
      );

      console.log("Message scan response:", response.data);

      setResult(response.data);
      await loadDashboardStats();

    } catch (err) {
      setError(getApiErrorMessage(err, "message scanning"));

    } finally {
      setLoading(false);
    }
  };

  // URL scanning
  const scanUrl = async () => {
    if (!url.trim()) {
      setError("Please enter a URL to scan.");
      return;
    }

    setLoading(true);
    setError("");
    setUrlResult(null);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/scan-url`,
        {
          url: url.trim()
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          timeout: 60000
        }
      );

      console.log("URL scan response:", response.data);

      setUrlResult(response.data);
      await loadDashboardStats();

    } catch (err) {
      setError(getApiErrorMessage(err, "URL scanning"));

    } finally {
      setLoading(false);
    }
  };

  // Sidebar navigation
  const navigation = [
    {
      name: "Dashboard",
      icon: LayoutDashboard
    },
    {
      name: "Scanner",
      icon: ScanSearch
    },
    {
      name: "History",
      icon: History
    },
    {
      name: "My Profile",
      icon: User
    },
    {
      name: "Settings",
      icon: Settings
    }
  ];

  if (isAdmin) {
    navigation.push({
      name: "Admin Dashboard",
      icon: Users
    });
  }

  // Change scanner mode
  const changeScanMode = (mode) => {
    setScanMode(mode);
    setError("");
    setResult(null);
    setUrlResult(null);
  };

  // Scanner content
  const scannerContent = (
    <>
      <div className="scanner-section">

        <div className="section-heading">
          <div>
            <h2>Phishing Detection Scanner</h2>
            <p>
              Analyze suspicious messages and URLs using AI.
            </p>
          </div>

          <span className="ai-badge">
            <Activity size={15} />
            AI Powered
          </span>
        </div>

        <div className="scanner-card">

          <div className="scanner-tabs">

            <button
              className={`scanner-tab ${
                scanMode === "message" ? "active" : ""
              }`}
              onClick={() => changeScanMode("message")}
            >
              <Mail size={18} />
              Message Scanner
            </button>

            <button
              className={`scanner-tab ${
                scanMode === "url" ? "active" : ""
              }`}
              onClick={() => changeScanMode("url")}
            >
              <Link size={18} />
              URL / Link Scanner
            </button>

          </div>

          {scanMode === "message" ? (
            <>
              <label htmlFor="message-input">
                Enter suspicious message
              </label>

              <textarea
                id="message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste your suspicious email or message here..."
                rows={6}
              />
            </>
          ) : (
            <>
              <label htmlFor="url-input">
                Enter URL to scan
              </label>

              <textarea
                id="url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste the suspicious URL here..."
                rows={3}
              />
            </>
          )}

          <div className="scanner-footer">

            <span>
              <ShieldCheck size={15} />
              Your input will be analyzed by the AI model.
            </span>

            <button
              className="scan-button"
              onClick={
                scanMode === "message"
                  ? scanMessage
                  : scanUrl
              }
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search size={18} />
                  {scanMode === "message"
                    ? "Scan Message"
                    : "Scan URL"}
                </>
              )}
            </button>

          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

        </div>
      </div>

      {/* Message scan results */}
      {result && scanMode === "message" && (
        <div className="result-card">

          <div className="result-heading">
            <h3>Scan Results</h3>

            <span className="result-success">
              <CheckCircle size={16} />
              Analysis Complete
            </span>
          </div>

          <div className="result-status">

            {result.prediction?.toLowerCase() === "phishing" ? (
              <AlertTriangle
                className="result-red"
                size={30}
              />
            ) : (
              <CheckCircle
                className="result-green"
                size={30}
              />
            )}

            <div>
              <h2>{result.prediction || "Unknown"}</h2>
              <p>AI Detection Result</p>
            </div>

          </div>

          <div className="probability">

            <div>
              <span>Phishing Probability</span>

              <strong>
                {result.phishing_probability ?? 0}%
              </strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(result.phishing_probability) || 0
                    )
                  )}%`
                }}
              />
            </div>

          </div>

          {/* Explainable AI Analysis */}
          <div className="explanation">

            <h4>
              <Activity size={18} />
              Explainable AI Analysis
            </h4>

            {Array.isArray(result.explanation?.explanations) &&
            result.explanation.explanations.length > 0 ? (
              <ul>
                {result.explanation.explanations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : Array.isArray(result.reasons) &&
              result.reasons.length > 0 ? (
              <ul>
                {result.reasons.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No explanations available.</p>
            )}

          </div>

          {/* URL Analysis */}
          {Array.isArray(result.explanation?.url_analysis) &&
            result.explanation.url_analysis.length > 0 && (
              <div className="explanation">

                <h4>
                  <Link size={18} />
                  URL Analysis
                </h4>

                {result.explanation.url_analysis.map((item, index) => (
                  <div key={index}>

                    <p>
                      <strong>URL:</strong> {item.url}
                    </p>

                    <p>
                      <strong>Risk Level:</strong>{" "}
                      {item.risk_level || "Unknown"}
                    </p>

                    <p>
                      <strong>Risk Score:</strong>{" "}
                      {item.risk_score ?? 0}/100
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      {item.is_suspicious
                        ? "Suspicious"
                        : "Safe"}
                    </p>

                    <strong>Detection Reasons:</strong>

                    {Array.isArray(item.reasons) &&
                    item.reasons.length > 0 ? (
                      <ul>
                        {item.reasons.map((reason, reasonIndex) => (
                          <li key={reasonIndex}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No suspicious indicators detected.</p>
                    )}

                  </div>
                ))}

              </div>
            )}

        </div>
      )}

      {/* URL scan results */}
      {urlResult && scanMode === "url" && (
        <div className="result-card">

          <div className="result-heading">
            <h3>URL Scan Results</h3>

            <span className="result-success">
              <CheckCircle size={16} />
              Analysis Complete
            </span>
          </div>

          <div className="result-status">

            {urlResult.is_suspicious ? (
              <AlertTriangle
                className="result-red"
                size={30}
              />
            ) : (
              <CheckCircle
                className="result-green"
                size={30}
              />
            )}

            <div>
              <h2>
                {urlResult.is_suspicious
                  ? "Suspicious URL"
                  : "Safe URL"}
              </h2>

              <p>URL Security Analysis</p>
            </div>

          </div>

          <div className="probability">

            <div>
              <span>Risk Score</span>

              <strong>
                {urlResult.risk_score ?? 0}/100
              </strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(urlResult.risk_score) || 0
                    )
                  )}%`
                }}
              />
            </div>

          </div>

          <div className="explanation">

            <h4>
              <Activity size={18} />
              URL Analysis Details
            </h4>

            <p>
              <strong>Risk Level:</strong>{" "}
              {urlResult.risk_level || "Unknown"}
            </p>

            <p>
              <strong>Scanned URL:</strong>{" "}
              {urlResult.url}
            </p>

            <p>
              <strong>Detection Status:</strong>{" "}
              {urlResult.is_suspicious
                ? "Suspicious"
                : "Not flagged as suspicious"}
            </p>

            <h4>
              <AlertTriangle size={18} />
              Detection Reasons
            </h4>

            {Array.isArray(urlResult.reasons) &&
            urlResult.reasons.length > 0 ? (
              <ul>
                {urlResult.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            ) : urlResult.reasons &&
              typeof urlResult.reasons === "object" &&
              Object.keys(urlResult.reasons).length > 0 ? (
              <pre>
                {JSON.stringify(
                  urlResult.reasons,
                  null,
                  2
                )}
              </pre>
            ) : (
              <p>No suspicious indicators detected.</p>
            )}

          </div>

        </div>
      )}
    </>
  );

  // Show authentication page when logged out
  if (!isAuthenticated) {
    return (
      <AuthPages
        onAuthenticated={() => {
          setIsAuthenticated(true);
          setActiveTab("Dashboard");
        }}
      />
    );
  }

  return (
    <div className="app-container">

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>

        <div className="brand">

          <div className="brand-icon">
            <ShieldCheck size={27} />
          </div>

          <div>
            <h2>PhishShield</h2>
            <span>AI Security Platform</span>
          </div>

          <button
            className="close-menu"
            onClick={() => setMobileMenu(false)}
          >
            <X />
          </button>

        </div>

        <p className="menu-heading">MENU</p>

        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activeTab === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(item.name);
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom */}
        <div className="sidebar-bottom">

          <div className="security-card">
            <ShieldCheck size={24} />

            <h4>Stay Protected</h4>

            <p>
              Analyze suspicious messages before clicking any links.
            </p>
          </div>

          {/* Dynamic user profile */}
          <div className="profile">

            <div className="profile-avatar">
              {userInitial}
            </div>

            <div>
              <h4>{userName}</h4>
              <span>{userEmail}</span>
            </div>

          </div>

          {/* Logout button */}
          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* Mobile overlay */}
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* Main content */}
      <main className="main-content">

        <header className="topbar">

          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activeTab}</strong>
          </div>

          <div className="topbar-right">

            <span className="system-status">
              <span className="status-dot"></span>
              AI Protection Active
            </span>

            <div className="top-avatar">
              {userInitial}
            </div>

          </div>

        </header>

        {/* Admin Dashboard */}
        {activeTab === "Admin Dashboard" && isAdmin && (
          <section className="dashboard">

            <div className="welcome-section">

              <div>
                <p className="eyebrow">
                  PHISHSHIELD ADMINISTRATION
                </p>

                <h1>Admin Dashboard</h1>

                <p className="welcome-text">
                  Monitor registered users, scan activity and detected threats across PhishShield.
                </p>
              </div>

              <div className="welcome-icon">
                <ShieldCheck size={55} />
              </div>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "18px"
              }}
            >
              <button
                className="scan-button"
                onClick={loadAdminData}
                disabled={adminLoading}
              >
                <RefreshCw size={17} />
                {adminLoading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>

            {adminError && (
              <div className="error-message">
                <AlertTriangle size={18} />
                {adminError}
              </div>
            )}

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon purple">
                  <Users />
                </div>

                <div>
                  <p>Total Users</p>
                  <h2>{adminStats.total_users}</h2>
                  <span>Registered accounts</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">
                  <ScanSearch />
                </div>

                <div>
                  <p>Total Scans</p>
                  <h2>{adminStats.total_scans}</h2>
                  <span>Across all accounts</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon red">
                  <AlertTriangle />
                </div>

                <div>
                  <p>Threats Detected</p>
                  <h2>{adminStats.threats_detected}</h2>
                  <span>Phishing and suspicious scans</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <ShieldCheck />
                </div>

                <div>
                  <p>Safe Scans</p>
                  <h2>{adminStats.safe_scans}</h2>
                  <span>Detected as safe</span>
                </div>
              </div>

            </div>

            {/* Registered Users */}
            <div
              className="scanner-card"
              style={{
                marginTop: "24px",
                overflowX: "auto"
              }}
            >

              <div className="section-heading">

                <div>
                  <h2>Registered Users</h2>
                  <p>
                    View accounts and inspect each user's scan activity.
                  </p>
                </div>

                <span className="ai-badge">
                  <UserCheck size={15} />
                  {filteredAdminUsers.length} of {adminUsers.length} Accounts
                </span>

              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  margin: "18px 0"
                }}
              >

                <div
                  style={{
                    position: "relative",
                    flex: "1 1 260px"
                  }}
                >
                  <Search
                    size={17}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#7b8495"
                    }}
                  />

                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    placeholder="Search by name or email..."
                    style={{
                      width: "100%",
                      padding: "11px 12px 11px 38px",
                      border: "1px solid #d7dce5",
                      borderRadius: "8px",
                      font: "inherit"
                    }}
                  />
                </div>

                <select
                  value={adminRoleFilter}
                  onChange={(event) => setAdminRoleFilter(event.target.value)}
                  style={{
                    minWidth: "150px",
                    padding: "10px 12px",
                    border: "1px solid #d7dce5",
                    borderRadius: "8px",
                    background: "#fff",
                    font: "inherit"
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users</option>
                  <option value="admin">Admins</option>
                </select>

              </div>

              {adminLoading && adminUsers.length === 0 ? (
                <p>Loading registered users...</p>
              ) : adminUsers.length === 0 ? (
                <p>No registered users found.</p>
              ) : filteredAdminUsers.length === 0 ? (
                <p>No accounts match your search or selected role.</p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "650px"
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #e5e7eb"
                      }}
                    >
                      <th style={{ padding: "14px 10px" }}>User</th>
                      <th style={{ padding: "14px 10px" }}>Email</th>
                      <th style={{ padding: "14px 10px" }}>Role</th>
                      <th style={{ padding: "14px 10px" }}>Total Scans</th>
                      <th style={{ padding: "14px 10px" }}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAdminUsers.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid #edf0f4"
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 10px",
                            fontWeight: 600
                          }}
                        >
                          {user.name}
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          {user.email}
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background:
                                user.role === "admin"
                                  ? "#eee8ff"
                                  : "#e8f5ee",
                              color:
                                user.role === "admin"
                                  ? "#6941c6"
                                  : "#18794e"
                            }}
                          >
                            {user.role || "user"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          {user.total_scans}
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          <button
                            type="button"
                            onClick={() => loadSelectedUserScans(user)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              border: "1px solid #d7dce5",
                              borderRadius: "8px",
                              padding: "8px 11px",
                              background: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            <Eye size={15} />
                            View Scans
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>

            {/* Selected User Scan History */}
            {selectedAdminUser && (
              <div
                className="scanner-card"
                style={{ marginTop: "24px" }}
              >

                <div className="section-heading">

                  <div>
                    <h2>
                      Scan History: {selectedAdminUser.name}
                    </h2>

                    <p>{selectedAdminUser.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdminUser(null);
                      setSelectedUserScans([]);
                    }}
                    style={{
                      border: "1px solid #d7dce5",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>

                </div>

                {selectedUserLoading ? (
                  <p>Loading scan history...</p>
                ) : selectedUserScans.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>

                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "650px"
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb"
                          }}
                        >
                          <th style={{ padding: "12px 8px" }}>Type</th>
                          <th style={{ padding: "12px 8px" }}>Scanned Input</th>
                          <th style={{ padding: "12px 8px" }}>Result</th>
                          <th style={{ padding: "12px 8px" }}>Risk</th>
                          <th style={{ padding: "12px 8px" }}>Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedUserScans.map((scan) => (
                          <tr
                            key={scan.id}
                            style={{
                              borderBottom: "1px solid #edf0f4"
                            }}
                          >
                            <td style={{ padding: "12px 8px" }}>
                              {scan.scan_type}
                            </td>

                            <td
                              style={{
                                padding: "12px 8px",
                                maxWidth: "260px",
                                overflowWrap: "anywhere"
                              }}
                            >
                              {scan.scanned_input}
                            </td>

                            <td style={{ padding: "12px 8px" }}>
                              {scan.detection_status}
                            </td>

                            <td style={{ padding: "12px 8px" }}>
                              {scan.risk_level} ({scan.risk_score}/100)
                            </td>

                            <td style={{ padding: "12px 8px" }}>
                              {scan.created_at}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>
                ) : (
                  <p>This user has not performed any scans yet.</p>
                )}

              </div>
            )}

          </section>
        )}

        {/* Settings page */}
        {activeTab === "Settings" && (
          <SettingsPage
            onHistoryCleared={loadDashboardStats}
          />
        )}

        {/* Dashboard */}
        {activeTab === "Dashboard" && (
          <section className="dashboard">

            <div className="welcome-section">

              <div>
                <p className="eyebrow">
                  CYBERSECURITY INTELLIGENCE
                </p>

                <h1>Welcome to PhishShield</h1>

                <p className="welcome-text">
                  Protect yourself from phishing attacks with
                  AI-powered detection and explainable analysis.
                </p>
              </div>

              <div className="welcome-icon">
                <ShieldCheck size={55} />
              </div>

            </div>

            {/* Statistics */}
            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon purple">
                  <ScanSearch />
                </div>

                <div>
                  <p>Total Scans</p>
                  <h2>{stats.total_scans}</h2>
                  <span>All-time scans</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon red">
                  <AlertTriangle />
                </div>

                <div>
                  <p>Threats Detected</p>
                  <h2>{stats.threats_detected}</h2>
                  <span>Phishing and suspicious scans</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <ShieldCheck />
                </div>

                <div>
                  <p>Safe Scans</p>
                  <h2>{stats.safe_scans}</h2>
                  <span>Verified as safe by detection</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">
                  <Activity />
                </div>

                <div>
                  <p>Protection Status</p>
                  <h2 className="protected-text">Active</h2>
                  <span>AI detection enabled</span>
                </div>
              </div>

            </div>

            {/* Risk distribution */}
            <div className="scanner-card">

              <div className="section-heading">
                <div>
                  <h2>Risk Distribution</h2>
                  <p>Overview of detected security risks.</p>
                </div>
              </div>

              {["Low", "Medium", "High"].map((level) => {
                const count =
                  stats.risk_distribution?.[level] || 0;

                const percentage = stats.total_scans
                  ? (count / stats.total_scans) * 100
                  : 0;

                return (
                  <div className="probability" key={level}>

                    <div>
                      <span>{level} Risk</span>

                      <strong>
                        {count} ({percentage.toFixed(1)}%)
                      </strong>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`
                        }}
                      />
                    </div>

                  </div>
                );
              })}

              <div className="explanation">

                <p>
                  Message Scans:{" "}
                  <strong>{stats.message_scans}</strong>
                </p>

                <p>
                  URL Scans:{" "}
                  <strong>{stats.url_scans}</strong>
                </p>

              </div>

            </div>

            {/* Recent activity */}
            <div className="scanner-card">

              <div className="section-heading">
                <div>
                  <h2>Recent Scan Activity</h2>
                  <p>Your five most recent security scans.</p>
                </div>
              </div>

              {stats.recent_scans?.length > 0 ? (
                <div className="recent-scans">

                  {stats.recent_scans.map((scan) => (
                    <div
                      className="recent-scan-item"
                      key={scan.id}
                    >

                      <div>
                        <strong>{scan.scan_type} Scan</strong>
                        <p>{scan.scanned_input}</p>
                        <span>{scan.created_at}</span>
                      </div>

                      <div>
                        <strong>{scan.risk_score}/100</strong>
                        <p>{scan.detection_status}</p>
                        <span>{scan.risk_level} Risk</span>
                      </div>

                    </div>
                  ))}

                </div>
              ) : (
                <p>No scans available yet.</p>
              )}

            </div>

            {scannerContent}

            <footer className="footer">
              <p>
                © 2026 PhishShield. AI-Powered Cybersecurity Protection.
              </p>

              <span>
                Built with Machine Learning & Explainable AI
              </span>
            </footer>

          </section>
        )}

        {/* My Profile page */}
        {activeTab === "My Profile" && (
          <ProfilePage />
        )}

        {/* Scanner page */}
        {activeTab === "Scanner" && (
          <section className="dashboard">

            <div className="welcome-section">

              <div>
                <p className="eyebrow">
                  CYBERSECURITY INTELLIGENCE
                </p>

                <h1>Phishing Scanner</h1>

                <p className="welcome-text">
                  Analyze suspicious messages and URLs using
                  AI-powered detection.
                </p>
              </div>

              <div className="welcome-icon">
                <ScanSearch size={55} />
              </div>

            </div>

            {scannerContent}

          </section>
        )}

        {/* History page */}
        {activeTab === "History" && (
          <ScanHistory />
        )}

      </main>
    </div>
  );
}

export default App;
