import { db } from '../config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DataService = {
    // --- CONDOMÍNIOS ---
    async createCondo(data) {
        return await addDoc(collection(db, "condominios"), { ...data, createdAt: new Date().toISOString() });
    },
    async getCondoDetails(id) {
        const snap = await getDoc(doc(db, "condominios", id));
        return snap.exists() ? snap.data() : null;
    },
    async toggleCondoStatus(condoId, currentStatus) {
        const docRef = doc(db, "condominios", condoId);
        return await updateDoc(docRef, { suspended: !currentStatus });
    },
    listenCondos(cb) {
        return onSnapshot(collection(db, "condominios"), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()}))));
    },

    // --- ESPAÇOS ---
    async addSpace(data) { return await addDoc(collection(db, "spaces"), data); },
    async deleteSpace(id) { return await deleteDoc(doc(db, "spaces", id)); },
    listenSpaces(cid, cb) { 
        return onSnapshot(query(collection(db, "spaces"), where("condoId", "==", cid)), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()})))); 
    },

    // --- RESERVAS ---
    async addReservation(data) { return await addDoc(collection(db, "reservations"), data); },
    async updateReservationStatus(id, st) { return await updateDoc(doc(db, "reservations", id), { status: st }); },
    async deleteReservation(id) { return await deleteDoc(doc(db, "reservations", id)); },
    listenReservations(cid, cb) {
        return onSnapshot(query(collection(db, "reservations"), where("condoId", "==", cid)), (s) => cb(s.docs.map(d => ({id: d.id, ...d.data()}))));
    },

    // --- MORADORES (ATUALIZADO COM LIMIT) ---
    listenResidents(condoId, cb) {
        const q = query(
            collection(db, "users"), 
            where("condoId", "==", condoId), 
            where("type", "==", "resident"),
            limit(10) // <--- AQUI ESTÁ A REGRA DO LIMITE
        );
        return onSnapshot(q, (snap) => {
            cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    async toggleUserBlock(userId, currentStatus) {
        await updateDoc(doc(db, "users", userId), { blocked: !currentStatus });
    },

    async addUserCredit(userId, amount) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const current = Number(userSnap.data().credits || 0);
            await updateDoc(userRef, { credits: current + Number(amount) });
        }
    },
    listenStaff(condoId, cb) {
        // Busca usuários que já são 'staff'
        const q = query(collection(db, "users"), where("condoId", "==", condoId), where("type", "==", "staff"));
        return onSnapshot(q, (snap) => {
            cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    // 2. Transforma um morador em Staff ou cria um convite
    // OBS: Para simplificar, o síndico cadastra o email. 
    // Se o usuário já existe, atualiza para staff. Se não, cria um "convite" (lógica tratada no main.js/cadastro).
    async promoteUserToStaff(email, condoId) {
        // Procura se o usuário já existe
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            // Usuário existe: Atualiza para Staff
            const userDoc = snap.docs[0];
            await updateDoc(doc(db, "users", userDoc.id), { type: 'staff', condoId: condoId });
            return "Atualizado";
        } else {
            // Usuário não existe: Criamos um registro na coleção 'staff_invites' (Você precisa criar essa lógica no cadastro se quiser automático, 
            // mas para este MVP, vamos assumir que o porteiro se cadastra como morador primeiro e o síndico promove ele).
            return "UserNotFound"; 
        }
    },

    async demoteStaffToResident(userId) {
        await updateDoc(doc(db, "users", userId), { type: 'resident' });
    },
    async updateReservationLists(id, data) {
        // data deve conter { guests: [...], suppliers: [...] }
        return await updateDoc(doc(db, "reservations", id), data);
    }
};