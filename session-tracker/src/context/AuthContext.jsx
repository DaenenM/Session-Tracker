// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

const ROLE_LEVELS = {
  admin: 3,
  staff: 2,
  user: 1,
  viewer: 0,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('viewer');
  const [userCoins, setUserCoins] = useState(0);
  const [userNameColor, setUserNameColor] = useState(null);
  const [userNameEmoji, setUserNameEmoji] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'user');
          setUserCoins(userData.coins || 0);
          setUserNameColor(userData.nameColor || null);
          setUserNameEmoji(userData.nameEmoji || null);
        } else {
          setUserRole('user');
          setUserCoins(0);
          setUserNameColor(null);
          setUserNameEmoji(null);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setUserRole('viewer');
        setUserCoins(0);
        setUserNameColor(null);
        setUserNameEmoji(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserCoins(userData.coins || 0);
        setUserNameColor(userData.nameColor || null);
        setUserNameEmoji(userData.nameEmoji || null);
      }
    });

    return unsubscribe;
  }, [user]);

  const register = async (email, password, displayName) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      await updateProfile(firebaseUser, { displayName });

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || displayName || 'User',
        role: 'user',
        createdAt: new Date().toISOString(),
        coins: 100,
        xp: 0,
      });

      setUserRole('user');
      return firebaseUser;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : 'user';
      setUserRole(role);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      } else {
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
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(err.code));
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole('viewer');
    setUserNameColor(null);
    setUserNameEmoji(null);
  };

  const hasRole = (requiredRole) => {
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
  };

  const isAdmin = () => userRole === 'admin';
  const isStaff = () => hasRole('staff');
  const isUser = () => hasRole('user');
  const isAuthenticated = () => user !== null;

  const value = {
    user,
    userRole,
    userCoins,
    userNameColor,
    userNameEmoji,
    loading,
    error,
    setError,
    register,
    login,
    loginWithGoogle,
    logout,
    hasRole,
    isAdmin,
    isStaff,
    isUser,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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