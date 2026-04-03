// Lista de convidados - será carregada do Firestore
let guestsList = [];

window.guestListControl = { maxPeople: 0, listClosed: false };
window.rsvpRegistrationLocked = false;

function countPeopleForGuest(g) {
    const n = g && g.companions && Array.isArray(g.companions) ? g.companions.length : 0;
    return 1 + n;
}

function countTotalPeople(guests) {
    if (!guests || !Array.isArray(guests)) return 0;
    return guests.reduce((sum, g) => sum + countPeopleForGuest(g), 0);
}

async function loadGuestListControl() {
    let maxPeople = 0;
    let listClosed = false;
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            const configRef = doc(collection(window.firebaseDb, 'config'), 'guestListControl');
            const configDoc = await getDoc(configRef);
            if (configDoc.exists()) {
                const d = configDoc.data();
                maxPeople = typeof d.maxPeople === 'number' && !isNaN(d.maxPeople) ? d.maxPeople : parseInt(d.maxPeople, 10) || 0;
                listClosed = d.listClosed === true;
                localStorage.setItem('guestListMaxPeople', String(maxPeople));
                localStorage.setItem('guestListClosed', listClosed ? 'true' : 'false');
                window.guestListControl = { maxPeople, listClosed };
                return window.guestListControl;
            }
        } catch (error) {
            console.error('Erro ao carregar controle da lista:', error);
        }
    }
    const storedMax = localStorage.getItem('guestListMaxPeople');
    const storedClosed = localStorage.getItem('guestListClosed');
    if (storedMax !== null && storedMax !== '') {
        maxPeople = parseInt(storedMax, 10);
        if (isNaN(maxPeople) || maxPeople < 0) maxPeople = 0;
    }
    listClosed = storedClosed === 'true';
    window.guestListControl = { maxPeople, listClosed };
    return window.guestListControl;
}

function applyRsvpRegistrationLock() {
    const ctl = window.guestListControl || { maxPeople: 0, listClosed: false };
    const msgClosed = 'A lista de confirmações já foi encerrada. Em caso de dúvida, entre em contato com os noivos (Erli e Francisco).';
    const msgLimit = 'O limite de vagas para o evento foi atingido. Novas confirmações não estão disponíveis pelo site. Em caso de dúvida, entre em contato com os noivos (Erli e Francisco).';
    
    let blocked = false;
    let message = '';
    if (ctl.listClosed) {
        blocked = true;
        message = msgClosed;
    } else if (ctl.maxPeople > 0) {
        const total = countTotalPeople(guestsList);
        if (total >= ctl.maxPeople) {
            blocked = true;
            message = msgLimit;
        }
    }
    
    window.rsvpRegistrationLocked = blocked;
    
    const msgEl = document.getElementById('rsvpBlockedMessage');
    const form = document.getElementById('rsvpForm');
    if (msgEl) {
        if (blocked) {
            msgEl.style.display = 'block';
            msgEl.textContent = message;
        } else {
            msgEl.style.display = 'none';
            msgEl.textContent = '';
        }
    }
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = blocked;
        });
    }
    if (typeof window.updateAddCompanionButton === 'function') {
        window.updateAddCompanionButton();
    }
}

// Função para verificar se Firebase está configurado
function isFirebaseConfigured() {
    const hasDb = window.firebaseDb && window.firebaseDb !== null && 
                  typeof window.firebaseDb !== 'undefined';
    
    // Verificar se o Firebase App está inicializado
    const hasApp = window.firebaseApp && window.firebaseApp !== null;
    
    // Se tem db e app, está configurado (as credenciais já estão no código)
    const isConfigured = hasDb && hasApp;
    
    console.log('Verificação Firebase - hasDb:', hasDb, 'hasApp:', hasApp, 'isConfigured:', isConfigured);
    
    return isConfigured;
}

// Função para salvar no Firestore (com fallback para localStorage)
async function saveGuestToFirestore(guest) {
    console.log('saveGuestToFirestore chamado, Firebase configurado?', isFirebaseConfigured());
    
    if (isFirebaseConfigured()) {
        try {
            console.log('Tentando salvar no Firestore...');
            
            // Adicionar timeout para não travar indefinidamente
            const firestorePromise = (async () => {
                const { collection, addDoc, setDoc, doc, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
                
                // Verificar se o convidado já existe (por nome)
                const guestsRef = collection(window.firebaseDb, 'guests');
                const q = query(guestsRef, where('name', '==', guest.name));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    // Atualizar documento existente (não alterar dateAdded)
                    const docRef = querySnapshot.docs[0];
                    const { dateAdded: _, ...guestData } = guest;
                    await setDoc(doc(guestsRef, docRef.id), guestData, { merge: true });
                    console.log('Convidado atualizado no Firestore');
                } else {
                    // Adicionar novo documento (com data de inserção)
                    guest.dateAdded = guest.dateAdded || new Date().toISOString();
                    await addDoc(guestsRef, guest);
                    console.log('Novo convidado adicionado ao Firestore');
                }
            })();
            
            // Timeout de 5 segundos
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao salvar no Firestore')), 5000)
            );
            
            await Promise.race([firestorePromise, timeoutPromise]);
            
            // Também salvar no localStorage como backup
            saveToLocalStorage();
            console.log('Dados salvos no localStorage também');
            return true;
        } catch (error) {
            console.error('Erro ao salvar no Firestore:', error);
            console.log('Usando fallback para localStorage...');
            // Fallback para localStorage
            saveToLocalStorage();
            return false;
        }
    } else {
        console.log('Firebase não configurado, usando localStorage...');
        // Fallback para localStorage se Firebase não estiver configurado
        saveToLocalStorage();
        console.log('Dados salvos no localStorage');
        return false;
    }
}

// Função para carregar do Firestore (com fallback para localStorage)
async function loadGuestsFromFirestore() {
    if (isFirebaseConfigured()) {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            const guestsRef = collection(window.firebaseDb, 'guests');
            const querySnapshot = await getDocs(guestsRef);
            
            guestsList = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                guestsList.push({
                    ...data,
                    id: docSnap.id,
                    firestoreId: docSnap.id
                });
            });
            
            // Também salvar no localStorage como backup
            saveToLocalStorage();
            return guestsList;
        } catch (error) {
            console.error('Erro ao carregar do Firestore:', error);
            // Fallback para localStorage
            return loadFromLocalStorage();
        }
    } else {
        // Fallback para localStorage
        return loadFromLocalStorage();
    }
}

// Funções de fallback para localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('weddingGuests', JSON.stringify(guestsList));
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem('weddingGuests');
        guestsList = stored ? JSON.parse(stored) : [];
        return guestsList;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        guestsList = [];
        return [];
    }
}

// Elementos do DOM - serão inicializados quando o DOM estiver pronto
let rsvpForm;
let companionsGroup;
let companionsList;
let addCompanionBtn;
let successMessage;
let attendanceRadios;
let mapLink;

// Elementos dos ícones interativos
const locationIcon = document.getElementById('locationIcon');
const dressIcon = document.getElementById('dressIcon');
const rsvpIcon = document.getElementById('rsvpIcon');
const giftListIcon = document.getElementById('giftListIcon');
const locationCard = document.getElementById('locationCard');
const dressCard = document.getElementById('dressCard');
const rsvpCard = document.getElementById('rsvpCard');

// Elementos do Admin - removidos (agora está em admin.html e script-admin.js)

// Sistema de autenticação usando Firebase Auth (mais seguro)
// As credenciais não ficam no código, são gerenciadas pelo Firebase

// Companions array para o formulário atual
let companions = [];

// Função para mostrar mensagem de erro abaixo de um campo
function showFieldError(fieldElement, message) {
    if (!fieldElement) {
        console.error('showFieldError: fieldElement não fornecido');
        return null;
    }
    
    // Remover mensagem de erro anterior se existir
    let parentElement = fieldElement.parentElement;
    
    // Se o elemento não tem parent, tentar encontrar o form-group mais próximo
    if (!parentElement) {
        parentElement = fieldElement.closest('.form-group');
    }
    
    if (!parentElement) {
        console.error('showFieldError: parentElement não encontrado');
        return null;
    }
    
    const existingError = parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Criar elemento de erro
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.style.opacity = '1';
    
    // Inserir no final do form-group
    parentElement.appendChild(errorElement);
    
    // Focar no campo (se for um input e tiver método focus)
    if (fieldElement && fieldElement.focus && typeof fieldElement.focus === 'function' && fieldElement.type !== 'hidden') {
        try {
            fieldElement.focus();
        } catch (e) {
            console.warn('Não foi possível focar no campo:', e);
        }
    }
    
    // Scroll suave até o erro
    setTimeout(() => {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    // Remover mensagem após 5 segundos
    setTimeout(() => {
        if (errorElement && errorElement.parentElement) {
            errorElement.style.opacity = '0';
            errorElement.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (errorElement && errorElement.parentElement) {
                    errorElement.remove();
                }
            }, 300);
        }
    }, 5000);
    
    return errorElement;
}

// Mostrar/ocultar campo de acompanhantes baseado na resposta e adicionar classe checked
let radioGroup;

// Função para formatar telefone
function formatPhone(value) {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (numbers.length <= 10) {
        // Telefone fixo: (00) 0000-0000
        return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, function(match, p1, p2, p3) {
            if (p3) return `(${p1}) ${p2}-${p3}`;
            if (p2) return `(${p1}) ${p2}`;
            if (p1) return `(${p1}`;
            return numbers;
        });
    } else {
        // Celular: (00) 00000-0000
        return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, function(match, p1, p2, p3) {
            if (p3) return `(${p1}) ${p2}-${p3}`;
            if (p2) return `(${p1}) ${p2}`;
            if (p1) return `(${p1}`;
            return numbers;
        });
    }
}

// Função para formatar e-mail (remove espaços e converte para minúsculas)
function formatEmail(value) {
    return value.trim().toLowerCase();
}

// Inicializar elementos do DOM quando estiverem disponíveis
function initializeFormElements() {
    rsvpForm = document.getElementById('rsvpForm');
    companionsGroup = document.getElementById('companionsGroup');
    companionsList = document.getElementById('companionsList');
    addCompanionBtn = document.getElementById('addCompanionBtn');
    successMessage = document.getElementById('successMessage');
    attendanceRadios = document.querySelectorAll('input[name="attendance"]');
    mapLink = document.getElementById('mapLink');
    radioGroup = document.querySelector('.radio-group');
    
    // Configurar link do mapa
    if (mapLink) {
        mapLink.addEventListener('click', function(e) {
            e.preventDefault();
            const address = encodeURIComponent('Rua Maria Sieglinde 24, Vila Hulda - Centro de Guarulhos');
            window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
        });
    }
    
    // Configurar limite máximo da data de nascimento (hoje)
    const guestBirthDateEl = document.getElementById('guestBirthDate');
    if (guestBirthDateEl) {
        const today = new Date().toISOString().split('T')[0];
        guestBirthDateEl.setAttribute('max', today);
    }
    
    // Adicionar formatação ao campo de telefone
    const guestPhoneInput = document.getElementById('guestPhone');
    if (guestPhoneInput) {
        guestPhoneInput.addEventListener('input', function(e) {
            const cursorPosition = e.target.selectionStart;
            const oldValue = e.target.value;
            const newValue = formatPhone(e.target.value);
            e.target.value = newValue;
            
            // Manter cursor na posição correta
            const lengthDiff = newValue.length - oldValue.length;
            e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
        });
        
        guestPhoneInput.addEventListener('blur', function(e) {
            if (e.target.value && e.target.value.replace(/\D/g, '').length < 10) {
                // Telefone incompleto, pode limpar ou deixar como está
            }
        });
    }
    
    // Adicionar formatação ao campo de e-mail
    const guestEmailInput = document.getElementById('guestEmail');
    if (guestEmailInput) {
        guestEmailInput.addEventListener('blur', function(e) {
            e.target.value = formatEmail(e.target.value);
        });
    }
    
    // Configurar event listeners dos radio buttons
    if (attendanceRadios && attendanceRadios.length > 0) {
        attendanceRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                // Remover classe checked de todas as opções
                document.querySelectorAll('.radio-option').forEach(option => {
                    option.classList.remove('checked');
                });
                
                // Adicionar classe checked na opção selecionada
                const selectedOption = this.closest('.radio-option');
                if (selectedOption) {
                    selectedOption.classList.add('checked');
                    // Adicionar classe ao grupo para ativar estilos
                    if (radioGroup) {
                        radioGroup.classList.add('has-selection');
                    }
                }
                
                if (this.value === 'yes') {
                    if (companionsGroup) {
                        companionsGroup.style.display = 'block';
                        companionsGroup.style.animation = 'fadeInUp 0.5s ease';
                    }
                    // Atualizar estado do botão quando mostrar grupo de acompanhantes
                    if (typeof updateAddCompanionButton === 'function') {
                        setTimeout(updateAddCompanionButton, 100);
                    }
                } else {
                    if (companionsGroup) {
                        companionsGroup.style.display = 'none';
                    }
                    companions = [];
                    if (companionsList) {
                        companionsList.innerHTML = '';
                    }
                    // Atualizar estado do botão quando esconder grupo
                    if (typeof updateAddCompanionButton === 'function') {
                        updateAddCompanionButton();
                    }
                }
            });
        });
    }
    
    // Variável para armazenar o limite de acompanhantes (global)
    window.companionLimit = 5; // Valor padrão
    
    // Função para carregar limite de acompanhantes
    async function loadCompanionLimit() {
        if (isFirebaseConfigured()) {
            try {
                const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
                const configRef = doc(collection(window.firebaseDb, 'config'), 'companionLimit');
                const configDoc = await getDoc(configRef);
                
                if (configDoc.exists()) {
                    window.companionLimit = configDoc.data().limit || 5;
                    console.log('Limite de acompanhantes carregado:', window.companionLimit);
                    return window.companionLimit;
                }
            } catch (error) {
                console.error('Erro ao carregar limite de acompanhantes:', error);
            }
        }
        
        // Fallback para localStorage
        const storedLimit = localStorage.getItem('companionLimit');
        if (storedLimit) {
            window.companionLimit = parseInt(storedLimit);
            console.log('Limite de acompanhantes carregado do localStorage:', window.companionLimit);
            return window.companionLimit;
        }
        
        window.companionLimit = 5; // Valor padrão
        return 5;
    }
    
    // Carregar limite ao inicializar
    loadCompanionLimit();
    
    // Função para carregar configurações de campos
    async function loadFieldsConfig() {
        if (isFirebaseConfigured()) {
            try {
                const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
                const configRef = doc(collection(window.firebaseDb, 'config'), 'fieldsConfig');
                const configDoc = await getDoc(configRef);
                
                if (configDoc.exists()) {
                    const config = configDoc.data();
                    const emailEnabled = config.enableEmail !== false; // Padrão: true
                    const phoneEnabled = config.enablePhone !== false; // Padrão: true
                    const birthDateEnabled = config.enableBirthDate !== false; // Padrão: true
                    
                    // Aplicar configurações
                    const emailFieldGroup = document.getElementById('emailFieldGroup');
                    const phoneFieldGroup = document.getElementById('phoneFieldGroup');
                    const birthDateFieldGroup = document.getElementById('birthDateFieldGroup');
                    const emailInput = document.getElementById('guestEmail');
                    const phoneInput = document.getElementById('guestPhone');
                    const birthDateInput = document.getElementById('guestBirthDate');
                    
                    if (emailFieldGroup) {
                        emailFieldGroup.style.display = emailEnabled ? 'block' : 'none';
                    }
                    if (phoneFieldGroup) {
                        phoneFieldGroup.style.display = phoneEnabled ? 'block' : 'none';
                    }
                    if (birthDateFieldGroup) {
                        birthDateFieldGroup.style.display = birthDateEnabled ? 'block' : 'none';
                    }
                    
                    // Tornar obrigatório ou não baseado na configuração
                    if (emailInput) {
                        emailInput.required = emailEnabled;
                    }
                    if (phoneInput) {
                        phoneInput.required = false; // Telefone sempre opcional
                    }
                    if (birthDateInput) {
                        birthDateInput.required = birthDateEnabled;
                    }
                    
                    console.log('Configurações de campos carregadas:', { emailEnabled, phoneEnabled, birthDateEnabled });
                    return config;
                }
            } catch (error) {
                console.error('Erro ao carregar configurações de campos:', error);
            }
        }
        
        // Fallback para localStorage
        const storedEmail = localStorage.getItem('enableEmailField');
        const storedPhone = localStorage.getItem('enablePhoneField');
        const storedBirthDate = localStorage.getItem('enableBirthDateField');
        
        const emailEnabled = storedEmail !== 'false'; // Padrão: true
        const phoneEnabled = storedPhone !== 'false'; // Padrão: true
        const birthDateEnabled = storedBirthDate !== 'false'; // Padrão: true
        
        // Aplicar configurações
        const emailFieldGroup = document.getElementById('emailFieldGroup');
        const phoneFieldGroup = document.getElementById('phoneFieldGroup');
        const birthDateFieldGroup = document.querySelector('.form-group:has(#guestBirthDate)');
        const emailInput = document.getElementById('guestEmail');
        const phoneInput = document.getElementById('guestPhone');
        const birthDateInput = document.getElementById('guestBirthDate');
        
        if (emailFieldGroup) {
            emailFieldGroup.style.display = emailEnabled ? 'block' : 'none';
        }
        if (phoneFieldGroup) {
            phoneFieldGroup.style.display = phoneEnabled ? 'block' : 'none';
        }
        if (birthDateFieldGroup) {
            birthDateFieldGroup.style.display = birthDateEnabled ? 'block' : 'none';
        }
        
        if (emailInput) {
            emailInput.required = emailEnabled;
        }
        if (phoneInput) {
            phoneInput.required = false;
        }
        if (birthDateInput) {
            birthDateInput.required = birthDateEnabled;
        }
        
        return { enableEmail: emailEnabled, enablePhone: phoneEnabled, enableBirthDate: birthDateEnabled };
    }
    
    // Carregar configurações de campos ao inicializar
    loadFieldsConfig();
    
    // Configurar botão de adicionar acompanhante
    if (addCompanionBtn) {
        addCompanionBtn.addEventListener('click', async function() {
            if (window.rsvpRegistrationLocked) return;
            // Verificar limite atual
            const currentCompanions = document.querySelectorAll('.companion-item').length;
            
            // Recarregar limite (caso tenha sido alterado)
            await loadCompanionLimit();
            
            if (currentCompanions >= window.companionLimit) {
                alert(`Limite de acompanhantes atingido! Você pode adicionar no máximo ${window.companionLimit} acompanhante(s).`);
                return;
            }
            
            const companionItem = document.createElement('div');
            companionItem.className = 'companion-item';
            const today = new Date().toISOString().split('T')[0];
            companionItem.innerHTML = `
                <div class="companion-input-group">
                    <div class="companion-field-wrapper">
                        <label for="companion-name-${Date.now()}" class="companion-label">Nome completo do acompanhante *</label>
                        <input type="text" id="companion-name-${Date.now()}" class="companion-input" placeholder="Nome completo do acompanhante" required>
                    </div>
                    <div class="companion-field-wrapper">
                        <label for="companion-birthdate-${Date.now()}" class="companion-label">Data de Nascimento *</label>
                        <input type="date" id="companion-birthdate-${Date.now()}" class="companion-birthdate" max="${today}" required>
                    </div>
                </div>
                <button type="button" class="btn-remove-companion" onclick="removeCompanion(this)">×</button>
            `;
            if (companionsList) {
                companionsList.appendChild(companionItem);
            }
            
            // Focar no novo input
            const newInput = companionItem.querySelector('.companion-input');
            if (newInput) {
                newInput.focus();
            }
            
            // Atualizar estado do botão
            if (typeof window.updateAddCompanionButton === 'function') {
                window.updateAddCompanionButton();
            }
        });
    }
    
    // Função para atualizar estado do botão de adicionar acompanhante (global)
    window.updateAddCompanionButton = function() {
        if (!addCompanionBtn) return;
        
        if (window.rsvpRegistrationLocked) {
            addCompanionBtn.disabled = true;
            addCompanionBtn.style.opacity = '0.5';
            addCompanionBtn.style.cursor = 'not-allowed';
            return;
        }
        
        const currentCompanions = document.querySelectorAll('.companion-item').length;
        
        if (currentCompanions >= window.companionLimit) {
            addCompanionBtn.disabled = true;
            addCompanionBtn.style.opacity = '0.5';
            addCompanionBtn.style.cursor = 'not-allowed';
            if (addCompanionBtn.textContent) {
                addCompanionBtn.textContent = `+ Adicionar Acompanhante (Limite: ${window.companionLimit})`;
            }
        } else {
            addCompanionBtn.disabled = false;
            addCompanionBtn.style.opacity = '1';
            addCompanionBtn.style.cursor = 'pointer';
            if (addCompanionBtn.textContent && addCompanionBtn.textContent.includes('(Limite:')) {
                addCompanionBtn.textContent = '+ Adicionar Acompanhante';
            }
        }
    };
}

// Remover acompanhante (função global para onclick)
function removeCompanion(button) {
    const companionItem = button.parentElement;
    companionItem.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        companionItem.remove();
        // Atualizar estado do botão após remover
        if (typeof updateAddCompanionButton === 'function') {
            updateAddCompanionButton();
        }
    }, 300);
}

// Adicionar animação de fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }
`;
document.head.appendChild(style);

// Elementos do modal
const confirmationModal = document.getElementById('confirmationModal');
const declineModal = document.getElementById('declineModal');
const maybeModal = document.getElementById('maybeModal');
const closeModal = document.getElementById('closeModal');
const closeDeclineModal = document.getElementById('closeDeclineModal');
const closeMaybeModal = document.getElementById('closeMaybeModal');
const giftListBtn = document.getElementById('giftListBtn');

// Fechar modal de confirmação
if (closeModal) {
    closeModal.addEventListener('click', function() {
        confirmationModal.style.display = 'none';
    });
}

// Fechar modal de não comparecimento
if (closeDeclineModal) {
    closeDeclineModal.addEventListener('click', function() {
        declineModal.style.display = 'none';
    });
}

// Fechar modal de em dúvida
if (closeMaybeModal) {
    closeMaybeModal.addEventListener('click', function() {
        maybeModal.style.display = 'none';
    });
}

// Fechar modal ao clicar fora
if (confirmationModal) {
    confirmationModal.addEventListener('click', function(e) {
        if (e.target === confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });
}

if (declineModal) {
    declineModal.addEventListener('click', function(e) {
        if (e.target === declineModal) {
            declineModal.style.display = 'none';
        }
    });
}

if (maybeModal) {
    maybeModal.addEventListener('click', function(e) {
        if (e.target === maybeModal) {
            maybeModal.style.display = 'none';
        }
    });
}

// Botão de lista de presentes - baixar PDF
if (giftListBtn) {
    giftListBtn.addEventListener('click', async function() {
        // Carregar função de download do PDF da lista de presentes
        if (typeof downloadGiftListPDF === 'undefined') {
            // Se a função não estiver disponível, tentar carregar do script-admin.js
            const script = document.createElement('script');
            script.src = 'script-admin.js';
            document.head.appendChild(script);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        
        if (typeof downloadGiftListPDF !== 'undefined') {
            await downloadGiftListPDF();
        } else {
            // Fallback: abrir modal se a função não estiver disponível
            const giftListModal = document.getElementById('giftListModal');
            if (giftListModal) {
                giftListModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }
    });
}

// Função para copiar código PIX no modal
function copyPixCodeModal() {
    const pixCode = document.getElementById('pixCodeModal').textContent;
    navigator.clipboard.writeText(pixCode).then(function() {
        const btn = document.querySelector('#pixCodeModal').parentElement.querySelector('.pix-copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copiado!';
        btn.style.background = '#8b6f47';
        setTimeout(function() {
            btn.textContent = originalText;
            btn.style.background = '#d4a574';
        }, 2000);
    }).catch(function(err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar código. Por favor, copie manualmente.');
    });
}

// Código do admin foi movido para admin.html e script-admin.js

// Submeter formulário
function setupFormSubmit() {
    if (!rsvpForm) {
        console.warn('Formulário RSVP não encontrado ainda. Tentando novamente...');
        // Tentar novamente após um pequeno delay
        setTimeout(setupFormSubmit, 500);
        return;
    }
    
    // Verificar se já tem um listener (evitar duplicação)
    if (rsvpForm.hasAttribute('data-listener-added')) {
        console.log('Event listener já foi adicionado ao formulário');
        return;
    }
    
    console.log('Configurando event listener do formulário RSVP...');
    
    // Marcar que o listener foi adicionado
    rsvpForm.setAttribute('data-listener-added', 'true');
    
    rsvpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulário submetido!');
        
        await loadGuestListControl();
        await loadGuestsFromFirestore();
        
        if (window.guestListControl.listClosed) {
            const msgEl = document.getElementById('rsvpBlockedMessage');
            const text = 'A lista de confirmações já foi encerrada. Em caso de dúvida, entre em contato com os noivos (Erli e Francisco).';
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.textContent = text;
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                alert(text);
            }
            applyRsvpRegistrationLock();
            return;
        }
        
        const guestNameEl = document.getElementById('guestName');
        const attendanceRadio = document.querySelector('input[name="attendance"]:checked');
        
        if (!guestNameEl) {
            console.error('Campo guestName não encontrado!');
            alert('Erro: Campo de nome não encontrado. Por favor, recarregue a página.');
            return;
        }
        
        const guestName = guestNameEl.value.trim();
        
        // Verificar se campos estão habilitados
        const emailFieldGroup = document.getElementById('emailFieldGroup');
        const phoneFieldGroup = document.getElementById('phoneFieldGroup');
        const emailEnabled = emailFieldGroup && emailFieldGroup.style.display !== 'none';
        const phoneEnabled = phoneFieldGroup && phoneFieldGroup.style.display !== 'none';
        
        let guestEmail = null;
        let guestPhone = null;
        
        // Coletar e-mail apenas se o campo estiver habilitado e existir
        if (emailEnabled) {
            const guestEmailEl = document.getElementById('guestEmail');
            if (guestEmailEl) {
                guestEmail = guestEmailEl.value.trim();
            }
        }
        
        // Coletar telefone apenas se o campo estiver habilitado e existir
        if (phoneEnabled) {
            const guestPhoneEl = document.getElementById('guestPhone');
            if (guestPhoneEl) {
                guestPhone = guestPhoneEl.value.trim();
            }
        }
        
        if (!guestName) {
            console.log('Nome vazio, mostrando erro');
            const error = showFieldError(guestNameEl, 'Por favor, preencha seu nome completo.');
            console.log('Erro criado:', error);
            return;
        }
        
        // Validar se o nome tem nome e sobrenome (pelo menos 2 palavras)
        const nameParts = guestName.trim().split(/\s+/).filter(part => part.length > 0);
        if (nameParts.length < 2) {
            console.log('Nome incompleto, mostrando erro');
            const error = showFieldError(guestNameEl, 'Por favor, informe seu nome completo (nome e sobrenome).');
            console.log('Erro criado:', error);
            return;
        }
        
        // Validar e-mail apenas se o campo estiver habilitado
        if (emailEnabled) {
            const guestEmailEl = document.getElementById('guestEmail');
            if (!guestEmail) {
                if (guestEmailEl) {
                    showFieldError(guestEmailEl, 'Por favor, preencha seu e-mail.');
                } else {
                    alert('Por favor, preencha seu e-mail.');
                }
                return;
            }
            
            // Validação básica de e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(guestEmail)) {
                if (guestEmailEl) {
                    showFieldError(guestEmailEl, 'Por favor, insira um e-mail válido.');
                } else {
                    alert('Por favor, insira um e-mail válido.');
                }
                return;
            }
        }
        
        if (!attendanceRadio) {
            const radioGroupEl = document.getElementById('attendanceGroup') || document.querySelector('.radio-group');
            const radioGroupParent = radioGroupEl ? radioGroupEl.closest('.form-group') : null;
            if (radioGroupParent) {
                // Remover mensagem de erro anterior se existir
                const existingError = radioGroupParent.querySelector('.field-error');
                if (existingError) {
                    existingError.remove();
                }
                
                // Criar elemento de erro diretamente no form-group
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                errorElement.textContent = 'Por favor, selecione uma opção de presença.';
                errorElement.style.display = 'block';
                errorElement.style.opacity = '1';
                
                // Inserir após o radio-group
                if (radioGroupEl && radioGroupEl.nextSibling) {
                    radioGroupParent.insertBefore(errorElement, radioGroupEl.nextSibling);
                } else {
                    radioGroupParent.appendChild(errorElement);
                }
                
                // Scroll suave até o erro
                setTimeout(() => {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
                
                // Remover mensagem após 5 segundos
                setTimeout(() => {
                    if (errorElement && errorElement.parentElement) {
                        errorElement.style.opacity = '0';
                        errorElement.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            if (errorElement && errorElement.parentElement) {
                                errorElement.remove();
                            }
                        }, 300);
                    }
                }, 5000);
            } else {
                alert('Por favor, selecione uma opção de presença.');
            }
            return;
        }
        
        const attendance = attendanceRadio.value;
        
        // Coletar data de nascimento do convidado principal
        const guestBirthDateEl = document.getElementById('guestBirthDate');
        const guestBirthDate = guestBirthDateEl ? guestBirthDateEl.value : null;
        
        // Coletar acompanhantes se houver (agora com nome e data de nascimento)
        const companionItems = document.querySelectorAll('.companion-item');
        companions = [];
        
        // Validar acompanhantes antes de coletar
        for (let item of companionItems) {
            const nameInput = item.querySelector('.companion-input');
            const birthDateInput = item.querySelector('.companion-birthdate');
            const name = nameInput ? nameInput.value.trim() : '';
            const birthDate = birthDateInput ? birthDateInput.value : null;
            
            // Se tem nome, validar se tem nome e sobrenome
            if (name) {
                const nameParts = name.split(/\s+/).filter(part => part.length > 0);
                if (nameParts.length < 2) {
                    if (nameInput) {
                        showFieldError(nameInput, 'Por favor, informe o nome completo (nome e sobrenome) do acompanhante.');
                    }
                    return;
                }
            }
            
            // Se tem nome, deve ter data de nascimento obrigatória
            if (name && !birthDate) {
                if (birthDateInput) {
                    showFieldError(birthDateInput, 'Por favor, preencha a data de nascimento do acompanhante.');
                }
                return;
            }
            
            // Se tem nome, adicionar aos acompanhantes
            if (name) {
                companions.push({
                    name: name,
                    birthDate: birthDate || null
                });
            }
        }
        
        await loadGuestListControl();
        await loadGuestsFromFirestore();
        const ctlSubmit = window.guestListControl;
        if (ctlSubmit.listClosed) {
            const msgEl = document.getElementById('rsvpBlockedMessage');
            const text = 'A lista de confirmações já foi encerrada. Em caso de dúvida, entre em contato com os noivos (Erli e Francisco).';
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.textContent = text;
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                alert(text);
            }
            applyRsvpRegistrationLock();
            return;
        }
        if (ctlSubmit.maxPeople > 0) {
            const nameLower = guestName.toLowerCase();
            const proposed = 1 + companions.length;
            const totalOthers = guestsList.reduce((s, g) => {
                if ((g.name || '').toLowerCase() === nameLower) return s;
                return s + countPeopleForGuest(g);
            }, 0);
            if (totalOthers + proposed > ctlSubmit.maxPeople) {
                const msgEl = document.getElementById('rsvpBlockedMessage');
                const errText = `Não há vagas suficientes para esta confirmação (limite de ${ctlSubmit.maxPeople} pessoa(s) no evento). Em caso de dúvida, entre em contato com os noivos (Erli e Francisco).`;
                if (msgEl) {
                    msgEl.style.display = 'block';
                    msgEl.textContent = errText;
                    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    alert(errText);
                }
                if (guestNameEl) guestNameEl.focus();
                return;
            }
        }
        
        // Criar objeto do convidado
        const guest = {
            id: Date.now(),
            name: guestName,
            email: guestEmail,
            phone: guestPhone || null,
            birthDate: guestBirthDate || null,
            attendance: attendance,
            companions: companions,
            dateAdded: new Date().toISOString()
        };
        
        // Verificar se o nome já existe
        const existingIndex = guestsList.findIndex(g => 
            g.name.toLowerCase() === guestName.toLowerCase()
        );
        
        if (existingIndex !== -1) {
            // Atualizar convidado existente
            guestsList[existingIndex] = guest;
        } else {
            // Adicionar novo convidado
            guestsList.push(guest);
        }
        
        try {
            console.log('Salvando convidado...', guest);
            
            // Salvar no Firestore (ou localStorage como fallback)
            console.log('Chamando saveGuestToFirestore...');
            const saveResult = await saveGuestToFirestore(guest);
            console.log('saveGuestToFirestore retornou:', saveResult);
            console.log('Convidado salvo com sucesso!');
            
            // Atualizar lista local
            console.log('Chamando loadGuestsFromFirestore...');
            guestsList = await loadGuestsFromFirestore();
            console.log('Lista atualizada. Total de convidados:', guestsList.length);
            applyRsvpRegistrationLock();
            
            // Mostrar modal apropriado baseado na resposta
            if (attendance === 'yes') {
                if (confirmationModal) {
                    confirmationModal.style.display = 'flex';
                    console.log('Mostrando modal de confirmação');
                } else {
                    console.warn('Modal de confirmação não encontrado');
                    alert('Obrigado pela confirmação, estamos ansiosos para dividir esse momento especial com você!');
                }
            } else if (attendance === 'no') {
                if (declineModal) {
                    declineModal.style.display = 'flex';
                    console.log('Mostrando modal de não comparecimento');
                } else {
                    console.warn('Modal de não comparecimento não encontrado');
                    alert('Que pena que você não poderá estar conosco nesse dia tão especial, mas agradecemos muito pela consideração e pelos bons votos.');
                }
            } else if (attendance === 'maybe') {
                if (maybeModal) {
                    maybeModal.style.display = 'flex';
                    console.log('Mostrando modal de dúvida');
                } else {
                    console.warn('Modal de dúvida não encontrado');
                    alert('Entendemos sua situação. Pedimos, por gentileza, que nos confirme sua decisão final com até 10 dias de antecedência para que possamos nos organizar da melhor forma. Agradecemos muito a sua compreensão.');
                }
            }
            
            // Resetar formulário
            resetForm();
            console.log('Formulário resetado');
            
        } catch (error) {
            console.error('Erro ao processar formulário:', error);
            alert('Ocorreu um erro ao salvar sua resposta. Por favor, tente novamente. Os dados foram salvos localmente.');
            // Mesmo com erro, tentar salvar no localStorage
            try {
                saveToLocalStorage();
            } catch (localError) {
                console.error('Erro ao salvar no localStorage:', localError);
            }
        }
        
        // Log para debug
        console.log('Lista de convidados:', guestsList);
    });
    
    console.log('Event listener do formulário configurado com sucesso!');
}

// Mostrar mensagem de sucesso
function showSuccessMessage() {
    successMessage.style.display = 'block';
    rsvpForm.style.display = 'none';
    
    // Scroll suave até a mensagem
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Opcional: esconder mensagem após alguns segundos e mostrar formulário novamente
    setTimeout(() => {
        // successMessage.style.display = 'none';
        // rsvpForm.style.display = 'block';
    }, 5000);
}

// Função para remover acompanhante
function removeCompanion(button) {
    const companionItem = button.closest('.companion-item');
    if (companionItem) {
        companionItem.remove();
    }
}

// Resetar formulário
function resetForm() {
    if (rsvpForm) {
        rsvpForm.reset();
    }
    companions = [];
    if (companionsList) {
        companionsList.innerHTML = '';
    }
    if (companionsGroup) {
        companionsGroup.style.display = 'none';
    }
    
    // Desmarcar radio buttons e remover classe checked
    if (attendanceRadios && attendanceRadios.length > 0) {
        attendanceRadios.forEach(radio => {
            radio.checked = false;
        });
    }
    document.querySelectorAll('.radio-option').forEach(option => {
        option.classList.remove('checked');
    });
    if (radioGroup) {
        radioGroup.classList.remove('has-selection');
    }
    
    // Atualizar estado do botão de adicionar acompanhante
    if (typeof updateAddCompanionButton === 'function') {
        updateAddCompanionButton();
    }
}

// Função para obter lista de convidados (carrega do Firestore ou localStorage)
async function getGuestsList() {
    if (guestsList.length === 0) {
        await loadGuestsFromFirestore();
    }
    return guestsList;
}

// Função para exportar lista (preparação para PDF futuro)
async function exportGuestsList() {
    const guests = await getGuestsList();
    
    // Separar por status
    const confirmed = guests.filter(g => g.attendance === 'yes');
    const maybe = guests.filter(g => g.attendance === 'maybe');
    const declined = guests.filter(g => g.attendance === 'no');
    
    return {
        all: guests,
        confirmed: confirmed,
        maybe: maybe,
        declined: declined,
        totalConfirmed: confirmed.reduce((sum, g) => {
            const companionsCount = (g.companions && Array.isArray(g.companions)) ? g.companions.length : 0;
            return sum + 1 + companionsCount;
        }, 0),
        totalMaybe: maybe.reduce((sum, g) => {
            const companionsCount = (g.companions && Array.isArray(g.companions)) ? g.companions.length : 0;
            return sum + 1 + companionsCount;
        }, 0),
        totalDeclined: declined.length
    };
}

// Expor função globalmente para uso futuro
window.exportGuestsList = exportGuestsList;
window.getGuestsList = getGuestsList;

// Controle da Porta de Entrada
const doorIntro = document.getElementById('doorIntro');
const mainContent = document.getElementById('mainContent');
let doorOpened = false;

// Abrir porta ao clicar
doorIntro.addEventListener('click', function() {
    if (!doorOpened) {
        openDoor();
    }
});

// Também abrir ao pressionar qualquer tecla
document.addEventListener('keydown', function(e) {
    if (!doorOpened && doorIntro) {
        openDoor();
    }
});

function openDoor() {
    if (doorOpened) return;
    doorOpened = true;
    
    // Adicionar classe de abertura
    doorIntro.classList.add('opening');
    
    // Após animação, esconder porta e mostrar conteúdo
    setTimeout(() => {
        doorIntro.classList.add('hidden');
        mainContent.style.display = 'block';
        mainContent.style.animation = 'fadeInUp 0.8s ease';
        mainContent.style.opacity = '0';
        
        // Fade in suave do conteúdo
        setTimeout(() => {
            mainContent.style.transition = 'opacity 0.8s ease';
            mainContent.style.opacity = '1';
        }, 50);
        
        // Mostrar menu hambúrguer após porta abrir
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (mobileMenuToggle) {
            setTimeout(() => {
                mobileMenuToggle.classList.add('visible');
            }, 800);
        }
        
        // Scroll suave para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Remover porta do DOM após transição
        setTimeout(() => {
            doorIntro.style.display = 'none';
        }, 1200);
    }, 1200);
}

// Funções para os ícones interativos
function toggleCard(card, otherCards) {
    if (card.style.display === 'none' || card.style.display === '') {
        // Fechar outros cards
        otherCards.forEach(otherCard => {
            if (otherCard) otherCard.style.display = 'none';
        });
        // Abrir este card
        card.style.display = 'block';
        // Scroll suave até o card
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        // Fechar este card
        card.style.display = 'none';
    }
}

// Event listeners para os ícones
if (locationIcon) {
    locationIcon.addEventListener('click', function() {
        toggleCard(locationCard, [dressCard, rsvpCard]);
    });
}

if (dressIcon) {
    dressIcon.addEventListener('click', function() {
        toggleCard(dressCard, [locationCard, rsvpCard]);
    });
}

if (giftListIcon) {
    giftListIcon.addEventListener('click', function() {
        // Abrir modal de lista de presentes
        const giftListModal = document.getElementById('giftListModal');
        if (giftListModal) {
            giftListModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    });
}

// Fechar modal de lista de presentes
const closeGiftListModal = document.getElementById('closeGiftListModal');
if (closeGiftListModal) {
    closeGiftListModal.addEventListener('click', function() {
        const giftListModal = document.getElementById('giftListModal');
        if (giftListModal) {
            giftListModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

// Fechar modal ao clicar fora
const giftListModal = document.getElementById('giftListModal');
if (giftListModal) {
    giftListModal.addEventListener('click', function(e) {
        if (e.target === giftListModal) {
            giftListModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

if (rsvpIcon) {
    rsvpIcon.addEventListener('click', function() {
        toggleCard(rsvpCard, [locationCard, dressCard]);
    });
}

// Menu Hambúrguer Mobile
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        mobileMenuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (!mobileMenuToggle.contains(event.target) && !mobileMenu.contains(event.target)) {
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });
    
    // Fechar menu ao clicar em um item
    const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Convite de casamento carregado!');
    
    // Inicializar elementos do formulário
    initializeFormElements();
    
    // Aguardar um pouco para garantir que o formulário esteja disponível
    setTimeout(() => {
        setupFormSubmit();
    }, 100);
    setupFormSubmit();
    
    await loadGuestListControl();
    await loadGuestsFromFirestore();
    applyRsvpRegistrationLock();
    console.log('Convidados registrados:', guestsList.length);
    
    if (!isFirebaseConfigured()) {
        console.warn('Firebase não configurado. Usando localStorage como fallback.');
    }
    
    // Adicionar animação suave ao scroll (apenas após porta abrir)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);
    
    // Observar todas as seções (após porta abrir)
    setTimeout(() => {
        document.querySelectorAll('.detail-card, .rsvp-card-romantic').forEach(card => {
            card.style.opacity = '0';
            observer.observe(card);
        });
    }, 2000);
});
