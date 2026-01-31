import { db } from '../config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DataService = {
    // Condomínios
    async createCondo(data) {
        return await addDoc(collection(db, "condominios"), { ...data, createdAt: new Date().toISOString() });
    },
    async getCondoName(id) {
        const snap = await getDoc(doc(db, "condominios", id));
        return snap.exists() ? snap.data().name : '';
    },
    async toggleCondoStatus(condoId, currentStatus) {
        const docRef = doc(db, "condominios", condoId);
        return await updateDoc(docRef, { suspended: !currentStatus });
    },
    listenCondos(cb) {
        return onSnapshot(collection(db, "condominios"), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()}))));
    },

    // Espaços
    async addSpace(data) { return await addDoc(collection(db, "spaces"), data); },
    listenSpaces(cid, cb) { 
        return onSnapshot(query(collection(db, "spaces"), where("condoId", "==", cid)), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()})))); 
    },

    // Reservas
    async addReservation(data) { return await addDoc(collection(db, "reservations"), data); },
    async updateReservationStatus(id, st) { return await updateDoc(doc(db, "reservations", id), { status: st }); },
    async deleteReservation(id) { return await deleteDoc(doc(db, "reservations", id)); },
    listenReservations(cid, cb) {
        return onSnapshot(query(collection(db, "reservations"), where("condoId", "==", cid)), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()}))));
    }
};