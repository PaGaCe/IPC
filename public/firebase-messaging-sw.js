importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCr1CbVUnH7fqgg18dZTyxtZkmPvvMOkNw",
  authDomain: "ipc-app-9fd14.firebaseapp.com",
  projectId: "ipc-app-9fd14",
  storageBucket: "ipc-app-9fd14.firebasestorage.app",
  messagingSenderId: "607771369948",
  appId: "1:607771369948:web:46053f43c90b571e326f19",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.data || {};
  self.registration.showNotification(title || "IPC Liga", {
    body: body || "",
    icon: icon || "/favicon.svg",
    data: data || {},
  });
});
