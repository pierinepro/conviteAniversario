// Lista de convidados - será carregada do Firestore
let guestsList = [];

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
                    // Atualizar documento existente
                    const docRef = querySnapshot.docs[0];
                    await setDoc(doc(guestsRef, docRef.id), guest, { merge: true });
                    console.log('Convidado atualizado no Firestore');
                } else {
                    // Adicionar novo documento
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
            querySnapshot.forEach((doc) => {
                guestsList.push({
                    id: doc.id,
                    ...doc.data()
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
                    
                    // Aplicar configurações
                    const emailFieldGroup = document.getElementById('emailFieldGroup');
                    const phoneFieldGroup = document.getElementById('phoneFieldGroup');
                    const emailInput = document.getElementById('guestEmail');
                    const phoneInput = document.getElementById('guestPhone');
                    
                    if (emailFieldGroup) {
                        emailFieldGroup.style.display = emailEnabled ? 'block' : 'none';
                    }
                    if (phoneFieldGroup) {
                        phoneFieldGroup.style.display = phoneEnabled ? 'block' : 'none';
                    }
                    
                    // Tornar obrigatório ou não baseado na configuração
                    if (emailInput) {
                        emailInput.required = emailEnabled;
                    }
                    if (phoneInput) {
                        phoneInput.required = false; // Telefone sempre opcional
                    }
                    
                    console.log('Configurações de campos carregadas:', { emailEnabled, phoneEnabled });
                    return config;
                }
            } catch (error) {
                console.error('Erro ao carregar configurações de campos:', error);
            }
        }
        
        // Fallback para localStorage
        const storedEmail = localStorage.getItem('enableEmailField');
        const storedPhone = localStorage.getItem('enablePhoneField');
        
        const emailEnabled = storedEmail !== 'false'; // Padrão: true
        const phoneEnabled = storedPhone !== 'false'; // Padrão: true
        
        // Aplicar configurações
        const emailFieldGroup = document.getElementById('emailFieldGroup');
        const phoneFieldGroup = document.getElementById('phoneFieldGroup');
        const emailInput = document.getElementById('guestEmail');
        const phoneInput = document.getElementById('guestPhone');
        
        if (emailFieldGroup) {
            emailFieldGroup.style.display = emailEnabled ? 'block' : 'none';
        }
        if (phoneFieldGroup) {
            phoneFieldGroup.style.display = phoneEnabled ? 'block' : 'none';
        }
        
        if (emailInput) {
            emailInput.required = emailEnabled;
        }
        if (phoneInput) {
            phoneInput.required = false;
        }
        
        return { enableEmail: emailEnabled, enablePhone: phoneEnabled };
    }
    
    // Carregar configurações de campos ao inicializar
    loadFieldsConfig();
    
    // Configurar botão de adicionar acompanhante
    if (addCompanionBtn) {
        addCompanionBtn.addEventListener('click', async function() {
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
                    <input type="text" class="companion-input" placeholder="Nome do acompanhante" required>
                    <input type="date" class="companion-birthdate" placeholder="Data de nascimento" max="${today}">
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
            alert('Por favor, preencha seu nome completo.');
            return;
        }
        
        // Validar e-mail apenas se o campo estiver habilitado
        if (emailEnabled) {
            if (!guestEmail) {
                alert('Por favor, preencha seu e-mail.');
                return;
            }
            
            // Validação básica de e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(guestEmail)) {
                alert('Por favor, insira um e-mail válido.');
                return;
            }
        }
        
        if (!attendanceRadio) {
            alert('Por favor, selecione uma opção de presença.');
            return;
        }
        
        const attendance = attendanceRadio.value;
        
        // Coletar data de nascimento do convidado principal
        const guestBirthDateEl = document.getElementById('guestBirthDate');
        const guestBirthDate = guestBirthDateEl ? guestBirthDateEl.value : null;
        
        // Coletar acompanhantes se houver (agora com nome e data de nascimento)
        const companionItems = document.querySelectorAll('.companion-item');
        companions = [];
        companionItems.forEach(item => {
            const nameInput = item.querySelector('.companion-input');
            const birthDateInput = item.querySelector('.companion-birthdate');
            const name = nameInput ? nameInput.value.trim() : '';
            const birthDate = birthDateInput ? birthDateInput.value : null;
            
            if (name) {
                companions.push({
                    name: name,
                    birthDate: birthDate || null
                });
            }
        });
        
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
    
    // Carregar convidados do Firestore ou localStorage
    await loadGuestsFromFirestore();
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
