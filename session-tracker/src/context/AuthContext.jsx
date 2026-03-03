// src/context/AuthContext.jsx

// React hooks for state management and side effects
import { createContext, useContext, useState, useEffect } from 'react';

// Firebase Auth methods
import {
  onAuthStateChanged,                // Listener that fires whenever login state changes (login, logout, page load)
  createUserWithEmailAndPassword,     // Creates a new user account with email + password
  signInWithEmailAndPassword,         // Signs in an existing user with email + password
  signInWithPopup,                    // Opens a popup window for third-party auth (Google)
  GoogleAuthProvider,                 // Provider config for Google sign-in
  signOut,                            // Signs out the current user
  updateProfile                       // Updates user profile fields (displayName, photoURL)
} from 'firebase/auth';

// Firestore methods for reading/writing user data
import {
  doc,         // Reference a specific document (e.g., 'users/abc123')
  getDoc,      // Fetch a document once (not real-time)
  setDoc,      // Create or overwrite a document
  onSnapshot   // Real-time listener — fires callback whenever the document changes
} from 'firebase/firestore';

import { auth, db } from '../firebase'; // Firebase Auth and Firestore instances

// Create the context that components will consume via useAuth()
const AuthContext = createContext(null);

// Google auth provider instance (reused for all Google sign-ins)
const googleProvider = new GoogleAuthProvider();

// Role hierarchy — higher number = more permissions
// Used by hasRole() to check if a user meets a minimum role requirement
const ROLE_LEVELS = {
  admin: 3,   // Full access — can do everything
  staff: 2,   // Can access the counter/session tracker
  user: 1,    // Standard logged-in user — can bet, view stats, use shop
  viewer: 0,  // Not logged in — can only view public pages like Live
};

export function AuthProvider({ children }) {
  // --- Core auth state ---
  const [user, setUser] = useState(null);              // Firebase Auth user object (null if logged out)
  const [userRole, setUserRole] = useState('viewer');   // Role from Firestore ('admin', 'staff', 'user', 'viewer')
  const [userCoins, setUserCoins] = useState(0);        // Coin balance (updated in real-time via onSnapshot)
  const [userNameColor, setUserNameColor] = useState(null);  // Equipped name color from shop (e.g., '#f87171')
  const [userNameEmoji, setUserNameEmoji] = useState(null);  // Equipped name emoji from shop (e.g., '🔥')
  const [loading, setLoading] = useState(true);         // True until initial auth check completes
  const [error, setError] = useState(null);             // Stores friendly error messages for the UI

  // --- Auth state listener ---
  // Runs once on mount. Firebase calls this whenever the user logs in, logs out, or the page loads.
  // Fetches the user's Firestore document to get their role, coins, and cosmetics.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in — fetch their data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'user');
          setUserCoins(userData.coins || 0);
          setUserNameColor(userData.nameColor || null);
          setUserNameEmoji(userData.nameEmoji || null);
        } else {
          // User exists in Auth but not Firestore (shouldn't happen normally)
          setUserRole('user');
          setUserCoins(0);
          setUserNameColor(null);
          setUserNameEmoji(null);
        }
        setUser(firebaseUser);
      } else {
        // User is logged out — reset everything
        setUser(null);
        setUserRole('viewer');
        setUserCoins(0);
        setUserNameColor(null);
        setUserNameEmoji(null);
      }
      setLoading(false); // Auth check is done, app can render
    });

    return unsubscribe; // Cleanup listener on unmount
  }, []);

  // --- Real-time user data listener ---
  // Subscribes to the user's Firestore document so coins and cosmetics update instantly
  // when they place a bet, buy from shop, win a bet, etc. — no page refresh needed.
  useEffect(() => {
    if (!user) return; // Don't listen if no one is logged in

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserCoins(userData.coins || 0);
        setUserNameColor(userData.nameColor || null);
        setUserNameEmoji(userData.nameEmoji || null);
      }
    });

    return unsubscribe; // Cleanup listener on unmount or when user changes
  }, [user]);

  // --- Register a new user with email/password ---
  // Creates the Auth account, sets their display name, then creates their Firestore document
  // with starting values (100 coins, 0 XP)
  const register = async (email, password, displayName) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Set the display name on the Auth profile
      await updateProfile(firebaseUser, { displayName });

      // Create the user's Firestore document with default values
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || displayName || 'User',
        role: 'user',
        createdAt: new Date().toISOString(),
        coins: 100,   // Starting coins
        xp: 0,        // Starting XP (total XP — level is calculated client-side)
      });

      setUserRole('user');
      return firebaseUser;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // --- Sign in with email/password ---
  const login = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Fetch role from Firestore (onSnapshot will handle coins/cosmetics)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : 'user';
      setUserRole(role);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  // --- Sign in with Google ---
  // Works for both new and returning users.
  // If no Firestore document exists, creates one (same as register).
  const loginWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        // Returning user — just load their role
        setUserRole(userDoc.data().role);
      } else {
        // New user via Google — create their Firestore document
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          role: 'user',
          createdAt: new Date().toISOString(),
          coins: 100,
          xp: 0,
        });
        setUserRole('user');
      }

      return firebaseUser;
    } catch (err) {
      // Don't show an error if the user just closed the Google popup
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(err.code));
      }
      throw err;
    }
  };

  // --- Sign out ---
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole('viewer');
    setUserNameColor(null);
    setUserNameEmoji(null);
  };

  // --- Role check helpers ---
  // hasRole('staff') returns true if the user is staff OR admin (checks hierarchy)
  const hasRole = (requiredRole) => {
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
  };

  const isAdmin = () => userRole === 'admin';
  const isStaff = () => hasRole('staff');     // true for staff AND admin
  const isUser = () => hasRole('user');       // true for user, staff, AND admin
  const isAuthenticated = () => user !== null; // true if anyone is logged in

  // Everything exposed to components via useAuth()
  const value = {
    user,              // Firebase Auth user object
    userRole,          // 'admin' | 'staff' | 'user' | 'viewer'
    userCoins,         // Current coin balance (real-time)
    userNameColor,     // Equipped name color or null
    userNameEmoji,     // Equipped name emoji or null
    loading,           // True during initial auth check
    error,             // Current error message or null
    setError,          // Clear or set error manually
    register,          // Register with email/password
    login,             // Login with email/password
    loginWithGoogle,   // Login/register with Google
    logout,            // Sign out
    hasRole,           // Check if user meets a minimum role
    isAdmin,           // Shorthand: is admin?
    isStaff,           // Shorthand: is staff or above?
    isUser,            // Shorthand: is user or above?
    isAuthenticated,   // Shorthand: is anyone logged in?
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook that components use to access auth state and methods
// Must be used inside <AuthProvider> or it throws an error
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Converts Firebase error codes into user-friendly messages
function getErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/popup-closed-by-user':
      return 'Process canceled, try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    default:
      return 'Something went wrong. Please try again.';
  }
}