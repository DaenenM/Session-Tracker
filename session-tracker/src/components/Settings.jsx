// src/components/Settings.jsx
import { useState } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../css/Settings.css';

export default function Settings({ onNavigate }) {
  const { user, userRole, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saveStatus, setSaveStatus] = useState(null);
  const [resetStatus, setResetStatus] = useState(null);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;

    setSaveStatus('saving');
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to update name:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setResetStatus('sending');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetStatus('sent');
      setTimeout(() => setResetStatus(null), 4000);
    } catch (err) {
      console.error('Failed to send reset email:', err);
      setResetStatus('error');
      setTimeout(() => setResetStatus(null), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.('/');
  };

  // Format the account creation date
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const roleBadge = {
    admin: { label: 'Admin', className: 'role-admin' },
    staff: { label: 'Staff', className: 'role-staff' },
    user: { label: 'User', className: 'role-user' },
    viewer: { label: 'Viewer', className: 'role-viewer' },
  };

  const currentRole = roleBadge[userRole] || roleBadge.user;

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1 className="settings-title">Account Settings</h1>

        {/* ── Profile Card ── */}
        <div className="settings-card">
          <h2 className="settings-card-title">Profile</h2>

          <div className="settings-info-row">
            <div className="settings-info-item">
              <span className="settings-info-label">Email</span>
              <span className="settings-info-value">{user?.email || '—'}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Role</span>
              <span className={`settings-role-badge ${currentRole.className}`}>
                {currentRole.label}
              </span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Member Since</span>
              <span className="settings-info-value">{memberSince}</span>
            </div>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-name">Display Name</label>
            <div className="settings-input-row">
              <input
                id="settings-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="settings-input"
                placeholder="Your display name"
              />
              <button
                className={`settings-save-btn ${saveStatus || ''}`}
                onClick={handleSaveName}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' :
                 saveStatus === 'saved' ? '✓ Saved' :
                 saveStatus === 'error' ? 'Error' :
                 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Security Card ── */}
        <div className="settings-card">
          <h2 className="settings-card-title">Security</h2>

          <div className="settings-action-row">
            <div className="settings-action-info">
              <span className="settings-action-title">Reset Password</span>
              <span className="settings-action-desc">
                We'll send a password reset link to <strong>{user?.email}</strong>
              </span>
            </div>
            <button
              className={`settings-action-btn reset-pw ${resetStatus || ''}`}
              onClick={handlePasswordReset}
              disabled={resetStatus === 'sending'}
            >
              {resetStatus === 'sending' ? 'Sending...' :
               resetStatus === 'sent' ? '✓ Email Sent' :
               resetStatus === 'error' ? 'Error' :
               'Send Reset Email'}
            </button>
          </div>

          {resetStatus === 'sent' && (
            <div className="settings-reset-notice">
              Check your inbox for the reset link. It may take a minute to arrive.
            </div>
          )}
        </div>

        {/* ── Account Actions ── */}
        <div className="settings-card">
          <h2 className="settings-card-title">Account</h2>

          <div className="settings-action-row">
            <div className="settings-action-info">
              <span className="settings-action-title">Sign Out</span>
              <span className="settings-action-desc">Sign out of your account on this device.</span>
            </div>
            <button className="settings-action-btn logout" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
