import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export const store = reactive({
    currentUser: null,
    currentView: 'calendar',
    loading: false,
    toasts: [],
    condoName: '',
    condoList: [],
    spaces: [],
    reservations: [],
    
    setLoading(val) { this.loading = val; },
    addToast(msg, type='success') {
        this.toasts.push({message: msg, type});
        setTimeout(() => this.toasts.shift(), 3000);
    }
});
