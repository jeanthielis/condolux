import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const EMAIL_CONFIG = {
    PUBLIC_KEY: "YUkpAHaDZ8R5SJveC",
    SERVICE_ID: "service_xk0afvt",
    TEMPLATE_ID: "template_i3smkw1"
};

const firebaseConfig = {
    apiKey: "AIzaSyDeWvVtINqz07UK-iCZwG8-rfBJN7insDM",
    authDomain: "condosaas-app.firebaseapp.com",
    projectId: "condosaas-app",
    storageBucket: "condosaas-app.firebasestorage.app",
    messagingSenderId: "1094942324011",
    appId: "1:1094942324011:web:49293ce94269e71807416e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);