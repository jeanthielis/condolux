import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export const store = reactive({
    currentUser: null,
    currentView: 'calendar',
    loading: false,
    
    // Dados
    condoName: '',
    condoSuspended: false,
    condoList: [],
    spaces: [],
    reservations: [],
    residents: [], // <--- NOVO: Lista de Moradores
    
    selectedDate: new Date().toISOString().split('T')[0],
    
    setLoading(val) { this.loading = val; }
});