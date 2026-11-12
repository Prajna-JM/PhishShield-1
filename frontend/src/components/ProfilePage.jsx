import "./ProfilePage.css";
import React from "react";
import { User, Mail, Hash, ShieldCheck, Calendar } from "lucide-react";

function ProfilePage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const name = user.name || "User";
  const email = user.email || "Email not available";
  const userId = user.id || "Not available";

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>View your PhishShield account information</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {name.charAt(0).toUpperCase()}
        </div>

        <h2>{name}</h2>
        <p className="profile-role">PhishShield User</p>

        <div className="profile-details">
          <div className="profile-detail">
            <User />
            <div>
              <span>Full Name</span>
              <strong>{name}</strong>
            </div>
          </div>

          <div className="profile-detail">
            <Mail />
            <div>
              <span>Email Address</span>
              <strong>{email}</strong>
            </div>
          </div>

          <div className="profile-detail">
            <Hash />
            <div>
              <span>User ID</span>
              <strong>{userId}</strong>
            </div>
          </div>

          <div className="profile-detail">
            <ShieldCheck />
            <div>
              <span>Account Status</span>
              <strong>Active</strong>
            </div>
          </div>

          <div className="profile-detail">
            <Calendar />
            <div>
              <span>Platform</span>
              <strong>PhishShield AI Security</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
