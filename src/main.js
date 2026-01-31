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
        // Inicializa Controllers
        const authCtrl = useAuth();
        const calendarCtrl = useCalendar();
        const adminCtrl = useAdmin();

        // Estado local para Modais de Reserva
        const showModal = ref(false);
        const showBlockModal = ref(false);
        const selectedSpace = ref(null);
        const form = ref({ date: '', time: '08:00 - 12:00', reason: '' });

        // --- INICIALIZAÇÃO ---
        onMounted(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            try { if(window.emailjs) emailjs.init(EMAIL_CONFIG.PUBLIC_KEY); } catch(e){}

            // Verificação inicial rápida (visual)
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
                // Prepara visualmente enquanto o Auth não resolve
                authCtrl.isRegistering.value = true;
                authCtrl.regForm.value.condoId = code;
                authCtrl.hasUrlCode.value = true;
            }
        });

        // --- LISTENER DE AUTENTICAÇÃO (O Maestro) ---
        onAuthStateChanged(auth, async (user) => {
            
            // 1. VERIFICAÇÃO DE SEGURANÇA: LINK DE CONVITE
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code) {
                console.log("Modo Convite: Bloqueando login automático anterior.");
                
                // Se existe usuário logado, força o logout no Firebase
                if (user) {
                    await AuthService.logout(); 
                }
                
                // Configura o Controller de Auth para modo Registro
                authCtrl.isRegistering.value = true;
                authCtrl.regForm.value.condoId = code;
                authCtrl.hasUrlCode.value = true;
                
                // Limpa o usuário da Store para garantir que a tela de login/registro apareça
                store.currentUser = null; 
                
                // INTERROMPE A FUNÇÃO AQUI. Não carrega dados do painel.
                return; 
            }

            // 2. FLUXO NORMAL (Se não tiver código na URL)
            if (user) {
                try {
                    const profile = await AuthService.getUserProfile(user.uid);
                    if (profile) {
                        store.currentUser = { uid: user.uid, email: user.email, ...profile };
                        
                        // Lógica de Redirecionamento por Perfil
                        if (profile.type === 'superuser') {
                            store.currentView = 'admin'; // Superuser vai pro Admin direto
                            DataService.listenCondos((data) => {
                                store.condoList = data;
                                // Delay pequeno para garantir renderização do gráfico
                                setTimeout(() => { if(adminCtrl.renderChart) adminCtrl.renderChart() }, 100);
                            });
                        } else {
                            store.currentView = 'calendar'; // Outros vão pro calendário
                            initCondoData(profile.condoId);
                        }
                    }
                } catch(e) { console.error("Erro ao carregar perfil:", e); }
            } else {
                store.currentUser = null;
            }
        });

        const initCondoData = async (condoId) => {
            store.condoName = await DataService.getCondoName(condoId);
            DataService.listenSpaces(condoId, (data) => store.spaces = data);
            DataService.listenReservations(condoId, (data) => store.reservations = data);
        };

        // --- COMPUTED HELPERS (Baseados na Store) ---
        const myReservations = computed(() => store.reservations.filter(r => r.userId === store.currentUser?.uid));
        const pendingReservations = computed(() => store.reservations.filter(r => r.status === 'pending'));
        const paidReservations = computed(() => store.reservations.filter(r => r.status === 'approved' && r.price > 0));
        const totalReceivables = computed(() => paidReservations.value.reduce((acc, curr) => acc + Number(curr.price), 0));

        // --- LÓGICA DE MODAIS DE RESERVA ---
        const openBookingModal = (s) => { selectedSpace.value = s; showModal.value = true; };
        const openBlockModal = (s) => { selectedSpace.value = s; showBlockModal.value = true; };
        const closeAllModals = () => { showModal.value = false; adminCtrl.showCondoModal.value = false; showBlockModal.value = false; };

        const confirmBooking = async () => {
            try {
                await DataService.addReservation({
                    condoId: store.currentUser.condoId, spaceId: selectedSpace.value.id,
                    userId: store.currentUser.uid, userName: store.currentUser.name, userEmail: store.currentUser.email,
                    date: form.value.date, time: form.value.time, status: 'pending', price: selectedSpace.value.price || 0
                });
                closeAllModals(); store.addToast("Solicitado!");
            } catch(e) { store.addToast("Erro", "error"); }
        };

        const confirmBlock = async () => {
            try {
                await DataService.addReservation({
                    condoId: store.currentUser.condoId, spaceId: selectedSpace.value.id,
                    userId: store.currentUser.uid, userName: "BLOQUEIO",
                    date: form.value.date, time: "DIA TODO", status: 'maintenance', reason: form.value.reason
                });
                closeAllModals(); store.addToast("Bloqueado!");
            } catch(e) { store.addToast("Erro", "error"); }
        };

        const updateStatus = async (res, status) => {
            await DataService.updateReservationStatus(res.id, status);
            if(res.userEmail && window.emailjs) {
                emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.TEMPLATE_ID, {
                    to_email: res.userEmail, to_name: res.userName, status: status === 'approved' ? 'Aprovada' : 'Rejeitada', space: getSpaceName(res.spaceId), date: res.date
                });
            }
            store.addToast(`Reserva ${status}!`);
        };
        
        const deleteReservation = async (id) => { if(confirm("Apagar?")) await DataService.deleteReservation(id); };
        const getSpaceName = (id) => store.spaces.find(s=>s.id===id)?.name || 'Área';
        const formatDate = (d) => d?.split('-').reverse().join('/');
        const getStatusColor = (s) => s==='maintenance'?'#94A3B8':(s==='approved'?'#10B981':(s==='pending'?'#3B82F6':'#EF4444'));
        const getTitle = () => ({'calendar':'Agenda', 'reservations':'Minhas Reservas', 'admin':'Admin', 'finance':'Financeiro'}[store.currentView] || 'Painel');

        // Retorna TUDO para o HTML
        return {
            store, 
            currentUser: computed(() => store.currentUser),
            currentView: computed({ get:()=>store.currentView, set:(v)=>store.currentView = v }),
            condoName: computed(() => store.condoName),
            toasts: computed(() => store.toasts),
            loading: computed(() => store.loading),
            spaces: computed(() => store.spaces),
            condoList: computed(() => store.condoList),
            
            // Controllers (Espalha as funções e variáveis reativas)
            ...authCtrl,
            ...calendarCtrl,
            ...adminCtrl, // Aqui vem o createCondo, toggleCondoStatus, etc.

            // Logic Local
            showModal, showBlockModal, selectedSpace, form, 
            openBookingModal, openBlockModal, closeAllModals, confirmBooking, confirmBlock, updateStatus, deleteReservation,
            
            // Helpers
            myReservations, pendingReservations, paidReservations, totalReceivables, 
            getSpaceName, formatDate, getStatusColor, getTitle
        };
    }
}).mount('#app');