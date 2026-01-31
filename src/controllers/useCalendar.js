import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { store } from '../store.js';

export function useCalendar() {
    const currentDate = ref(new Date());
    const monthLabel = computed(() => currentDate.value.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }));
    const daysInMonth = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0).getDate());
    const paddingDays = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1).getDay());
    
    const changeMonth = (d) => currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + d));
    const isToday = (d) => d === new Date().getDate() && currentDate.value.getMonth() === new Date().getMonth();
    
    const getReservationsForDay = (d) => {
        const dateStr = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        return store.reservations.filter(r => r.date === dateStr && r.status !== 'rejected');
    };
    const getStatusColor = (s) => s==='maintenance'?'#94A3B8':(s==='approved'?'#10B981':(s==='pending'?'#3B82F6':'#EF4444'));

    return { currentDate, monthLabel, daysInMonth, paddingDays, changeMonth, isToday, getReservationsForDay, getStatusColor };
}