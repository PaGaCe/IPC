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
const db = getFirestore(app);

let messagingInstance = null;

function getMessagingInstance() {
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.error("FCM getMessaging failed:", e);
      return null;
    }
  }
  return messagingInstance;
}

export function getPermissionStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission() {
  if (!("Notification" in window)) {
    console.warn("FCM: Notifications not supported in this browser");
    return false;
  }

  if (Notification.permission === "denied") {
    console.warn("FCM: Permission previously denied. User must reset in browser settings.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  console.log("FCM: Permission result:", permission);
  return permission === "granted";
}

export async function getFcmToken() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error("FCM: VITE_FIREBASE_VAPID_KEY is not set");
    return null;
  }

  const messaging = getMessagingInstance();
  if (!messaging) return null;

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    console.log("FCM: Token obtained:", token?.substring(0, 20) + "...");
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
    console.log("FCM: Token saved for team", teamName);
  } catch (e) {
    console.error("saveTokenForTeam failed:", e);
  }
}

export function onForegroundMessage(callback) {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}
