import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { AuthService } from '../services/auth.js';
import { store } from '../store.js';

export function useAuth() {
    const authForm = ref({ email: '', password: '' });
    const regForm = ref({ condoId: '', name: '', apartment: '', email: '', password: '' });
    const isRegistering = ref(false);
    const hasUrlCode = ref(false);

    const handleLogin = async () => {
        store.setLoading(true);
        try { await AuthService.login(authForm.value.email, authForm.value.password); } 
        catch (e) { store.addToast("Login incorreto", "error"); } finally { store.setLoading(false); }
    };
    const handleRegister = async () => {
        store.setLoading(true);
        try { await AuthService.register(regForm.value); store.addToast("Conta criada!"); window.history.replaceState({},"",location.pathname); hasUrlCode.value=false; isRegistering.value=false; } 
        catch (e) { store.addToast(e.message, "error"); } finally { store.setLoading(false); }
    };
    const logout = async () => { await AuthService.logout(); store.currentView = 'calendar'; };
    return { authForm, regForm, isRegistering, hasUrlCode, handleLogin, handleRegister, logout };
}
