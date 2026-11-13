
import { useState } from "react";
import "./AuthPages.css";

const API = "https://phishshield-1-backend.onrender.com/api/auth";

function AuthPages({ onAuthenticated }) {
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onAuthenticated();
    } catch (err) {
      setError(err.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (registerData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccess("Account created successfully! Please log in.");
      setRegisterData({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
      setPage("login");
    } catch (err) {
      setError(err.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const changePage = (nextPage) => {
    setError("");
    setSuccess("");
    setPage(nextPage);
  };

  return (
    <div className="auth-container">
      <nav className="auth-navbar">
        <div className="auth-logo" onClick={() => changePage("home")}>
          <span className="logo-icon">🛡️</span>
          PhishShield
        </div>

        <div className="auth-nav-links">
          <button onClick={() => changePage("home")}>Home</button>
          <button onClick={() => changePage("login")}>Login</button>
          <button className="nav-register" onClick={() => changePage("register")}>
            Register
          </button>
        </div>
      </nav>

      {page === "home" && (
        <section className="auth-hero">
          <div className="hero-content">
            <span className="hero-tag">AI POWERED CYBERSECURITY</span>

            <h1>
              Stay Safe From
              <span> Phishing Attacks</span>
            </h1>

            <p>
              PhishShield uses Artificial Intelligence and Machine Learning
              to identify suspicious URLs and protect you from online fraud.
            </p>

            <div className="hero-buttons">
              <button onClick={() => changePage("register")}>
                Get Started →
              </button>
              <button className="secondary-btn" onClick={() => changePage("login")}>
                Login
              </button>
            </div>

            <div className="hero-features">
              <div>
                <span>🔍</span>
                <h3>URL Detection</h3>
                <p>Identify suspicious links.</p>
              </div>
              <div>
                <span>🤖</span>
                <h3>AI Analysis</h3>
                <p>Intelligent threat detection.</p>
              </div>
              <div>
                <span>🔐</span>
                <h3>Secure Access</h3>
                <p>Protected user accounts.</p>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="shield-circle">
              <span>🛡️</span>
            </div>
            <h2>Your Digital Safety Matters</h2>
            <p>Detect. Analyze. Protect.</p>
          </div>
        </section>
      )}

      {page === "login" && (
        <section className="auth-form-section">
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-icon">🛡️</div>
            <h1>Welcome Back</h1>
            <p>Login to your PhishShield account</p>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
              required
            />

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="form-switch">
              Don't have an account?
              <span onClick={() => changePage("register")}> Register</span>
            </p>
          </form>
        </section>
      )}

      {page === "register" && (
        <section className="auth-form-section">
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-icon">🛡️</div>
            <h1>Create Account</h1>
            <p>Join PhishShield and stay protected</p>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={registerData.name}
              onChange={(e) =>
                setRegisterData({ ...registerData, name: e.target.value })
              }
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={registerData.email}
              onChange={(e) =>
                setRegisterData({ ...registerData, email: e.target.value })
              }
              required
            />

            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? "text" : "password"}
              placeholder="Enter password"
    value={registerData.password}
    onChange={(e) =>
      setRegisterData({
        ...registerData,
        password: e.target.value
      })
    }
    required
  />
  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>

            <label>Confirm Password</label>
            <div className="password-wrapper">
  <input
    type={showConfirmPassword ? "text" : "password"}
    placeholder="Confirm password"
    value={registerData.confirmPassword}
    onChange={(e) =>
      setRegisterData({
        ...registerData,
        confirmPassword: e.target.value
      })
    }
    required
  />
  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  >
    {showConfirmPassword ? "Hide" : "Show"}
  </button>
</div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="form-switch">
              Already have an account?
              <span onClick={() => changePage("login")}> Login</span>
            </p>
          </form>
        </section>
      )}

      <footer className="auth-footer">
        © 2026 PhishShield. AI-Powered Phishing Protection.
      </footer>
    </div>
  );
}

export default AuthPages;
