import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { DataService } from '../services/db.js';
import { AuthService } from '../services/auth.js';
import { store } from '../store.js';

export function useAdmin() {
    const newCondo = ref({});
    const newSpace = ref({ name: '', capacity: '', rules: '', image: '', price: '' });
    const showCondoModal = ref(false);

    const createCondo = async () => {
        store.setLoading(true);
        try {
            const ref = await DataService.createCondo(newCondo.value);
            await AuthService.createSyndicUser({ name: newCondo.value.syndicName, email: newCondo.value.syndicEmail, password: newCondo.value.syndicPassword }, ref.id);
            alert("Condomínio criado!"); window.location.reload();
        } catch(e) { store.addToast(e.message, "error"); } finally { store.setLoading(false); }
    };
    const totalMRR = computed(() => store.condoList.length * 150);
    const addSpace = async () => {
        try { await DataService.addSpace({ ...newSpace.value, condoId: store.currentUser.condoId }); store.addToast("Área salva!"); newSpace.value = {name:'',capacity:'',price:'',image:''}; } 
        catch(e) { store.addToast("Erro", "error"); }
    };
    const handleImageUpload = (e) => {
        const f = e.target.files[0]; if(!f || f.size>500*1024) return alert("Max 500KB");
        const r = new FileReader(); r.onload=(ev)=>{newSpace.value.image=ev.target.result; store.addToast("Foto ok");}; r.readAsDataURL(f);
    };
    const getRegistrationLink = () => window.location.href.split('?')[0] + `?code=${store.currentUser?.condoId}`;
    return { newCondo, newSpace, showCondoModal, createCondo, addSpace, handleImageUpload, totalMRR, getRegistrationLink };
}
