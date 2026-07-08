import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);

export async function requestPermission() {
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function getFcmToken() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;
  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token;
  } catch (e) {
    console.error("FCM getToken failed:", e);
    return null;
  }
}

export async function saveTokenForTeam(uid, teamName, token) {
  try {
    await setDoc(doc(db, "fcm_tokens", uid), {
      teamName,
      token,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error("saveTokenForTeam failed:", e);
  }
}

export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}
