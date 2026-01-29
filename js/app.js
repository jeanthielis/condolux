import { Validators } from './utils.js';

export const UI = {
    toast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        const icons = { success: 'bx-check-circle', error: 'bx-error', warning: 'bx-error-circle', info: 'bx-info-circle' };
        t.innerHTML = `<i class='bx ${icons[type]}'></i><span>${Validators.sanitize(msg)}</span>`;
        container.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    },

    loading(show, text = 'Carregando...') {
        const loadingEl = document.getElementById('loading');
        const textEl = document.getElementById('loadingText');
        if (textEl) textEl.textContent = text;
        loadingEl.style.display = show ? 'flex' : 'none';
    },

    showModal(title, content) {
        document.getElementById('modalTitle').textContent = Validators.sanitize(title);
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('mainModal').style.display = 'flex';
    },

    hideModal() {
        document.getElementById('mainModal').style.display = 'none';
    },

    showInputError(inputId, message) {
        const input = document.getElementById(inputId);
        const errorEl = input.nextElementSibling;
        if (errorEl && errorEl.classList.contains('input-error')) {
            input.classList.add('error');
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
    },

    clearInputError(inputId) {
        const input = document.getElementById(inputId);
        const errorEl = input.nextElementSibling;
        if (errorEl) {
            input.classList.remove('error');
            errorEl.classList.remove('show');
        }
    },

    renderLogin() {
        document.getElementById('app').innerHTML = `
            <div style="padding:40px 30px; text-align:center;">
                <i class='bx bxs-buildings' style="font-size: 64px; color:var(--primary); margin-bottom: 20px;"></i>
                <h1 style="margin:10px 0 40px; font-size: 2rem; color: var(--text-main);">CondoSaaS</h1>
                <div class="card">
                    <form id="formLogin" onsubmit="App.login(event)">
                        <label for="logEmail">Email</label>
                        <input type="email" id="logEmail" class="input-field" placeholder="seu@email.com" required>
                        <div class="input-error"></div>
                        <label for="logPass">Senha</label>
                        <input type="password" id="logPass" class="input-field" placeholder="••••••••" required>
                        <div class="input-error"></div>
                        <button type="submit" class="btn btn-primary" id="loginBtn">Entrar</button>
                    </form>
                </div>
                <button onclick="App.viewRegister()" class="btn btn-outline" style="margin-top:20px;">
                    <i class='bx bx-user-plus'></i> Criar Conta Admin
                </button>
            </div>`;
    },

    renderRegister(condoName = null, condoId = null) {
        const title = condoName ? `Cadastro - ${Validators.sanitize(condoName)}` : 'Criar Conta';
        document.getElementById('app').innerHTML = `
            <div style="padding:40px 30px;">
                <h2 style="text-align:center; margin-bottom:30px;">${title}</h2>
                <div class="card">
                    <form id="formReg" onsubmit="App.register(event)">
                        <input type="hidden" id="regCondoId" value="${condoId || ''}">
                        <label>Nome Completo *</label><input id="regName" class="input-field" required>
                        <div class="input-error"></div>
                        <label>CPF *</label><input id="regCpf" class="input-field" required>
                        <div class="input-error"></div>
                        <label>Unidade *</label><input id="regUnit" class="input-field" placeholder="Apto/Bloco" required>
                        <label>Email *</label><input type="email" id="regEmail" class="input-field" required>
                        <div class="input-error"></div>
                        <label>Senha *</label><input type="password" id="regPass" class="input-field" required>
                        <div class="input-error"></div>
                        <button type="submit" class="btn btn-primary" id="regBtn">Concluir</button>
                    </form>
                </div>
                ${!condoId ? '<button onclick="UI.renderLogin()" class="btn btn-outline">Voltar</button>' : ''}
            </div>`;
    },

    renderDash(user, isOnline) {
        let menu = '';
        if (user.role === 'super') {
            menu = `
                <div class="grid-menu">
                    <div class="menu-item" onclick="App.modalAddCondo()">
                        <i class='bx bx-building menu-icon'></i><h5>Novo Condomínio</h5>
                    </div>
                    <div class="menu-item" onclick="App.modalAddSindico()">
                        <i class='bx bx-user-plus menu-icon'></i><h5>Novo Síndico</h5>
                    </div>
                    <div class="menu-item" onclick="App.modalListCondos()">
                        <i class='bx bx-list-ul menu-icon'></i><h5>Gerenciar</h5><small>Bloquear Condomínios</small>
                    </div>
                </div>`;
        } else if (user.role === 'sindico') {
            menu = `
                <div class="card" onclick="App.copyInvite('${user.condoId}')" style="background:var(--primary); color:white; cursor:pointer; text-align:center; padding:20px;">
                    <i class='bx bx-link-alt' style="font-size:2rem;"></i><b>Copiar Link Convite</b>
                </div>
                <div class="grid-menu" style="margin-top:20px">
                    <div class="menu-item" onclick="App.modalManageAreas()">
                        <i class='bx bx-map menu-icon'></i><h5>Áreas</h5>
                    </div>
                    <div class="menu-item" onclick="App.viewReservations('sindico')">
                        <i class='bx bx-calendar-check menu-icon'></i><h5>Reservas</h5>
                    </div>
                </div>`;
        } else {
            menu = `
                <div class="grid-menu">
                    <div class="menu-item" onclick="App.modalNewReservation()">
                        <i class='bx bx-calendar-plus menu-icon'></i><h5>Nova Reserva</h5>
                    </div>
                    <div class="menu-item" onclick="App.viewReservations('morador')">
                        <i class='bx bx-calendar-event menu-icon'></i><h5>Minhas Reservas</h5>
                    </div>
                </div>`;
        }

        document.getElementById('app').innerHTML = `
            <div class="header">
                <div><b>${Validators.sanitize(user.name.split(' ')[0])}</b> <span class="badge-role">${user.role}</span>
                ${isOnline ? '<span class="status-indicator status-online"></span>' : '<span class="status-indicator status-offline"></span>'}
                </div>
                <button onclick="App.logout()" style="background:none; border:none; cursor:pointer;"><i class='bx bx-log-out' style="font-size:1.5rem; color:var(--danger);"></i></button>
            </div>
            <div style="padding:20px;">
                ${menu}
                <div style="margin-top:30px;">
                    <h4 style="margin-bottom:16px;">Reservas Recentes</h4>
                    <div id="listRes"><div class="skeleton"></div></div>
                </div>
                ${user.role === 'morador' ? '<div style="margin-top:30px;"><h4 style="margin-bottom:16px;">Áreas</h4><div id="areasList"><div class="skeleton"></div></div></div>' : ''}
            </div>`;
    },

    modalNewReservation(areas) {
        if (areas.length === 0) return UI.toast('Nenhuma área disponível', 'warning');
        
        let areaOptions = areas.map(a => `<option value="${a.id}" data-capacity="${a.capacity}">${Validators.sanitize(a.name)}</option>`).join('');
        
        // Geração de horários
        const timeSlots = [];
        for (let h = 8; h <= 22; h++) {
            for (let m = 0; m < 60; m += 30) timeSlots.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
        }
        const timeOptions = timeSlots.map(t => `<option value="${t}">${t}</option>`).join('');
        
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultDate = tomorrow.toISOString().split('T')[0];

        UI.showModal('Nova Reserva', `
            <form onsubmit="App.saveReservation(event)">
                <label>Área *</label>
                <select class="select-field" id="reservationArea" onchange="App.checkAvailabilityUI()" required>
                    <option value="">Selecione</option>${areaOptions}
                </select>
                <label>Data *</label>
                <input type="date" class="input-field" id="reservationDate" value="${defaultDate}" min="${new Date().toISOString().split('T')[0]}" onchange="App.checkAvailabilityUI()" required>
                <div id="availabilityMsg" style="margin-bottom:10px; font-size:0.8rem"></div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div><label>Início *</label><select id="reservationStartTime" class="select-field" required><option value="">--:--</option>${timeOptions}</select></div>
                    <div><label>Fim *</label><select id="reservationEndTime" class="select-field" required><option value="">--:--</option>${timeOptions}</select></div>
                </div>

                <label>Lista de Convidados <span id="guestCounter" style="font-weight:normal; color:var(--text-light)">(0)</span></label>
                <div id="guestListContainer" class="guest-list-container"></div>
                <button type="button" class="btn btn-outline btn-sm" onclick="App.addGuestInput()" style="margin:8px 0 16px;">+ Convidado</button>
                
                <label>Obs</label><textarea id="reservationNotes" class="input-field" rows="2"></textarea>
                
                <div class="action-buttons">
                    <button type="submit" class="btn btn-primary" id="saveReservationBtn">Reservar</button>
                    <button type="button" class="btn btn-outline" onclick="UI.hideModal()">Cancelar</button>
                </div>
            </form>
        `);
    },

    renderReservations(reservations, areas, currentUser, viewType = 'all') {
        const container = viewType === 'tab' ? document.getElementById('reservationsTabContent') : document.getElementById('listRes');
        if (!container) return;
        
        if (reservations.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bx bx-calendar-x"></i><p>Nenhuma reserva</p></div>';
            return;
        }

        container.innerHTML = reservations.map(res => {
            const area = areas.find(a => a.id === res.areaId);
            const statusMap = { pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
            const guestBtn = res.guestList && res.guestList.length > 0 ? 
                `<button class="btn-outline btn-sm" style="padding:2px 8px; font-size:0.7rem; margin-top:5px;" onclick="alert('Convidados:\\n- ${res.guestList.join('\\n- ')}')">Ver Convidados</button>` : '';

            return `
                <div class="card reservation-card ${res.status}">
                    <div style="display:flex; justify-content:space-between;">
                        <div>
                            <strong>${Validators.sanitize(area ? area.name : 'Área')}</strong>
                            <p style="font-size:0.9rem; color:var(--text-light);">${Validators.formatDate(res.date)} • ${res.startTime.substring(0,5)} - ${res.endTime.substring(0,5)}</p>
                            <span class="badge-status status-${res.status}">${statusMap[res.status]}</span>
                            ${guestBtn}
                        </div>
                        ${currentUser.role === 'sindico' && res.status === 'pending' ? `
                        <div>
                            <button class="btn-success btn-sm" onclick="App.approveReservation('${res.id}')"><i class='bx bx-check'></i></button>
                            <button class="btn-danger btn-sm" style="margin-top:5px" onclick="App.rejectReservation('${res.id}')"><i class='bx bx-x'></i></button>
                        </div>` : ''}
                    </div>
                </div>`;
        }).join('');
    }
};