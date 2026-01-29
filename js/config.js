// Configuração e inicialização do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDeWvVtINqz07UK-iCZwG8-rfBJN7insDM", // Substitua se necessário
    authDomain: "condosaas-app.firebaseapp.com",
    projectId: "condosaas-app"
};

let app, db, auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error('Erro Firebase:', error);
}

export { app, db, auth, firebaseConfig };