import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAq95avSxSN0IUtxIeyr-aY5RHfVHn-zA",
  authDomain: "session-tracker-essentially.firebaseapp.com",
  projectId: "session-tracker-essentially",
  storageBucket: "session-tracker-essentially.firebasestorage.app",
  messagingSenderId: "890540530111",
  appId: "1:890540530111:web:250b392c4e998c3493a90a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;