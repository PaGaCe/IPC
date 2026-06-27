// ─── Firebase Authentication (Google Sign-In) ───────────────────────────────
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Reuse the same Firebase app instance if firebaseStorage.js already
// initialized one, instead of calling initializeApp twice.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// ─── Sign in / sign out ──────────────────────────────────────────────────────
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (e) {
    console.error("signInWithGoogle failed:", e);
    throw e;
  }
}

export async function signOutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error("signOutUser failed:", e);
  }
}

// Calls `callback(user | null)` immediately and again whenever auth state
// changes (sign in, sign out, token refresh, page load with existing
// session). Returns an unsubscribe function.
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── User profile (which leagues this account belongs to) ───────────────────
// Stored at users/{uid} → { displayName, email, leagues: [{ code, teamName }] }
function userDocRef(uid) {
  return doc(db, "users", uid);
}

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(userDocRef(uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("getUserProfile failed:", e);
    return null;
  }
}

export async function ensureUserProfile(user) {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;
  const profile = {
    displayName: user.displayName || "Jugador",
    email: user.email || "",
    leagues: [],
  };
  await setDoc(userDocRef(user.uid), profile);
  return profile;
}

// Adds (or updates) a {code, teamName} entry in the user's league list.
// Safe to call repeatedly — replaces any existing entry for the same code.
export async function addLeagueToProfile(uid, code, teamName) {
  try {
    const profile = (await getUserProfile(uid)) || { displayName: "", email: "", leagues: [] };
    const otherLeagues = (profile.leagues || []).filter((l) => l.code !== code);
    const updated = { ...profile, leagues: [...otherLeagues, { code, teamName }] };
    await setDoc(userDocRef(uid), updated);
    return updated;
  } catch (e) {
    console.error("addLeagueToProfile failed:", e);
    return null;
  }
}

export async function removeLeagueFromProfile(uid, code) {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return null;
    const updated = { ...profile, leagues: (profile.leagues || []).filter((l) => l.code !== code) };
    await setDoc(userDocRef(uid), updated);
    return updated;
  } catch (e) {
    console.error("removeLeagueFromProfile failed:", e);
    return null;
  }
}