/* Firebase Cloud Messaging service worker — web push background delivery.
 * Public web config is embedded so a browser-restarted worker can receive push.
 * Do not put Admin secrets or LumenX business data here.
 * Do not use Firestore / Realtime Database / Storage.
 */
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBl3yrf7F19CvhJBx_awMfUh7WvfyrsYc0",
  authDomain: "lumenx-2026.firebaseapp.com",
  projectId: "lumenx-2026",
  storageBucket: "lumenx-2026.firebasestorage.app",
  messagingSenderId: "197601219106",
  appId: "1:197601219106:web:8b1270e698960f3e99307b",
};

let messagingInitialized = false;

function ensureBackgroundMessaging(config) {
  if (messagingInitialized) return;
  if (
    !config ||
    !config.apiKey ||
    !config.projectId ||
    !config.appId ||
    !config.messagingSenderId
  ) {
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId,
      });
    }
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title =
        (payload.notification && payload.notification.title) ||
        (payload.data && payload.data.title) ||
        "LumenX";
      const body =
        (payload.notification && payload.notification.body) ||
        (payload.data && payload.data.body) ||
        "";
      const data = payload.data || {};
      return self.registration.showNotification(title, {
        body,
        data,
        icon: "/favicon.ico",
      });
    });
    messagingInitialized = true;
  } catch (_err) {
    // Background messaging is best-effort; foreground path still works.
  }
}

ensureBackgroundMessaging(DEFAULT_FIREBASE_CONFIG);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CLIENT_CONFIG") {
    ensureBackgroundMessaging(event.data.config);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    (event.notification &&
      event.notification.data &&
      (event.notification.data.href ||
        (event.notification.data.FCM_MSG &&
          event.notification.data.FCM_MSG.data &&
          event.notification.data.FCM_MSG.data.href))) ||
    null;
  if (href && self.clients) {
    event.waitUntil(self.clients.openWindow(href));
  }
});
