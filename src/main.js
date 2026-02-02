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
        
        // --- ESTADO DOS MODAIS ---
        const showModal = ref(false);
        const showBlockModal = ref(false);
        const showDateDetails = ref(false);
        const showStaffModal = ref(false);
        const showCheckinModal = ref(false);
        const showCondoDetailsModal = ref(false);
        const showCondoModal = ref(false); // Reforcei a declaração aqui

        // --- ESTADO GERAL ---
        const activeTab = ref('available');
        const reservationTab = ref('scheduled');
        const adminReservationTab = ref('pending');
        const selectedSpace = ref(null);
        const checkinReservation = ref(null);
        const selectedCondoStats = ref(null);
        const adminFilters = ref({ status: '', date: '', spaceId: '' });
        
        // --- MODO DEUS ---
        const realUser = ref(null);

        // --- STAFF & PDF ---
        const staffList = ref([]);
        const staffEmailInput = ref('');
        const staffDate = ref(new Date().toISOString().split('T')[0]);
        const staffMonth = ref(new Date().toISOString().slice(0, 7));
        const staffFilterMode = ref('day');
        
        // --- CADASTROS ---
        const residentSearch = ref('');
        const availableTimeSlots = ref([]);
        const tempTimeSlots = ref([]);
        const tempStart = ref('');
        const tempEnd = ref('');
        const form = ref({ date: '', endDate: '', time: '', reason: '' });

        // --- LISTAS ---
        const guestList = ref([]);
        const supplierList = ref([]);
        const tempGuest = ref({ name: '', doc: '' });
        const tempSupplier = ref({ name: '', company: '' });

        // --- CONFIGURAÇÕES ---
        const plans = {
            'bronze': { name: 'Bronze', price: 150 },
            'silver': { name: 'Prata', price: 300 },
            'gold':   { name: 'Ouro', price: 600 }
        };

        // --- INICIALIZAÇÃO ---
        onMounted(() => {
            const loader = document.getElementById('loading-screen');
            if(loader) loader.style.display = 'none';
            try { if(window.emailjs) emailjs.init(EMAIL_CONFIG.PUBLIC_KEY); } catch(e){}
            const today = new Date();
            store.selectedDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        });

        // --- AUTH LISTENER ---
        onAuthStateChanged(auth, async (user) => {
            if (realUser.value) return; // Se estiver em modo Deus, não recarrega

            if (user) {
                try {
                    const profile = await AuthService.getUserProfile(user.uid);
                    
                    if (profile && profile.blocked) { 
                        await AuthService.logout(); 
                        Swal.fire('Acesso Bloqueado', 'Entre em contato com a administração.', 'error'); 
                        return; 
                    }

                    if (profile) {
                        store.currentUser = { uid: user.uid, email: user.email, ...profile };
                        
                        if (profile.type === 'superuser') {
                            store.currentView = 'admin';
                            DataService.listenCondos((d) => {
                                store.condoList = d;
                                updateSuperAdminCharts();
                            });
                        } else if (profile.type === 'staff') {
                            store.currentView = 'staff_dashboard';
                            initCondoData(profile.condoId);
                        } else {
                            store.currentView = 'calendar';
                            initCondoData(profile.condoId);
                        }
                    }
                } catch(e) { console.error(e); }
            } else { store.currentUser = null; }
        });

        const initCondoData = async (condoId) => {
            const details = await DataService.getCondoDetails(condoId);
            if (details) { store.condoName = details.name; store.condoSuspended = details.suspended || false; }
            DataService.listenSpaces(condoId, (d) => store.spaces = d);
            DataService.listenReservations(condoId, (d) => store.reservations = d);
            
            if (store.currentUser.type === 'syndic') {
                DataService.listenResidents(condoId, (d) => store.residents = d);
                DataService.listenStaff(condoId, (d) => staffList.value = d);
            }
        };

        // --- FUNÇÕES DE SUPORTE (MODO DEUS) ---
        const openCondoDetails = (condo) => {
            selectedCondoStats.value = condo;
            showCondoDetailsModal.value = true;
        };

        const enterGodMode = async (condo) => {
            realUser.value = { ...store.currentUser };
            store.currentUser = {
                uid: 'god_mode_' + condo.id,
                email: 'suporte@condosaas.com',
                name: 'Modo Deus (Admin)',
                type: 'syndic',
                condoId: condo.id,
                credits: 0
            };
            await initCondoData(condo.id);
            store.currentView = 'calendar';
            showCondoDetailsModal.value = false;
            Swal.fire({ toast: true, position: 'top', icon: 'warning', title: `Acessando: ${condo.name}`, showConfirmButton: false, timer: 3000 });
        };

        const exitGodMode = () => {
            store.currentUser = { ...realUser.value };
            realUser.value = null;
            store.spaces = []; store.reservations = []; store.residents = [];
            store.currentView = 'admin';
            DataService.listenCondos((d) => { store.condoList = d; updateSuperAdminCharts(); });
        };

        // --- FUNÇÕES DE STAFF (PDF & CHECKIN) ---
        const openCheckinModal = (res) => {
            checkinReservation.value = res; 
            showCheckinModal.value = true;
        };

        const toggleCheckin = async (person, type) => {
            person.checkedIn = !person.checkedIn;
            try {
                const guests = checkinReservation.value.guests || [];
                const suppliers = checkinReservation.value.suppliers || [];
                await DataService.updateReservationLists(checkinReservation.value.id, { guests, suppliers });
            } catch (e) {
                person.checkedIn = !person.checkedIn;
                Swal.fire('Erro', 'Falha ao salvar.', 'error');
            }
        };

        const generateDailyReport = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const list = staffFilteredReservations.value; 
            const titleDate = staffFilterMode.value === 'day' ? staffDate.value.split('-').reverse().join('/') : `Mês ${staffMonth.value.split('-').reverse().join('/')}`;

            doc.setFontSize(18); doc.text(store.condoName || 'Condomínio', 14, 20);
            doc.setFontSize(12); doc.text(`Relatório de Acesso - ${titleDate}`, 14, 30);
            
            let y = 45;
            if (list.length === 0) { doc.setFontSize(10); doc.text("Nenhuma reserva.", 16, y); } else {
                list.forEach(res => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setFillColor(230, 230, 230); doc.rect(14, y-5, 180, 8, 'F');
                    doc.setFont(undefined, 'bold'); doc.setFontSize(10);
                    const spaceName = store.spaces.find(s => s.id === res.spaceId)?.name || 'Área';
                    doc.text(`${res.date.split('-').reverse().join('/').substring(0,5)} | ${res.time} - ${spaceName} (${res.userName})`, 16, y);
                    doc.setFont(undefined, 'normal'); y += 8;

                    if (res.guests && res.guests.length > 0) {
                        doc.setFontSize(9); doc.text("Convidados:", 16, y); y += 5;
                        res.guests.forEach(g => { if (y > 280) { doc.addPage(); y = 20; } doc.text(`[${g.checkedIn?'OK':' '}] ${g.name} (Doc: ${g.doc || 'N/A'})`, 20, y); y += 5; });
                    }
                    if (res.suppliers && res.suppliers.length > 0) {
                        doc.setFontSize(9); doc.text("Fornecedores:", 16, y); y += 5;
                        res.suppliers.forEach(s => { if (y > 280) { doc.addPage(); y = 20; } doc.text(`[${s.checkedIn?'OK':' '}] ${s.name} (${s.company || 'Autônomo'})`, 20, y); y += 5; });
                    }
                    if ((!res.guests || res.guests.length === 0) && (!res.suppliers || res.suppliers.length === 0)) {
                        doc.setFontSize(8); doc.setTextColor(150); doc.text("Sem lista.", 16, y); doc.setTextColor(0); y += 5;
                    }
                    y += 5;
                });
            }
            doc.save(`Acesso_${staffFilterMode.value}.pdf`);
        };

        // --- SUPER ADMIN ANALYTICS ---
        const totalMRR = computed(() => store.condoList.reduce((acc, c) => acc + (c.suspended ? 0 : (plans[c.plan||'bronze']?.price||0)), 0));
        const activeCondosCount = computed(() => store.condoList.filter(c => !c.suspended).length);
        
        let revenueChart = null;
        let statusChart = null;

        const updateSuperAdminCharts = async () => {
            if (store.currentUser?.type !== 'superuser' || store.currentView !== 'admin') return;
            await nextTick();
            const ctxR = document.getElementById('revenueChart');
            const ctxS = document.getElementById('statusChart');

            if (ctxR && !revenueChart) { 
                revenueChart = new Chart(ctxR, { type: 'bar', data: { labels: ['J','F','M','A','M','J'], datasets: [{ label: 'MRR', data: [1500,2100,2400,3000,3600,totalMRR.value], backgroundColor: '#4F46E5', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false } }); 
            } else if (revenueChart) { 
                revenueChart.data.datasets[0].data[5] = totalMRR.value; revenueChart.update(); 
            }

            if (ctxS && !statusChart) { 
                statusChart = new Chart(ctxS, { type: 'doughnut', data: { labels: ['Ativos','Suspensos'], datasets: [{ data: [0,0], backgroundColor: ['#10B981','#EF4444'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%' } }); 
            } else if (statusChart) { 
                statusChart.data.datasets[0].data = [store.condoList.filter(c=>!c.suspended).length, store.condoList.filter(c=>c.suspended).length]; statusChart.update(); 
            }
        };

        const createCondoSuper = async () => { 
            if (!adminCtrl.newCondo.value.plan) adminCtrl.newCondo.value.plan = 'bronze'; 
            await adminCtrl.createCondo(); 
        };

        // --- FUNÇÕES DE LISTA (Convidados/Fornecedores) ---
        const addGuest = () => { if(!tempGuest.value.name)return; guestList.value.push({...tempGuest.value, checkedIn: false}); tempGuest.value={name:'', doc:''}; };
        const removeGuest = (i) => guestList.value.splice(i, 1);
        const addSupplier = () => { if(!tempSupplier.value.name)return; supplierList.value.push({...tempSupplier.value, checkedIn: false}); tempSupplier.value={name:'', company:''}; };
        const removeSupplier = (i) => supplierList.value.splice(i, 1);

        // --- FUNÇÕES DE ESPAÇO E RESERVA ---
        const addTimeSlot = () => { if(!tempStart.value||!tempEnd.value)return; const s=`${tempStart.value} - ${tempEnd.value}`; if(!tempTimeSlots.value.includes(s))tempTimeSlots.value.push(s); tempStart.value=''; tempEnd.value=''; };
        const removeTimeSlot = (i) => tempTimeSlots.value.splice(i, 1);
        const saveSpace = async () => { 
            if(!adminCtrl.newSpace.value.timeSlotsString) {
                if(tempTimeSlots.value.length > 0) adminCtrl.newSpace.value.timeSlots = [...tempTimeSlots.value];
                else adminCtrl.newSpace.value.timeSlots = ['08:00 - 12:00','13:00 - 17:00','18:00 - 22:00'];
            } else {
                adminCtrl.newSpace.value.timeSlots = adminCtrl.newSpace.value.timeSlotsString.split(',').map(s=>s.trim());
            }
            await adminCtrl.addSpace(); 
            tempTimeSlots.value = [];
        };

        // --- AÇÕES DIVERSAS ---
        const openBookingModal = (s) => { 
            if(store.condoSuspended){Swal.fire({icon:'error',title:'Bloqueado',text:'Suspenso.',confirmButtonColor:'#EF4444'});return;}
            selectedSpace.value=s; form.value.date=store.selectedDate;
            if(s.timeSlots&&s.timeSlots.length>0){availableTimeSlots.value=s.timeSlots;form.value.time=s.timeSlots[0];}else{availableTimeSlots.value=['08:00 - 12:00','13:00 - 17:00','18:00 - 22:00'];form.value.time=availableTimeSlots.value[0];}
            guestList.value=[]; supplierList.value=[]; showDateDetails.value=false; showModal.value=true;
        };
        const openBlockModal=(s)=>{selectedSpace.value=s;form.value.date=store.selectedDate;form.value.endDate=store.selectedDate;showDateDetails.value=false;showBlockModal.value=true;};
        const closeAllModals=()=>{
            showModal.value=false; adminCtrl.showCondoModal.value=false; showCondoModal.value=false; 
            showBlockModal.value=false; showDateDetails.value=false; showStaffModal.value=false; 
            showCheckinModal.value=false; showCondoDetailsModal.value=false;
        };

        const confirmBooking = async () => {
            try {
                await DataService.addReservation({
                    condoId:store.currentUser.condoId, spaceId:selectedSpace.value.id, userId:store.currentUser.uid, userName:store.currentUser.name, userEmail:store.currentUser.email,
                    date:form.value.date, time:form.value.time, status:'pending', price:selectedSpace.value.price||0, guests:guestList.value, suppliers:supplierList.value
                });
                closeAllModals(); Swal.fire({icon:'success',title:'Solicitado!',timer:1500,showConfirmButton:false});
            } catch(e) { Swal.fire('Erro','Tente novamente.','error'); }
        };

        const deleteSpace=async(id)=>{const h=store.reservations.some(r=>r.spaceId===id&&(r.status==='pending'||r.status==='approved')&&new Date(r.date)>=new Date(new Date().setHours(0,0,0,0)));if(h)return Swal.fire('Bloqueado','Reservas futuras ativas.','error');const r=await Swal.fire({title:'Excluir?',icon:'warning',showCancelButton:true,confirmButtonColor:'#EF4444'});if(r.isConfirmed){await DataService.deleteSpace(id);Swal.fire('Excluído!','','success');}};
        const confirmBlock=async()=>{if(!form.value.date||!form.value.endDate)return Swal.fire('Erro','Datas?','warning');const s=new Date(form.value.date);const e=new Date(form.value.endDate);s.setHours(12,0,0,0);e.setHours(12,0,0,0);if(s>e)return Swal.fire('Erro','Data final menor','warning');Swal.fire({title:'Bloqueando...',didOpen:()=>Swal.showLoading()});try{let l=new Date(s);const p=[];while(l<=e){p.push(DataService.addReservation({condoId:store.currentUser.condoId,spaceId:selectedSpace.value.id,userId:store.currentUser.uid,userName:"BLOQUEIO",date:l.toISOString().split('T')[0],time:"DIA TODO",status:'maintenance',reason:form.value.reason}));l.setDate(l.getDate()+1);}await Promise.all(p);closeAllModals();Swal.fire('Sucesso','Bloqueado.','success');}catch(e){Swal.fire('Erro','Falha.','error');}};
        const handleCancellation=async(res)=>{if(res.status==='maintenance'){const r=await Swal.fire({title:'Desbloquear?',icon:'warning',showCancelButton:true,confirmButtonColor:'#EF4444'});if(r.isConfirmed){await DataService.deleteReservation(res.id);Swal.fire('Desbloqueado!','','success');}return;}let t="Sem volta.";if(res.status==='approved'&&res.price>0)t=`Valor vira CRÉDITO.`;const r=await Swal.fire({title:'Cancelar?',text:t,icon:'warning',showCancelButton:true,confirmButtonColor:'#EF4444'});if(r.isConfirmed){if(res.status==='approved'&&res.price>0){await DataService.addUserCredit(store.currentUser.uid,res.price);if(!store.currentUser.credits)store.currentUser.credits=0;store.currentUser.credits+=Number(res.price);Swal.fire('Cancelado!','Crédito gerado.','success');}else{Swal.fire('Cancelado!','','success');}await DataService.updateReservationStatus(res.id,'cancelled');}};
        const updateStatus=async(r,s)=>{await DataService.updateReservationStatus(r.id,s);if(r.userEmail&&window.emailjs)emailjs.send(EMAIL_CONFIG.SERVICE_ID,EMAIL_CONFIG.TEMPLATE_ID,{to_email:r.userEmail,to_name:r.userName,status:s,space:getSpaceName(r.spaceId),date:r.date});Swal.mixin({toast:true,position:'top-end',showConfirmButton:false,timer:3000,timerProgressBar:true}).fire({icon:'success',title:`${s}`});};
        
        // --- FUNÇÕES DE USUÁRIO ---
        const addStaffMember=async()=>{if(!staffEmailInput.value)return Swal.fire('Erro','E-mail?','warning');const r=await DataService.promoteUserToStaff(staffEmailInput.value,store.currentUser.condoId);if(r==='UserNotFound')Swal.fire('Atenção','Usuário não cadastrado.','info');else{Swal.fire('Sucesso','Promovido.','success');staffEmailInput.value='';showStaffModal.value=false;}};
        const removeStaffMember=async(id)=>{const r=await Swal.fire({title:'Remover?',icon:'warning',showCancelButton:true});if(r.isConfirmed){await DataService.demoteStaffToResident(id);Swal.fire('Removido','','success');}};
        const toggleBlockUser=async(u)=>{const r=await Swal.fire({title:`${u.blocked?'Desbloquear':'Bloquear'}?`,icon:'warning',showCancelButton:true});if(r.isConfirmed)await DataService.toggleUserBlock(u.id,u.blocked);};
        const resetUserPassword=async(u)=>{const r=await Swal.fire({title:'Resetar Senha?',text:u.email,icon:'question',showCancelButton:true});if(r.isConfirmed){await AuthService.sendResetEmail(u.email);Swal.fire('Enviado','','success');}};

        // --- HELPERS E COMPUTEDS ---
        const selectDate = (d) => { const ds = `${calendarCtrl.currentDate.value.getFullYear()}-${String(calendarCtrl.currentDate.value.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; store.selectedDate = ds; if(window.innerWidth<768){activeTab.value='available';showDateDetails.value=true;} };
        const getSpaceStatusForDate = (sid) => { const b = store.reservations.filter(r => r.spaceId===sid && r.date===store.selectedDate && (r.status==='approved'||r.status==='maintenance'||r.status==='pending')); if(b.length>0){ if(b.some(r=>r.status==='maintenance'))return{label:'Manutenção',type:'maintenance',class:'suspended'}; return{label:'Reservado',type:'booked',class:'approved'}; } return{label:'Livre',type:'free',class:'free'}; };
        const getSpaceReservation=(sid)=>store.reservations.find(r=>r.spaceId===sid && r.date===store.selectedDate && (r.status==='approved'||r.status==='maintenance'||r.status==='pending'));
        
        const availableSpaces=computed(()=>store.spaces.filter(s=>getSpaceStatusForDate(s.id).type==='free'));
        const occupiedSpaces=computed(()=>store.spaces.filter(s=>getSpaceStatusForDate(s.id).type!=='free'));
        const scheduledReservations=computed(()=>store.reservations.filter(r=>r.userId===store.currentUser?.uid&&(r.status==='pending'||r.status==='approved')));
        const cancelledReservations=computed(()=>store.reservations.filter(r=>r.userId===store.currentUser?.uid&&(r.status==='cancelled'||r.status==='rejected')));
        const pendingCount = computed(() => store.reservations.filter(r => r.status === 'pending').length);
        
        // As definições que faltavam antes:
        const myReservations = computed(() => store.reservations.filter(r => r.userId === store.currentUser?.uid));
        const pendingReservations = computed(() => store.reservations.filter(r => r.status === 'pending'));
        const paidReservations = computed(() => store.reservations.filter(r => r.status === 'approved' && r.price > 0));
        const totalReceivables = computed(() => paidReservations.value.reduce((a, c) => a + Number(c.price), 0));
        const getSpaceName = (id) => store.spaces.find(s=>s.id===id)?.name || 'Área';
        const formatDate = (d) => d?.split('-').reverse().join('/');
        const getStatusColor = (s) => s==='maintenance'?'#94A3B8':(s==='approved'?'#10B981':(s==='pending'?'#3B82F6':(s==='cancelled'?'#64748B':'#EF4444')));
        const getTitle = () => ({'calendar':'Agenda', 'reservations':'Minhas Reservas', 'admin':'Admin', 'residents':'Moradores', 'finance':'Financeiro', 'profile': 'Meu Perfil', 'staff_dashboard': 'Portaria', 'staff_manage': 'Equipe'}[store.currentView] || 'Painel');

        const filteredReservations=computed(()=>{let b=store.reservations;if(adminReservationTab.value==='pending')b=b.filter(r=>r.status==='pending');return b.filter(r=>{if(adminFilters.value.status&&r.status!==adminFilters.value.status)return false;if(adminFilters.value.date&&r.date!==adminFilters.value.date)return false;if(adminFilters.value.spaceId&&r.spaceId!==adminFilters.value.spaceId)return false;return true;}).sort((a,b)=>b.date.localeCompare(a.date));});
        const filteredResidents=computed(()=>{const s=residentSearch.value.toLowerCase();return store.residents.filter(r=>r.name.toLowerCase().includes(s)||r.apartment.toLowerCase().includes(s)||r.email.toLowerCase().includes(s)).sort((a,b)=>a.apartment.localeCompare(b.apartment));});
        const staffFilteredReservations = computed(() => store.reservations.filter(r => { const isValid = r.status === 'approved' || r.status === 'pending'; if (!isValid) return false; return staffFilterMode.value === 'day' ? r.date === staffDate.value : r.date.startsWith(staffMonth.value); }).sort((a,b) => { if(a.date!==b.date) return a.date.localeCompare(b.date); return a.time.localeCompare(b.time); }));

        return {
            store, currentUser: computed(() => store.currentUser), currentView: computed({get:()=>store.currentView, set:(v)=>store.currentView=v}), condoName: computed(() => store.condoName), loading: computed(() => store.loading), spaces: computed(() => store.spaces), condoList: computed(() => store.condoList),
            ...authCtrl, ...calendarCtrl, ...adminCtrl,
            selectDate, getSpaceStatusForDate, availableSpaces, occupiedSpaces, activeTab, showDateDetails, getSpaceReservation,
            showModal, showBlockModal, selectedSpace, form, openBookingModal, openBlockModal, closeAllModals, 
            confirmBooking, confirmBlock, updateStatus, deleteReservation: handleCancellation,
            myReservations, paidReservations, totalReceivables, getSpaceName, formatDate, getStatusColor, getTitle,
            reservationTab, scheduledReservations, cancelledReservations, pendingReservations,
            filteredReservations, adminFilters, saveSpace, deleteSpace, availableTimeSlots, 
            pendingCount, adminReservationTab, tempTimeSlots, tempStart, tempEnd, addTimeSlot, removeTimeSlot,
            filteredResidents, residentSearch, toggleBlockUser, resetUserPassword,
            staffList, showStaffModal, staffEmailInput, addStaffMember, removeStaffMember,
            staffDate, staffMonth, staffFilterMode, staffFilteredReservations, generateDailyReport,
            guestList, supplierList, tempGuest, tempSupplier, addGuest, removeGuest, addSupplier, removeSupplier,
            showCheckinModal, checkinReservation, openCheckinModal, toggleCheckin,
            totalMRR, activeCondosCount, plans, createCondoSuper, showCondoDetailsModal, showCondoModal, selectedCondoStats, openCondoDetails,
            realUser, enterGodMode, exitGodMode
        };
    }
}).mount('#app');