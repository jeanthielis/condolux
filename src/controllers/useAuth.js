import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { AuthService } from '../services/auth.js';
import { store } from '../store.js';

export function useAuth() {
    const authForm = ref({ email: '', password: '' });
    const isRegistering = ref(false); // Apenas para alternar telas no index (se necessário)

    const handleLogin = async () => {
        store.setLoading(true);
        try {
            await AuthService.login(authForm.value.email, authForm.value.password);
        } catch (e) { store.addToast("E-mail ou senha inválidos", "error"); }
        finally { store.setLoading(false); }
    };

    const logout = async () => {
        await AuthService.logout();
        store.currentView = 'calendar';
    };

    return { authForm, isRegistering, handleLogin, logout };
}