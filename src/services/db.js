import { db } from '../config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DataService = {
    // --- Condomínios ---
    async createCondo(data) {
        return await addDoc(collection(db, "condominios"), {
            ...data,
            createdAt: new Date().toISOString()
        });
    },

    async getCondoName(condoId) {
        const snap = await getDoc(doc(db, "condominios", condoId));
        return snap.exists() ? snap.data().name : '';
    },

    // SUPER USER: Alterar Status
    async toggleCondoStatus(condoId, currentStatus) {
        const newStatus = !currentStatus; // Inverte
        const docRef = doc(db, "condominios", condoId);
        return await updateDoc(docRef, { suspended: newStatus });
    },

    listenCondos(callback) {
        return onSnapshot(collection(db, "condominios"), (snap) => {
            callback(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
    },

    // --- Espaços ---
    async addSpace(spaceData) {
        return await addDoc(collection(db, "spaces"), spaceData);
    },

    listenSpaces(condoId, callback) {
        const q = query(collection(db, "spaces"), where("condoId", "==", condoId));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
    },

    // --- Reservas ---
    async addReservation(resData) {
        return await addDoc(collection(db, "reservations"), resData);
    },

    async updateReservationStatus(id, status) {
        return await updateDoc(doc(db, "reservations", id), { status });
    },

    async deleteReservation(id) {
        return await deleteDoc(doc(db, "reservations", id));
    },

    listenReservations(condoId, callback) {
        const q = query(collection(db, "reservations"), where("condoId", "==", condoId));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
    }
};