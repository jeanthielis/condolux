export const Validators = {
    cpf(value) {
        const clean = String(value).replace(/\D/g, '');
        if (clean.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(clean)) return false;
        
        let sum = 0, remainder;
        for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i-1, i)) * (11 - i);
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(clean.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i-1, i)) * (12 - i);
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(clean.substring(10, 11))) return false;
        
        return true;
    },

    email(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },

    password(value) {
        if (value.length < 6) return { valid: false, message: "Mínimo 6 caracteres" };
        if (!/[A-Z]/.test(value)) return { valid: false, message: "Pelo menos uma letra maiúscula" };
        if (!/\d/.test(value)) return { valid: false, message: "Pelo menos um número" };
        return { valid: true, message: "Senha forte" };
    },

    name(value) {
        if (value.length < 3) return false;
        if (!/^[a-zA-ZÀ-ÿ\s]{3,}$/.test(value)) return false;
        return true;
    },

    sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatTime(timeStr) {
        return timeStr.substring(0, 5);
    }
};