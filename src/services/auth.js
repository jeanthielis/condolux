import { auth, db } from '../config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const AuthService = {
    async login(email, password) { return await signInWithEmailAndPassword(auth, email, password); },
    async logout() { return await signOut(auth); },
    async register(userData) {
        const condoRef = doc(db, "condominios", userData.condoId);
        const condoSnap = await getDoc(condoRef);
        if (!condoSnap.exists()) throw new Error("Código inválido!");
        const cred = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        await setDoc(doc(db, "users", cred.user.uid), { name: userData.name, apartment: userData.apartment, email: userData.email, type: 'resident', condoId: userData.condoId });
        return cred.user;
    },
    async createSyndicUser(data, condoId) {
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await setDoc(doc(db, "users", cred.user.uid), { name: data.name, email: data.email, type: 'syndic', condoId: condoId });
        return cred.user;
    },
    async getUserProfile(uid) {
        const docSnap = await getDoc(doc(db, "users", uid));
        return docSnap.exists() ? docSnap.data() : null;
    }
};
