// src/components/RouteGuard.jsx
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Wraps a page component and enforces role-based access
// requiredRole: 'admin' | 'staff' | 'user' | 'viewer' (default)
// onNavigate: function to redirect if access denied
// fallback: optional custom component to show if denied

export default function RouteGuard({
  children,
  requiredRole = 'viewer',
  onNavigate,
  fallback = null,
}) {
  const { loading, hasRole, isAuthenticated } = useAuth();

  // Redirect to login AFTER render (avoids setState-during-render error)
  useEffect(() => {
    if (!loading && !hasRole(requiredRole) && !isAuthenticated() && requiredRole !== 'viewer') {
      onNavigate?.('/login');
    }
  }, [loading, requiredRole]);

  // Show nothing while auth state is loading
  if (loading) {
    return (
      <div className="guard-loading">
        <div className="guard-spinner"></div>
      </div>
    );
  }

  // Check if user has the required role
  if (!hasRole(requiredRole)) {
    // If not authenticated, useEffect handles redirect — render nothing
    if (!isAuthenticated() && requiredRole !== 'viewer') {
      return null;
    }

    // Authenticated but wrong role — show access denied
    return fallback || (
      <div className="guard-denied">
        <div className="guard-denied-card">
          <span className="guard-denied-icon">🔒</span>
          <h2 className="guard-denied-title">Access Restricted</h2>
          <p className="guard-denied-text">
            This page requires {requiredRole} access.
          </p>
          {onNavigate && (
            <div className="guard-denied-actions">
              <button
                className="guard-btn guard-btn-secondary"
                onClick={() => onNavigate('/')}
              >
                Go Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return children;
}
