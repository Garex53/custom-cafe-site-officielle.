import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkzbbSR0ApyDD3rT6yNo0EggG7nbZmeYE",
  authDomain: "custom-cafe-site-officielle.firebaseapp.com",
  projectId: "custom-cafe-site-officielle",
  storageBucket: "custom-cafe-site-officielle.firebasestorage.app",
  messagingSenderId: "456151591360",
  appId: "1:456151591360:web:ba09a241b2a8897df84025",
  measurementId: "G-W19VHPXMYV"
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
