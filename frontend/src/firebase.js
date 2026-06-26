import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if the required Firebase config parameters are provided
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let auth;
let db;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Auth/Firestore:", error);
  }
}

// Log letter export to firestore or localStorage
const logLetterExport = async (email, company, refNumber, subject, type = 'letter', amount = 0, currency = '') => {
  const logData = {
    email: email || 'unknown@company.com',
    company: company || 'Unknown Company',
    ref_number: refNumber || 'N/A',
    subject: subject || 'N/A',
    timestamp: new Date().toISOString(),
    type: type,
    amount: amount,
    currency: currency
  };

  if (isConfigured && db) {
    try {
      await addDoc(collection(db, 'letter_logs'), logData);
    } catch (error) {
      console.error("Error writing audit log to Firestore:", error);
    }
  } else {
    try {
      const logs = JSON.parse(localStorage.getItem('mock_letter_logs') || '[]');
      logs.push({ id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, ...logData });
      localStorage.setItem('mock_letter_logs', JSON.stringify(logs));
    } catch (error) {
      console.error("Error writing audit log to localStorage:", error);
    }
  }
};


// Sync user profile on login and return their profile with role
const syncUserProfile = async (firebaseUser) => {
  if (!firebaseUser) return null;

  const email = firebaseUser.email || '';
  const isSuperAdmin = email.toLowerCase() === 'hanibafaqih@gmail.com';
  
  if (isConfigured && db) {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      let role = isSuperAdmin ? 'admin' : 'user';
      let existingData = {};

      if (userSnap.exists()) {
        existingData = userSnap.data();
        // If they already have a role, keep it unless they are the super admin (who must always be admin)
        if (existingData.role) {
          role = isSuperAdmin ? 'admin' : existingData.role;
        }
      }

      const profileData = {
        uid: firebaseUser.uid,
        email: email,
        displayName: firebaseUser.displayName || email.split('@')[0] || 'مستخدم',
        role: role,
        lastLogin: new Date().toISOString()
      };

      await setDoc(userRef, profileData, { merge: true });
      return profileData;
    } catch (error) {
      console.error("Error syncing user profile in Firestore:", error);
      // Fallback profile if Firestore fails
      return {
        uid: firebaseUser.uid,
        email: email,
        displayName: firebaseUser.displayName || email.split('@')[0] || 'مستخدم',
        role: isSuperAdmin ? 'admin' : 'user'
      };
    }
  } else {
    // Mock user sync using localStorage
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      let userProfile = users.find(u => u.uid === firebaseUser.uid);

      let role = isSuperAdmin ? 'admin' : 'user';
      if (userProfile && userProfile.role) {
        role = isSuperAdmin ? 'admin' : userProfile.role;
      }

      const profileData = {
        uid: firebaseUser.uid,
        email: email,
        displayName: firebaseUser.displayName || email.split('@')[0] || 'مستخدم',
        role: role,
        lastLogin: new Date().toISOString()
      };

      if (userProfile) {
        Object.assign(userProfile, profileData);
      } else {
        users.push(profileData);
      }

      localStorage.setItem('mock_users', JSON.stringify(users));
      return profileData;
    } catch (error) {
      console.error("Error syncing mock user profile:", error);
      return {
        uid: firebaseUser.uid,
        email: email,
        displayName: email.split('@')[0] || 'مستخدم',
        role: isSuperAdmin ? 'admin' : 'user'
      };
    }
  }
};

// Fetch letter logs
const fetchLetterLogs = async () => {
  if (isConfigured && db) {
    try {
      const q = query(collection(db, 'letter_logs'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return logs;
    } catch (error) {
      console.error("Error fetching audit logs from Firestore:", error);
      return [];
    }
  } else {
    try {
      const logs = JSON.parse(localStorage.getItem('mock_letter_logs') || '[]');
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      return [];
    }
  }
};

// Fetch all users
const fetchUsers = async () => {
  if (isConfigured && db) {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error("Error fetching users from Firestore:", error);
      return [];
    }
  } else {
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      return users;
    } catch (error) {
      return [];
    }
  }
};

// Update user role
const updateUserRole = async (uid, newRole) => {
  if (isConfigured && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      return true;
    } catch (error) {
      console.error("Error updating user role in Firestore:", error);
      return false;
    }
  } else {
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const userIndex = users.findIndex(u => u.uid === uid);
      if (userIndex !== -1) {
        users[userIndex].role = newRole;
        localStorage.setItem('mock_users', JSON.stringify(users));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
};

// Mock auth helper for local testing when Firebase configuration is missing
const mockAuth = {
  signIn: async (email, password) => {
    // Artificial latency for premium feel
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Accept standard emails for testing
    if (email.includes('@') && password.length >= 6) {
      return {
        user: {
          email,
          uid: `mock-uid-${Date.now()}`,
          displayName: email.split('@')[0],
          isMock: true
        }
      };
    } else {
      throw new Error('البريد الإلكتروني غير صالح أو كلمة المرور قصيرة جداً (الحد الأدنى 6 أحرف).');
    }
  },
  signOut: async () => {
    return true;
  }
};

export { 
  auth, 
  isConfigured, 
  mockAuth, 
  signInWithEmailAndPassword, 
  signOut,
  logLetterExport,
  syncUserProfile,
  fetchLetterLogs,
  fetchUsers,
  updateUserRole
};
