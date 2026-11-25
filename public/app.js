const tokenKey = 'fisio_token';
let currentUser = null;
let patients = [];
let plans = [];
let sessions = [];

const byId = (id) => document.getElementById(id);
const loginView = byId('login-view');
const appView = byId('app-view');

function setMessage(elementId, message, success = false) {
    const element = byId(elementId);
    element.textContent = message;
    element.classList.toggle('success', success);
}

function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
    row.append(cell);
    return cell;
}

function formatDate(value) {
    if (!value) return '—';
    const parts = String(value).slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
    }
    const token = sessionStorage.getItem(tokenKey);
    if (token) headers.set('authorization', `Bearer ${token}`);

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (error) {
        throw new Error('Não foi possível conectar ao servidor.');
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
        logout();
        throw new Error(payload.mensagem || 'Sua sessão expirou. Entre novamente.');
    }
    if (!response.ok) {
        throw new Error(payload.mensagem || 'Não foi possível concluir a operação.');
    }
    return payload;
}

function logout() {
    sessionStorage.removeItem(tokenKey);
    currentUser = null;
    appView.hidden = true;
    loginView.hidden = false;
    byId('login-password').value = '';
}

function showPage(name) {
    document.querySelectorAll('.page').forEach((page) => {
        page.hidden = page.id !== `page-${name}`;
    });
    document.querySelectorAll('.nav-button').forEach((button) => {
        button.classList.toggle('active', button.dataset.page === name);
    });
    setMessage('global-message', '');

    if (name === 'pacientes') loadPatients().catch(showGlobalError);
    if (name === 'planos') loadPlans().catch(showGlobalError);
    if (name === 'sessoes') loadSessions().catch(showGlobalError);
}

function showGlobalError(error) {
    setMessage('global-message', error.message);
}

async function openApplication(user) {
    currentUser = user;
    byId('user-name').textContent = user.nome;
    byId('welcome-name').textContent = user.nome;
    loginView.hidden = true;
    appView.hidden = false;
    showPage('inicio');
}

async function loadPatients(search = '') {
    const query = search ? `?busca=${encodeURIComponent(search)}` : '';
    patients = await api(`/api/pacientes${query}`);
    const body = byId('patients-table');
    body.replaceChildren();

    patients.forEach((patient) => {
        const row = document.createElement('tr');
        addCell(row, patient.nome);
        addCell(row, formatDate(patient.dataNascimento));
        addCell(row, patient.telefone);
        addCell(row, patient.email);
        addCell(row, patient.endereco);
        const action = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button-secondary';
        button.textContent = 'Editar';
        button.addEventListener('click', () => editPatient(patient));
        action.append(button);
        row.append(action);
        body.append(row);
    });

    if (!patients.length) {
        const row = document.createElement('tr');
        const cell = addCell(row, 'Nenhum paciente encontrado.');
        cell.colSpan = 6;
        body.append(row);
    }
    refreshPatientOptions();
}

function editPatient(patient) {
    const form = byId('patient-form');
    form.elements.id.value = patient.id;
    form.elements.nome.value = patient.nome;
    form.elements.cpf.value = '';
    form.elements.dataNascimento.value = String(patient.dataNascimento).slice(0, 10);
    form.elements.telefone.value = patient.telefone;
    form.elements.email.value = patient.email || '';
    form.elements.endereco.value = patient.endereco || '';
    byId('patient-form-title').textContent = 'Editar paciente';
    byId('patient-cancel').hidden = false;
    setMessage('patient-message', 'Deixe o CPF em branco para manter o valor atual.', true);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetPatientForm() {
    byId('patient-form').reset();
    byId('patient-form').elements.id.value = '';
    byId('patient-form-title').textContent = 'Novo paciente';
    byId('patient-cancel').hidden = true;
    setMessage('patient-message', '');
}

function refreshPatientOptions() {
    const select = byId('plan-form').elements.idPaciente;
    const selected = select.value;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione um paciente';
    select.append(placeholder);

    patients.forEach((patient) => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = patient.nome;
        select.append(option);
    });
    select.value = selected;
}

async function loadPlans() {
    const [loadedPlans, loadedPatients] = await Promise.all([
        api('/api/planos'),
        api('/api/pacientes')
    ]);
    plans = loadedPlans;
    patients = loadedPatients;
    refreshPatientOptions();
    const body = byId('plans-table');
    body.replaceChildren();

    plans.forEach((plan) => {
        const row = document.createElement('tr');
        addCell(row, plan.nomePaciente);
        addCell(row, plan.descricao);
        addCell(row, plan.objetivo);
        addCell(row, plan.quantidadeSessoes);
        addCell(row, formatDate(plan.dataInicio));
        addCell(row, plan.status);
        body.append(row);
    });

    if (!plans.length) {
        const row = document.createElement('tr');
        const cell = addCell(row, 'Nenhum plano cadastrado.');
        cell.colSpan = 6;
        body.append(row);
    }
    refreshPlanOptions();
}

function refreshPlanOptions() {
    const select = byId('session-form').elements.idPlano;
    const selected = select.value;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione um plano';
    select.append(placeholder);

    plans.forEach((plan) => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = `${plan.nomePaciente} — ${plan.descricao}`;
        select.append(option);
    });
    select.value = selected;
}

async function loadSessions() {
    const [loadedSessions, loadedPlans] = await Promise.all([
        api('/api/sessoes'),
        api('/api/planos')
    ]);
    sessions = loadedSessions;
    plans = loadedPlans;
    refreshPlanOptions();
    const body = byId('sessions-table');
    body.replaceChildren();

    sessions.forEach((session) => {
        const row = document.createElement('tr');
        addCell(row, `${formatDate(session.dataSessao)} ${String(session.horaSessao).slice(0, 5)}`);
        addCell(row, session.nomePaciente);
        addCell(row, [
            `CPF protegido: ${session.cpfCriptografado || '—'}`,
            `Nascimento: ${formatDate(session.dataNascimento)}`,
            `Telefone: ${session.telefonePaciente || '—'}`,
            `E-mail: ${session.emailPaciente || '—'}`,
            `Endereço: ${session.enderecoPaciente || '—'}`
        ].join('\n'));
        addCell(row, [
            session.descricaoPlano,
            `Objetivo: ${session.objetivoPlano || '—'}`,
            `Sessões: ${session.quantidadeSessoes}`,
            `Início: ${formatDate(session.dataInicioPlano)}`,
            `Status: ${session.statusPlano}`
        ].join('\n'));
        addCell(row, session.nomeFisioterapeuta);
        addCell(row, session.statusSessao);
        addCell(row, session.observacoes);

        const action = document.createElement('td');
        const form = document.createElement('form');
        form.className = 'date-update';
        const input = document.createElement('input');
        input.type = 'date';
        input.value = String(session.dataSessao).slice(0, 10);
        input.required = true;
        input.setAttribute('aria-label', `Nova data da sessão de ${session.nomePaciente}`);
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'Salvar';
        form.append(input, button);
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await api(`/api/sessoes/${session.id}/data`, {
                    method: 'PUT',
                    body: JSON.stringify({ dataSessao: input.value })
                });
                setMessage('global-message', 'Data da sessão atualizada.', true);
                await loadSessions();
            } catch (error) {
                showGlobalError(error);
            }
        });
        action.append(form);
        row.append(action);
        body.append(row);
    });

    if (!sessions.length) {
        const row = document.createElement('tr');
        const cell = addCell(row, 'Nenhuma sessão cadastrada.');
        cell.colSpan = 8;
        body.append(row);
    }
}

byId('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('login-message', '');
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;

    try {
        const result = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: form.elements.email.value,
                senha: form.elements.senha.value
            })
        });
        sessionStorage.setItem(tokenKey, result.token);
        await openApplication(result.usuario);
    } catch (error) {
        setMessage('login-message', error.message);
    } finally {
        submit.disabled = false;
    }
});

byId('logout-button').addEventListener('click', logout);
document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.page));
});

byId('patient-search').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        await loadPatients(byId('patient-term').value.trim());
        setMessage('patient-message', '');
    } catch (error) {
        showGlobalError(error);
    }
});

byId('patient-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.elements.id.value;
    const values = Object.fromEntries(new FormData(form).entries());
    delete values.id;

    try {
        const result = await api(id ? `/api/pacientes/${id}` : '/api/pacientes', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(values)
        });
        resetPatientForm();
        setMessage('patient-message', result.mensagem, true);
        await loadPatients(byId('patient-term').value.trim());
    } catch (error) {
        setMessage('patient-message', error.message);
    }
});

byId('patient-cancel').addEventListener('click', resetPatientForm);

byId('plan-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.quantidadeSessoes = Number(values.quantidadeSessoes);

    try {
        const result = await api('/api/planos', {
            method: 'POST',
            body: JSON.stringify(values)
        });
        event.currentTarget.reset();
        setMessage('plan-message', result.mensagem, true);
        await loadPlans();
    } catch (error) {
        setMessage('plan-message', error.message);
    }
});

byId('session-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.idPlano = Number(values.idPlano);

    try {
        const result = await api('/api/sessoes', {
            method: 'POST',
            body: JSON.stringify(values)
        });
        event.currentTarget.reset();
        setMessage('session-message', result.mensagem, true);
        await loadSessions();
    } catch (error) {
        setMessage('session-message', error.message);
    }
});

async function restoreSession() {
    if (!sessionStorage.getItem(tokenKey)) return;
    try {
        const user = await api('/api/auth/me');
        await openApplication(user);
    } catch (error) {
        logout();
        if (error.message !== 'Autenticação necessária.') {
            setMessage('login-message', error.message);
        }
    }
}

restoreSession();
