import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { DataService } from '../services/db.js';
import { AuthService } from '../services/auth.js';
import { store } from '../store.js';

export function useAdmin() {
    const newCondo = ref({});
    const newSpace = ref({ name: '', capacity: '', rules: '', image: '', price: '' });
    const showCondoModal = ref(false);

    // --- SUPER USER ---
    const createCondo = async () => {
        if(!newCondo.value.name || !newCondo.value.syndicEmail) return alert("Preencha tudo");
        store.setLoading(true);
        try {
            // Salva e-mail do síndico no cadastro do condomínio também
            const condoData = { 
                ...newCondo.value, 
                syndicEmail: newCondo.value.syndicEmail,
                suspended: false 
            };
            
            const cRef = await DataService.createCondo(condoData);
            
            await AuthService.createSyndicUser({
                name: newCondo.value.syndicName,
                email: newCondo.value.syndicEmail,
                password: newCondo.value.syndicPassword
            }, cRef.id);
            
            alert("Condomínio criado com sucesso!");
            window.location.reload();
        } catch(e) { store.addToast(e.message, "error"); }
        finally { store.setLoading(false); }
    };

    const toggleCondoStatus = async (condo) => {
        const action = condo.suspended ? "ATIVAR" : "SUSPENDER";
        if(!confirm(`Deseja realmente ${action} o acesso de: ${condo.name}?`)) return;
        
        try {
            await DataService.toggleCondoStatus(condo.id, condo.suspended);
            store.addToast(`Condomínio ${action === 'ATIVAR' ? 'Ativado' : 'Suspenso'}!`);
        } catch(e) { store.addToast("Erro ao alterar status", "error"); }
    };

    const totalMRR = computed(() => {
        // Apenas condomínios ativos contam para a receita
        const active = store.condoList.filter(c => !c.suspended).length;
        return active * 150; 
    });

    // --- SÍNDICO ---
    const addSpace = async () => {
        try {
            await DataService.addSpace({ ...newSpace.value, condoId: store.currentUser.condoId });
            store.addToast("Área salva!");
            newSpace.value = { name: '', capacity: '', rules: '', image: '', price: '' };
        } catch(e) { store.addToast("Erro ao salvar", "error"); }
    };

    const handleImageUpload = (e) => {
        const f = e.target.files[0];
        if(!f || f.size > 500*1024) return alert("Max 500KB");
        const r = new FileReader(); 
        r.onload = (ev) => { newSpace.value.image = ev.target.result; store.addToast("Foto ok"); }; 
        r.readAsDataURL(f);
    };

    

    const getRegistrationLink = () => {
        // Pega a URL base (ex: https://seusite.com/)
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        
        // Aponta para o novo arquivo separado
        return `${baseUrl}/cadastro.html?code=${store.currentUser?.condoId}`;
    };

    return { 
        // ... retornos ...
        getRegistrationLink 
    };
}
