import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "REPLACE_API_KEY",
  authDomain: "REPLACE_PROJECT.firebaseapp.com",
  projectId: "REPLACE_PROJECT_ID",
  storageBucket: "REPLACE_PROJECT.firebasestorage.app",
  messagingSenderId: "REPLACE_SENDER_ID",
  appId: "REPLACE_APP_ID",
  measurementId: "REPLACE_MEASUREMENT_ID"
};

let app = null;
let firebaseReady = false;
let firebaseConfigError = "";

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("REPLACE_")) {
    throw new Error("firebase-config.js n'est pas encore rempli");
  }
  app = initializeApp(firebaseConfig);
  firebaseReady = true;
} catch (error) {
  firebaseConfigError = error?.message || "Configuration Firebase invalide";
  console.warn("Firebase désactivé:", firebaseConfigError);
}

export { app, firebaseReady, firebaseConfigError, firebaseConfig };
