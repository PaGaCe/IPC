// ─── Firebase setup ──────────────────────────────────────────────────────────
// Fill in your own Firebase project config below (from Firebase Console →
// Project Settings → General → "Your apps" → SDK setup and configuration).
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Storage shim ─────────────────────────────────────────────────────────
// Mirrors the same shape as the old Claude artifact `window.storage` API:
//   get(key, shared?)    → { key, value, shared } | null
//   set(key, value, shared?) → { key, value, shared } | null
//   delete(key, shared?) → { key, deleted, shared } | null
//
// "shared" data and "private" (per-device) data are stored in different
// Firestore collections so they never collide:
//   shared:  collection "shared_state"   doc id = key
//   private: collection "device_state"   doc id = deviceId + "_" + key
//
// Private/per-device data doesn't make as much sense in a real multi-user
// web app (there's no Claude "device" concept), so we derive a stable
// per-browser id and store it in localStorage just for this purpose.

function getDeviceId() {
  let id = localStorage.getItem("fifaLigaDeviceId");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("fifaLigaDeviceId", id);
  }
  return id;
}

function resolveDocRef(key, shared) {
  if (shared) {
    return doc(db, "shared_state", key);
  }
  const deviceId = getDeviceId();
  return doc(db, "device_state", `${deviceId}_${key}`);
}

export const storage = {
  async get(key, shared = false) {
    try {
      const ref = resolveDocRef(key, shared);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data();
      return { key, value: data.value, shared: !!shared };
    } catch (e) {
      console.error("storage.get failed:", e);
      return null;
    }
  },

  async set(key, value, shared = false) {
    try {
      const ref = resolveDocRef(key, shared);
      await setDoc(ref, { value, updatedAt: Date.now() });
      return { key, value, shared: !!shared };
    } catch (e) {
      console.error("storage.set failed:", e);
      return null;
    }
  },

  async delete(key, shared = false) {
    try {
      const ref = resolveDocRef(key, shared);
      await deleteDoc(ref);
      return { key, deleted: true, shared: !!shared };
    } catch (e) {
      console.error("storage.delete failed:", e);
      return null;
    }
  },

  // Real-time subscription — NEW capability not available in the old
  // Claude-artifact storage. Replaces manual polling with instant push
  // updates whenever the shared document changes (e.g. another player
  // joins the league, places a bid, or the admin starts the tournament).
  //
  // Usage:
  //   const unsubscribe = storage.subscribe(key, (value) => { ... }, true);
  //   // later: unsubscribe();
  subscribe(key, callback, shared = true) {
    const ref = resolveDocRef(key, shared);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        callback(snap.data().value);
      },
      (err) => {
        console.error("storage.subscribe error:", err);
      }
    );
    return unsub;
  },
};

export default storage;
