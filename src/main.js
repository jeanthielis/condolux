import { createApp, onMounted, computed, ref, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, EMAIL_CONFIG } from './config.js';
import { AuthService } from './services/auth.js';
import { DataService } from './services/db.js';
import { store } from './store.js';
import { useAuth } from './controllers/useAuth.js';
import { useCalendar } from './controllers/useCalendar.js';
import { useAdmin } from './controllers/useAdmin.js';

createApp({
    setup() {
        const authCtrl = useAuth();
        const calendarCtrl = useCalendar();
        const adminCtrl = useAdmin();
        const showModal = ref(false);
        const showBlockModal = ref(false);
        const selectedSpace = ref(null);
        const form = ref({ date: '', time: '08:00 - 12:00', reason: '' });

        onMounted(() => {
            document.getElementById('loading-screen').style.display = 'none';
            try { if(window.emailjs) emailjs.init(EMAIL_CONFIG.PUBLIC_KEY); } catch(e){}
            const p = new URLSearchParams(window.location.search);
            const c = p.get('code');
            if (c) { authCtrl.logout().then(() => { authCtrl.isRegistering.value = true; authCtrl.regForm.value.condoId = c; authCtrl.hasUrlCode.value = true; }); }
        });

        onAuthStateChanged(auth, async (u) => {
            if (u) {
                if (authCtrl.hasUrlCode.value) return; 
                try {
                    const p = await AuthService.getUserProfile(u.uid);
                    if (p) {
                        store.currentUser = { uid: u.uid, email: u.email, ...p };
                        if (p.type === 'superuser') DataService.listenCondos(d => store.condoList = d);
                        else {
                            store.condoName = await DataService.getCondoName(p.condoId);
                            DataService.listenSpaces(p.condoId, d => store.spaces = d);
                            DataService.listenReservations(p.condoId, d => store.reservations = d);
                        }
                    }
                } catch(e) {}
            } else store.currentUser = null;
        });

        const myReservations = computed(() => store.reservations.filter(r => r.userId === store.currentUser?.uid));
        const pendingReservations = computed(() => store.reservations.filter(r => r.status === 'pending'));
        const paidReservations = computed(() => store.reservations.filter(r => r.status === 'approved' && r.price > 0));
        const totalReceivables = computed(() => paidReservations.value.reduce((a, c) => a + Number(c.price), 0));

        const openBookingModal = (s) => { selectedSpace.value = s; showModal.value = true; };
        const openBlockModal = (s) => { selectedSpace.value = s; showBlockModal.value = true; };
        const closeAllModals = () => { showModal.value = false; adminCtrl.showCondoModal.value = false; showBlockModal.value = false; };

        const confirmBooking = async () => {
            try {
                await DataService.addReservation({ condoId: store.currentUser.condoId, spaceId: selectedSpace.value.id, userId: store.currentUser.uid, userName: store.currentUser.name, userEmail: store.currentUser.email, date: form.value.date, time: form.value.time, status: 'pending', price: selectedSpace.value.price||0 });
                closeAllModals(); store.addToast("Solicitado!");
            } catch(e) { store.addToast("Erro", "error"); }
        };
        const confirmBlock = async () => {
            try { await DataService.addReservation({ condoId: store.currentUser.condoId, spaceId: selectedSpace.value.id, userId: store.currentUser.uid, userName: "BLOQUEIO", date: form.value.date, time: "DIA TODO", status: 'maintenance', reason: form.value.reason }); closeAllModals(); store.addToast("Bloqueado!"); } catch(e) {}
        };
        const updateStatus = async (res, st) => {
            await DataService.updateReservationStatus(res.id, st);
            if(res.userEmail && window.emailjs) emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.TEMPLATE_ID, {to_email: res.userEmail, to_name: res.userName, status: st, space: getSpaceName(res.spaceId), date: res.date});
            store.addToast(`Reserva ${st}!`);
        };
        const deleteReservation = async (id) => { if(confirm("Apagar?")) await DataService.deleteReservation(id); };
        const getSpaceName = (id) => store.spaces.find(s=>s.id===id)?.name || 'Área';
        const formatDate = (d) => d?.split('-').reverse().join('/');
        const getTitle = () => ({'calendar':'Agenda', 'reservations':'Minhas Reservas', 'admin':'Admin', 'finance':'Financeiro'}[store.currentView] || 'Painel');

        return {
            store, currentUser: computed(() => store.currentUser), currentView: computed({ get:()=>store.currentView, set:(v)=>store.currentView = v }), condoName: computed(() => store.condoName), toasts: computed(() => store.toasts), loading: computed(() => store.loading), spaces: computed(() => store.spaces), condoList: computed(() => store.condoList),
            ...authCtrl, ...calendarCtrl, ...adminCtrl,
            showModal, showBlockModal, selectedSpace, form, openBookingModal, openBlockModal, closeAllModals, confirmBooking, confirmBlock, updateStatus, deleteReservation,
            myReservations, pendingReservations, paidReservations, totalReceivables, getSpaceName, formatDate, getTitle
        };
    }
}).mount('#app');
