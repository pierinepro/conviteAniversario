// Script para página administrativa
// Lista de convidados - será carregada do Firestore
let guestsList = [];

// Variáveis de paginação
let currentPage = 1;
const itemsPerPage = 10; // Itens por página

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
    console.log('saveGuestToFirestore chamado com:', guest);
    console.log('guest.id:', guest.id);
    console.log('guest.firestoreId:', guest.firestoreId);
    
    if (isFirebaseConfigured()) {
        try {
            const { collection, addDoc, setDoc, doc, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            const guestsRef = collection(window.firebaseDb, 'guests');
            
            // Se o convidado tem um ID do Firestore (id ou firestoreId), atualizar diretamente
            const firestoreId = guest.id || guest.firestoreId;
            
            console.log('firestoreId extraído:', firestoreId);
            console.log('Tipo do firestoreId:', typeof firestoreId);
            
            // Validar se o ID é válido (pode ser string ou número)
            // Converter para string se for número para usar no Firestore
            const firestoreIdString = firestoreId ? String(firestoreId) : null;
            const isValidId = firestoreIdString && firestoreIdString.length > 0;
            
            console.log('firestoreIdString:', firestoreIdString);
            console.log('isValidId:', isValidId);
            
            if (isValidId) {
                // Remover o id do objeto antes de salvar (não deve ser salvo como campo)
                const { id, firestoreId: _, ...guestData } = guest;
                console.log('Atualizando documento com ID:', firestoreIdString);
                console.log('Dados a serem salvos:', guestData);
                
                await setDoc(doc(guestsRef, firestoreIdString), guestData, { merge: true });
                
                // Garantir que o ID seja preservado no objeto guest para uso posterior
                guest.id = firestoreId; // Manter o tipo original (número ou string)
                console.log('✅ Convidado ATUALIZADO pelo ID:', firestoreIdString);
                console.log('Dados salvos (sem ID):', guestData);
            } else {
                console.warn('⚠️ ID inválido ou ausente. firestoreId:', firestoreId);
                // Se não tem ID válido, verificar se o convidado já existe (por nome)
                if (guest.name && guest.name.trim()) {
                    const q = query(guestsRef, where('name', '==', guest.name.trim()));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        // Atualizar documento existente
                        const docRef = querySnapshot.docs[0];
                        const { id, firestoreId: _, ...guestData } = guest;
                        guest.id = docRef.id; // Salvar o ID para futuras atualizações
                        await setDoc(doc(guestsRef, docRef.id), guestData, { merge: true });
                        console.log('Convidado atualizado pelo nome:', docRef.id);
                    } else {
                        // Adicionar novo documento
                        const { id, firestoreId: _, ...guestData } = guest;
                        const docRef = await addDoc(guestsRef, guestData);
                        guest.id = docRef.id; // Salvar o ID
                        console.log('Novo convidado criado:', docRef.id);
                    }
                } else {
                    // Se não tem nome, criar novo documento
                    const { id, firestoreId: _, ...guestData } = guest;
                    const docRef = await addDoc(guestsRef, guestData);
                    guest.id = docRef.id; // Salvar o ID
                    console.log('Novo convidado criado (sem nome):', docRef.id);
                }
            }
            
            // Também salvar no localStorage como backup
            saveToLocalStorage();
            return true;
        } catch (error) {
            console.error('Erro ao salvar no Firestore:', error);
            // Fallback para localStorage
            saveToLocalStorage();
            throw error; // Re-lançar o erro para que seja capturado no handleEditSubmit
        }
    } else {
        // Fallback para localStorage se Firebase não estiver configurado
        saveToLocalStorage();
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
    
    // Calcular totais incluindo acompanhantes
    const totalConfirmed = confirmed.reduce((sum, g) => {
        const companionsCount = (g.companions && Array.isArray(g.companions)) ? g.companions.length : 0;
        return sum + 1 + companionsCount;
    }, 0);
    
    const totalMaybe = maybe.reduce((sum, g) => {
        const companionsCount = (g.companions && Array.isArray(g.companions)) ? g.companions.length : 0;
        return sum + 1 + companionsCount;
    }, 0);
    
    const totalDeclined = declined.length;
    
    return {
        all: guests,
        confirmed: confirmed,
        maybe: maybe,
        declined: declined,
        totalConfirmed: totalConfirmed,
        totalMaybe: totalMaybe,
        totalDeclined: totalDeclined
    };
}

// Elementos do Admin
const adminLoginModal = document.getElementById('adminLoginModal');
const adminArea = document.getElementById('adminArea');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminError = document.getElementById('adminError');
const adminLogout = document.getElementById('adminLogout');
const adminLogoutMobile = document.getElementById('adminLogoutMobile');
const adminMenuToggle = document.getElementById('adminMenuToggle');
const adminMobileMenu = document.getElementById('adminMobileMenu');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const clearListBtn = document.getElementById('clearListBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const statConfirmed = document.getElementById('statConfirmed');
const statMaybe = document.getElementById('statMaybe');
const statDeclined = document.getElementById('statDeclined');
const companionLimitInput = document.getElementById('companionLimit');
const saveCompanionLimitBtn = document.getElementById('saveCompanionLimitBtn');
const enableEmailField = document.getElementById('enableEmailField');
const enablePhoneField = document.getElementById('enablePhoneField');
const enableBirthDateField = document.getElementById('enableBirthDateField');
const saveFieldsConfigBtn = document.getElementById('saveFieldsConfigBtn');

// Modais
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const editModal = document.getElementById('editModal');
const clearConfirmModal = document.getElementById('clearConfirmModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const closeEditModal = document.getElementById('closeEditModal');
const closeClearModal = document.getElementById('closeClearModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const editForm = document.getElementById('editForm');
const addEditCompanionBtn = document.getElementById('addEditCompanionBtn');
const editCompanionsList = document.getElementById('editCompanionsList');
const editCompanionsGroup = document.getElementById('editCompanionsGroup');

// Variáveis para controle
let guestToDelete = null;
let guestToEdit = null;

// Função para atualizar estatísticas
async function updateAdminStats() {
    const stats = await exportGuestsList();
    
    if (statConfirmed) {
        statConfirmed.textContent = stats.totalConfirmed;
    }
    if (statMaybe) {
        statMaybe.textContent = stats.totalMaybe;
    }
    if (statDeclined) {
        statDeclined.textContent = stats.totalDeclined;
    }
}

// Função para calcular idade a partir da data de nascimento
function calculateAge(birthDate) {
    if (!birthDate) return '';
    
    // Criar data usando fuso horário local para evitar problemas de timezone
    const birthParts = birthDate.split('-');
    const birth = new Date(parseInt(birthParts[0]), parseInt(birthParts[1]) - 1, parseInt(birthParts[2]));
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age >= 0 ? age : '';
}

// Função para formatar data de nascimento
function formatBirthDate(birthDate) {
    if (!birthDate) return '';
    
    // Criar data usando fuso horário local para evitar problemas de timezone
    const dateParts = birthDate.split('-');
    const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    return date.toLocaleDateString('pt-BR');
}

// Função para exportar para Excel
async function exportToExcel() {
    const stats = await exportGuestsList();
    const guests = stats.all;
    
    // Criar cabeçalhos
    const headers = ['Nome', 'E-mail', 'Telefone', 'Data de Nascimento', 'Idade', 'Status', 'Tipo', 'Convidado Principal', 'Data de Cadastro'];
    
    // Criar linhas de dados - uma linha para cada pessoa (convidado + acompanhantes)
    const rows = [];
    
    guests.forEach(guest => {
        const status = guest.attendance === 'yes' ? 'Confirmado' : 
                      guest.attendance === 'maybe' ? 'Em Dúvida' : 'Não Comparecerá';
        const date = new Date(guest.dateAdded).toLocaleDateString('pt-BR');
        const birthDate = guest.birthDate ? formatBirthDate(guest.birthDate) : '';
        const age = guest.birthDate ? calculateAge(guest.birthDate) : '';
        
        // Linha do convidado principal
        rows.push([
            guest.name || '',
            guest.email || '',
            guest.phone || '',
            birthDate,
            age,
            status,
            'Convidado',
            '-', // Convidado principal não tem convidado principal
            date
        ]);
        
        // Linhas dos acompanhantes (se houver)
        if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach(companion => {
                // Verificar se companion é objeto (com nome e birthDate) ou string (legado)
                const companionName = typeof companion === 'object' ? (companion.name || '') : (companion || '');
                const companionBirthDate = typeof companion === 'object' ? (companion.birthDate || null) : null;
                const companionBirthDateFormatted = companionBirthDate ? formatBirthDate(companionBirthDate) : '';
                const companionAge = companionBirthDate ? calculateAge(companionBirthDate) : '';
                
                rows.push([
                    companionName,
                    guest.email || '', // Mesmo e-mail do convidado principal
                    guest.phone || '', // Mesmo telefone do convidado principal
                    companionBirthDateFormatted,
                    companionAge,
                    status,
                    'Acompanhante',
                    guest.name || '', // Nome do convidado principal
                    date
                ]);
            });
        }
    });
    
    // Verificar se a biblioteca SheetJS está disponível
    if (typeof XLSX === 'undefined') {
        console.error('Biblioteca SheetJS não encontrada. Usando fallback CSV.');
        // Fallback para CSV se SheetJS não estiver disponível
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `lista_convidados_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    
    // Criar workbook do Excel usando SheetJS
    const wb = XLSX.utils.book_new();
    
    // Criar worksheet com os dados
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    const colWidths = [
        { wch: 25 }, // Nome
        { wch: 30 }, // E-mail
        { wch: 18 }, // Telefone
        { wch: 18 }, // Data de Nascimento
        { wch: 8 },  // Idade
        { wch: 15 }, // Status
        { wch: 12 }, // Tipo
        { wch: 25 }, // Convidado Principal
        { wch: 15 }  // Data de Cadastro
    ];
    ws['!cols'] = colWidths;
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Convidados');
    
    // Gerar arquivo Excel
    const fileName = `lista_convidados_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('Arquivo Excel gerado:', fileName);
}

// Submeter formulário de login admin usando Firebase Authentication
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminLogin').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        
        if (!email || !password) {
            if (adminError) {
                adminError.style.display = 'block';
                adminError.querySelector('p').textContent = 'Por favor, preencha todos os campos.';
            }
            return;
        }
        
        // Tentar autenticar com Firebase
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                
                await signInWithEmailAndPassword(window.firebaseAuth, email, password);
                
                // Login bem-sucedido
                if (adminLoginModal) adminLoginModal.style.display = 'none';
                if (adminError) adminError.style.display = 'none';
                adminLoginForm.reset();
                
                // Mostrar área administrativa
                if (adminArea) {
                    adminArea.style.display = 'block';
                    await loadAdminData();
                }
            } catch (error) {
                // Login falhou
                console.error('Erro de autenticação:', error);
                if (adminError) {
                    adminError.style.display = 'block';
                    let errorMessage = 'Login ou senha incorretos!';
                    
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Usuário não encontrado! Verifique se o e-mail está correto e se o usuário foi criado no Firebase Authentication.';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Senha incorreta! Verifique se a senha está correta.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'E-mail inválido! Digite um e-mail válido.';
                    } else if (error.code === 'auth/invalid-credential') {
                        errorMessage = 'E-mail ou senha incorretos! Verifique se o usuário foi criado no Firebase Authentication com este e-mail e senha.';
                    } else if (error.code === 'auth/too-many-requests') {
                        errorMessage = 'Muitas tentativas falharam. Aguarde alguns minutos antes de tentar novamente.';
                    }
                    
                    adminError.querySelector('p').textContent = errorMessage;
                }
            }
        } else {
            // Fallback: usar sistema antigo se Firebase não estiver configurado
            const ADMIN_CREDENTIALS = window.ADMIN_CONFIG || {
                login: 'admin',
                password: 'admin'
            };
            
            if (email === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password) {
                if (adminLoginModal) adminLoginModal.style.display = 'none';
                if (adminError) adminError.style.display = 'none';
                adminLoginForm.reset();
                
                if (adminArea) {
                    adminArea.style.display = 'block';
                    await updateAdminStats();
                }
            } else {
                if (adminError) {
                    adminError.style.display = 'block';
                    adminError.querySelector('p').textContent = 'Login ou senha incorretos!';
                }
            }
        }
    });
}

// Logout admin
// Menu Hambúrguer
if (adminMenuToggle && adminMobileMenu) {
    adminMenuToggle.addEventListener('click', function() {
        adminMenuToggle.classList.toggle('active');
        adminMobileMenu.classList.toggle('active');
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (!adminMenuToggle.contains(event.target) && !adminMobileMenu.contains(event.target)) {
            adminMenuToggle.classList.remove('active');
            adminMobileMenu.classList.remove('active');
        }
    });
}

// Logout Mobile
if (adminLogoutMobile) {
    adminLogoutMobile.addEventListener('click', async function() {
        // Fazer logout do Firebase se estiver autenticado
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                await signOut(window.firebaseAuth);
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        }
        
        // Limpar localStorage
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');
        
        // Fechar menu
        if (adminMenuToggle && adminMobileMenu) {
            adminMenuToggle.classList.remove('active');
            adminMobileMenu.classList.remove('active');
        }
        
        // Redirecionar para login
        window.location.href = 'admin.html';
    });
}

if (adminLogout) {
    adminLogout.addEventListener('click', async function() {
        // Fazer logout do Firebase se estiver autenticado
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                await signOut(window.firebaseAuth);
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        }
        
        if (adminArea) {
            adminArea.style.display = 'none';
        }
        if (adminLoginModal) {
            adminLoginModal.style.display = 'flex';
        }
    });
}

// Botão exportar Excel
if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', function() {
        exportToExcel();
    });
}

// Função para carregar todos os dados do admin
async function loadAdminData() {
    try {
        // Carregar estatísticas
        await updateAdminStats();
        
        // Carregar configurações
        await loadCompanionLimit();
        await loadFieldsConfig();
        
        // Executar busca inicial (mostra todos os convidados paginados)
        performSearch();
        
        // Atualizar visibilidade do botão de limpar busca
        if (searchInput) {
            updateClearButtonVisibility();
        }
    } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
    }
}

// Verificar se já está autenticado ao carregar a página
async function checkAuthState() {
    // Mostrar modal de login inicialmente (será escondido se usuário estiver autenticado)
    if (adminLoginModal) adminLoginModal.style.display = 'flex';
    if (adminArea) adminArea.style.display = 'none';
    
    if (isFirebaseConfigured() && window.firebaseAuth) {
        try {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
            
            // Verificar estado de autenticação
            onAuthStateChanged(window.firebaseAuth, async (user) => {
                if (user) {
                    // Usuário autenticado - mostrar área admin
                    console.log('Usuário autenticado:', user.email);
                    if (adminArea) adminArea.style.display = 'block';
                    if (adminLoginModal) adminLoginModal.style.display = 'none';
                    
                    // Carregar dados do admin
                    await loadAdminData();
                } else {
                    // Usuário não está autenticado - mostrar modal de login
                    if (adminArea) adminArea.style.display = 'none';
                    if (adminLoginModal) adminLoginModal.style.display = 'flex';
                }
            });
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            // Em caso de erro, sempre mostrar modal de login
            if (adminLoginModal) adminLoginModal.style.display = 'flex';
            if (adminArea) adminArea.style.display = 'none';
        }
    } else {
        // Firebase não configurado - sempre mostrar modal de login
        if (adminLoginModal) adminLoginModal.style.display = 'flex';
        if (adminArea) adminArea.style.display = 'none';
    }
}

// Prevenir submit do formulário de senha
const clearPasswordForm = document.getElementById('clearPasswordForm');
if (clearPasswordForm) {
    clearPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // O botão confirmClearBtn já tem o event listener, então não precisa fazer nada aqui
    });
}

// Botão limpar lista
if (clearListBtn) {
    clearListBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Botão limpar lista clicado');
        
        if (!clearConfirmModal) {
            console.error('Modal de confirmação não encontrado!');
            alert('Erro: Modal de confirmação não encontrado!');
            return;
        }
        
        console.log('Abrindo modal de confirmação');
        console.log('Modal antes:', clearConfirmModal.style.display);
        console.log('Modal computed style:', window.getComputedStyle(clearConfirmModal).display);
        
        // Forçar exibição do modal
        clearConfirmModal.style.cssText = 'display: flex !important; z-index: 10005 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important;';
        
        console.log('Modal depois:', clearConfirmModal.style.display);
        console.log('Modal computed style depois:', window.getComputedStyle(clearConfirmModal).display);
        console.log('Modal offsetParent:', clearConfirmModal.offsetParent);
        console.log('Modal z-index:', window.getComputedStyle(clearConfirmModal).zIndex);
        
        // Limpar campo de senha e erro
        const passwordInput = document.getElementById('clearPassword');
        const passwordError = document.getElementById('clearPasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
            setTimeout(() => {
                passwordInput.focus();
                console.log('Campo de senha focado');
            }, 300);
        } else {
            console.error('Campo de senha não encontrado!');
        }
        
        if (passwordError) {
            passwordError.style.display = 'none';
        } else {
            console.error('Elemento de erro não encontrado!');
        }
    });
} else {
    console.error('Botão limpar lista não encontrado!');
}

// Confirmar limpeza
if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        console.log('Botão confirmar limpeza clicado');
        
        const passwordInput = document.getElementById('clearPassword');
        const passwordError = document.getElementById('clearPasswordError');
        
        if (!passwordInput) {
            console.error('Campo de senha não encontrado!');
            alert('Erro: Campo de senha não encontrado!');
            return;
        }
        
        if (!passwordInput.value.trim()) {
            console.log('Senha não fornecida');
            if (passwordError) {
                passwordError.style.display = 'block';
                const errorText = passwordError.querySelector('p');
                if (errorText) {
                    errorText.textContent = 'Por favor, digite sua senha!';
                }
            }
            passwordInput.focus();
            return;
        }
        
        const password = passwordInput.value.trim();
        console.log('Validando senha...');
        
        // Validar senha
        let isValidPassword = false;
        
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                // Verificar se o usuário está autenticado e a senha está correta
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                
                // Obter o e-mail do usuário atual autenticado
                const currentUser = window.firebaseAuth.currentUser;
                if (currentUser && currentUser.email) {
                    console.log('Usuário autenticado encontrado:', currentUser.email);
                    // Tentar fazer login novamente com a senha fornecida
                    // Se funcionar, a senha está correta
                    try {
                        await signInWithEmailAndPassword(window.firebaseAuth, currentUser.email, password);
                        isValidPassword = true;
                        console.log('Senha válida!');
                    } catch (error) {
                        console.log('Senha inválida:', error.message);
                        isValidPassword = false;
                    }
                } else {
                    console.log('Nenhum usuário autenticado, usando fallback');
                    // Se não houver usuário autenticado, usar fallback
                    const ADMIN_CREDENTIALS = window.ADMIN_CONFIG || {
                        login: 'admin',
                        password: 'admin'
                    };
                    isValidPassword = (password === ADMIN_CREDENTIALS.password);
                    console.log('Validação fallback:', isValidPassword);
                }
            } catch (error) {
                console.error('Erro ao validar senha:', error);
                isValidPassword = false;
            }
        } else {
            console.log('Firebase não configurado, usando fallback');
            // Fallback: usar sistema antigo se Firebase não estiver configurado
            const ADMIN_CREDENTIALS = window.ADMIN_CONFIG || {
                login: 'admin',
                password: 'admin'
            };
            isValidPassword = (password === ADMIN_CREDENTIALS.password);
            console.log('Validação fallback:', isValidPassword);
        }
        
        if (!isValidPassword) {
            console.log('Senha incorreta, exibindo erro');
            if (passwordError) {
                passwordError.style.display = 'block';
                const errorText = passwordError.querySelector('p');
                if (errorText) {
                    errorText.textContent = 'Senha incorreta!';
                }
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            return;
        }
        
        // Senha correta, proceder com a limpeza
        console.log('Senha válida, iniciando limpeza...');
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        // Mostrar loading
        if (confirmClearBtn) {
            confirmClearBtn.disabled = true;
            confirmClearBtn.textContent = 'Excluindo...';
        }
        
        try {
            await clearAllGuests();
            console.log('Limpeza concluída com sucesso');
            
            // Limpar campo de senha
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            if (clearConfirmModal) {
                clearConfirmModal.style.display = 'none';
                clearConfirmModal.setAttribute('style', 'display: none;');
            }
            
            await updateAdminStats();
            if (searchResults) {
                searchResults.innerHTML = '';
            }
            
            // Atualizar lista local
            guestsList = [];
            await loadGuestsFromFirestore();
            
            // Atualizar resultados da busca se houver
            if (searchInput && searchInput.value.trim()) {
                performSearch();
            }
        } catch (error) {
            console.error('Erro ao limpar lista:', error);
            alert('Erro ao limpar lista: ' + error.message);
        } finally {
            if (confirmClearBtn) {
                confirmClearBtn.disabled = false;
                confirmClearBtn.textContent = 'Sim, Excluir Tudo';
            }
        }
    });
} else {
    console.error('Botão confirmar limpeza não encontrado!');
}

// Cancelar limpeza
if (cancelClearBtn) {
    cancelClearBtn.addEventListener('click', function() {
        const passwordInput = document.getElementById('clearPassword');
        const passwordError = document.getElementById('clearPasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
        }
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        if (clearConfirmModal) {
            clearConfirmModal.style.display = 'none';
            clearConfirmModal.setAttribute('style', 'display: none;');
        }
    });
}

if (closeClearModal) {
    closeClearModal.addEventListener('click', function() {
        const passwordInput = document.getElementById('clearPassword');
        const passwordError = document.getElementById('clearPasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
        }
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        if (clearConfirmModal) {
            clearConfirmModal.style.display = 'none';
            clearConfirmModal.setAttribute('style', 'display: none;');
        }
    });
}

// Variável para debounce da busca
let searchTimeout = null;
const searchDelay = 400; // Delay de 400ms para evitar múltiplas consultas

// Buscar convidados
if (searchBtn) {
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
}

// Botão de limpar busca
const clearSearchBtn = document.getElementById('clearSearchBtn');
if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', function() {
        if (searchInput) {
            searchInput.value = '';
            updateClearButtonVisibility();
            performSearch(); // Mostrar todos os resultados
        }
    });
}

// Função para atualizar visibilidade do botão de limpar
function updateClearButtonVisibility() {
    if (clearSearchBtn && searchInput) {
        if (searchInput.value.trim().length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    }
}

// Busca em tempo real com debounce
if (searchInput) {
    // Buscar enquanto digita (com debounce)
    searchInput.addEventListener('input', function() {
        updateClearButtonVisibility();
        
        // Limpar timeout anterior
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Criar novo timeout
        searchTimeout = setTimeout(() => {
            performSearch();
        }, searchDelay);
    });
    
    // Buscar ao pressionar Enter (sem delay)
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            // Limpar timeout se houver
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            performSearch();
        }
    });
    
    // Atualizar visibilidade do botão ao carregar
    updateClearButtonVisibility();
}

// Variável para ordenação
let sortOrder = 'name'; // 'name' ou 'none'

// Variável para controlar se deve resetar página
let shouldResetPage = true;

// Função para calcular relevância de um resultado na busca
function calculateRelevance(item, searchTerm) {
    let score = 0;
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.name || '').toLowerCase();
    
    // Pontuação para correspondência no nome
    if (itemName) {
        // Correspondência exata (máxima pontuação)
        if (itemName === searchLower) {
            score += 1000;
        }
        // Começa com o termo de busca (alta pontuação)
        else if (itemName.startsWith(searchLower)) {
            score += 500;
        }
        // Contém o termo de busca (pontuação base)
        else if (itemName.includes(searchLower)) {
            score += 100;
            // Bônus se estiver no início de uma palavra
            const words = itemName.split(/\s+/);
            words.forEach(word => {
                if (word.startsWith(searchLower)) {
                    score += 50;
                }
            });
        }
    }
    
    // Pontuação para correspondência no e-mail
    if (item.email) {
        const emailLower = item.email.toLowerCase();
        if (emailLower === searchLower) {
            score += 300;
        } else if (emailLower.startsWith(searchLower)) {
            score += 150;
        } else if (emailLower.includes(searchLower)) {
            score += 50;
        }
    }
    
    // Pontuação para correspondência no telefone
    if (item.phone) {
        const phoneClean = item.phone.replace(/\D/g, '');
        const searchClean = searchTerm.replace(/\D/g, '');
        if (phoneClean.includes(searchClean)) {
            score += 30;
        }
    }
    
    // Penalidade para acompanhantes (convidados principais têm prioridade)
    if (item.isCompanion) {
        score -= 10;
    }
    
    return score;
}

// Função de busca
function performSearch(resetPage = true) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Resetar para primeira página apenas se solicitado (não ao mudar de página)
    if (resetPage) {
        currentPage = 1;
    }
    
    let results;
    
    if (!searchTerm) {
        // Se estiver vazio, mostrar todos os convidados
        results = [...guestsList];
    } else {
        // Filtrar por termo de busca (incluindo acompanhantes)
        results = guestsList.filter(guest => {
            const nameMatch = guest.name && guest.name.toLowerCase().includes(searchTerm);
            const emailMatch = guest.email && guest.email.toLowerCase().includes(searchTerm);
            const phoneMatch = guest.phone && guest.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
            
            // Verificar se algum acompanhante corresponde ao termo de busca
            let companionMatch = false;
            if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
                companionMatch = guest.companions.some(companion => {
                    const companionName = typeof companion === 'object' ? (companion.name || '') : (companion || '');
                    return companionName.toLowerCase().includes(searchTerm);
                });
            }
            
            return nameMatch || emailMatch || phoneMatch || companionMatch;
        });
    }
    
    displaySearchResults(results, searchTerm);
}

// Exibir resultados da busca com paginação
function displaySearchResults(results, searchTerm = '') {
    if (!searchResults) {
        console.error('Elemento searchResults não encontrado');
        return;
    }
    
    // Sempre exibir a lista, mesmo se estiver vazia (mas com mensagem)
    if (results.length === 0) {
        searchResults.innerHTML = '<p class="search-message">Nenhum convidado encontrado.</p>';
        return;
    }
    
    // PRIMEIRO: Expandir TODOS os resultados para incluir acompanhantes
    const expandedResults = [];
    results.forEach(guest => {
        // Adicionar o convidado principal
        expandedResults.push({ ...guest, isCompanion: false, companionIndex: null });
        
        // Adicionar cada acompanhante como item separado
        if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach((companion, index) => {
                // Verificar se companion é objeto (com nome e birthDate) ou string (legado)
                const companionName = typeof companion === 'object' ? (companion.name || '') : (companion || '');
                expandedResults.push({
                    ...guest,
                    name: companionName,
                    birthDate: typeof companion === 'object' ? (companion.birthDate || null) : null,
                    mainGuestName: guest.name, // Guardar nome do convidado principal
                    mainGuestId: guest.id || guest.name, // Guardar ID do convidado principal para exclusão
                    isCompanion: true,
                    companionIndex: index
                });
            });
        }
    });
    
    // Ordenar por relevância se houver termo de busca, senão por nome se solicitado
    if (searchTerm && searchTerm.trim().length > 0) {
        // Calcular relevância para cada item
        expandedResults.forEach(item => {
            item._relevanceScore = calculateRelevance(item, searchTerm);
        });
        
        // Ordenar por relevância (maior pontuação primeiro)
        expandedResults.sort((a, b) => {
            // Primeiro por relevância (maior primeiro)
            if (b._relevanceScore !== a._relevanceScore) {
                return b._relevanceScore - a._relevanceScore;
            }
            // Se a relevância for igual, ordenar por nome
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'pt-BR');
        });
        
        // Remover a propriedade temporária de pontuação
        expandedResults.forEach(item => {
            delete item._relevanceScore;
        });
    } else if (sortOrder === 'name') {
        // Ordenar por nome se não houver busca
        expandedResults.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'pt-BR');
        });
    }
    
    // DEPOIS: Calcular paginação dos resultados expandidos
    const totalExpanded = expandedResults.length;
    const totalPages = Math.ceil(totalExpanded / itemsPerPage);
    
    // Garantir que currentPage não seja maior que totalPages
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = expandedResults.slice(startIndex, endIndex);
    
    let html = '<div class="results-list">';
    
    // Adicionar controles de ordenação
    html += `<div class="sort-controls">
        <label for="sortSelect">Ordenar por:</label>
        <select id="sortSelect" class="sort-select" onchange="changeSortOrder(this.value)">
            <option value="none" ${sortOrder === 'none' ? 'selected' : ''}>Sem ordenação</option>
            <option value="name" ${sortOrder === 'name' ? 'selected' : ''}>Nome (A-Z)</option>
        </select>
    </div>`;
    
    // Mostrar informações de paginação (usando total expandido)
    html += `<div class="pagination-info">
        <p>Mostrando ${startIndex + 1} - ${Math.min(endIndex, totalExpanded)} de ${totalExpanded} pessoa(s) - Página ${currentPage} de ${totalPages}</p>
    </div>`;
    
    // Função auxiliar para calcular idade
    function calculateAge(birthDate) {
        if (!birthDate) return null;
        try {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return null;
        }
    }
    
    // Função auxiliar para formatar data de nascimento
    function formatBirthDate(birthDate) {
        if (!birthDate) return null;
        try {
            // Se a data está no formato YYYY-MM-DD, usar componentes diretamente para evitar problemas de fuso horário
            if (typeof birthDate === 'string' && birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = birthDate.split('-');
                // Criar data usando componentes locais (sem conversão de fuso horário)
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString('pt-BR');
            } else {
                // Para outros formatos, usar a data diretamente
                const date = new Date(birthDate);
                // Verificar se a data é válida
                if (isNaN(date.getTime())) return null;
                return date.toLocaleDateString('pt-BR');
            }
        } catch (e) {
            return null;
        }
    }
    
    // Função auxiliar para formatar idade no formato solicitado
    function formatAgeWithBirthDate(birthDate) {
        if (!birthDate) return null;
        const formattedBirthDate = formatBirthDate(birthDate);
        const age = calculateAge(birthDate);
        if (formattedBirthDate && age !== null) {
            return `${formattedBirthDate} - ${age} anos`;
        }
        return null;
    }
    
    paginatedResults.forEach(item => {
        const status = item.attendance === 'yes' ? 'Confirmado' :
                      item.attendance === 'maybe' ? 'Em Dúvida' : 'Não Comparecerá';
        const statusIcon = item.attendance === 'yes' ? '✅' : 
                          item.attendance === 'maybe' ? '❓' : '❌';
        const date = new Date(item.dateAdded).toLocaleDateString('pt-BR');
        
        // Formatar idade com data de nascimento no formato solicitado
        const birthDate = item.birthDate || null;
        const ageText = formatAgeWithBirthDate(birthDate);
        
        // Verificar se e-mail e telefone estão preenchidos
        const hasEmail = item.email && item.email.trim() !== '';
        const hasPhone = item.phone && item.phone.trim() !== '';
        
        if (item.isCompanion) {
            // Item é um acompanhante
            const mainGuestName = item.mainGuestName || 'Convidado Principal';
            html += `
                <div class="result-item result-companion">
                    <div class="result-info">
                        <h4>${item.name} <span class="companion-badge">Acompanhante</span></h4>
                        <p class="companion-main-guest"><strong>Convidado Principal:</strong> ${mainGuestName}</p>
                        ${hasEmail ? `<p><strong>E-mail:</strong> ${item.email}</p>` : ''}
                        ${hasPhone ? `<p><strong>Telefone:</strong> ${item.phone}</p>` : ''}
                        ${ageText ? `<p><strong>Idade:</strong> ${ageText}</p>` : ''}
                        <p><strong>Status:</strong> ${statusIcon} ${status}</p>
                        <p><strong>Data:</strong> ${date}</p>
                    </div>
                    <div class="result-actions">
                        <button class="btn-delete" onclick="deleteCompanion('${item.mainGuestId || item.id || item.mainGuestName}', ${item.companionIndex})">🗑️ Excluir Acompanhante</button>
                    </div>
                </div>
            `;
        } else {
            // Item é um convidado principal
            const companionsCount = item.companions && Array.isArray(item.companions) ? item.companions.length : 0;
            html += `
                <div class="result-item">
                    <div class="result-info">
                        <h4>${item.name || 'Sem nome'}</h4>
                        ${hasEmail ? `<p><strong>E-mail:</strong> ${item.email}</p>` : ''}
                        ${hasPhone ? `<p><strong>Telefone:</strong> ${item.phone}</p>` : ''}
                        ${ageText ? `<p><strong>Idade:</strong> ${ageText}</p>` : ''}
                        <p><strong>Status:</strong> ${statusIcon} ${status}</p>
                        <p><strong>Data:</strong> ${date}</p>
                        ${companionsCount > 0 ? `<p><strong>Acompanhantes:</strong> ${companionsCount} pessoa(s)</p>` : ''}
                    </div>
                    <div class="result-actions">
                        <button class="btn-edit" onclick="editGuest('${item.id || item.name}')">✏️ Editar</button>
                        <button class="btn-delete" onclick="deleteGuest('${item.id || item.name}')">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    
    // Sempre adicionar controles de paginação se houver mais de uma página
    if (totalPages > 1) {
        html += generatePaginationControls(totalPages, currentPage);
    }
    
    searchResults.innerHTML = html;
    
    // Garantir que a seção de resultados seja visível
    if (searchResults.style.display === 'none') {
        searchResults.style.display = 'block';
    }
}

// Gerar controles de paginação
function generatePaginationControls(totalPages, currentPage) {
    let html = '<div class="pagination-controls">';
    
    // Botão Anterior
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})">« Anterior</button>`;
    } else {
        html += `<button class="pagination-btn pagination-btn-disabled" disabled>« Anterior</button>`;
    }
    
    // Números das páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="pagination-btn pagination-btn-active">${i}</button>`;
        } else {
            html += `<button class="pagination-btn" onclick="goToPage(${i})">${i}</button>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Botão Próximo
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})">Próximo »</button>`;
    } else {
        html += `<button class="pagination-btn pagination-btn-disabled" disabled>Próximo »</button>`;
    }
    
    html += '</div>';
    return html;
}

// Função para navegar para uma página específica
window.goToPage = function(page) {
    console.log('Navegando para página:', page);
    currentPage = page;
    performSearch(false); // Não resetar página, apenas atualizar
    // Scroll para o topo dos resultados
    if (searchResults) {
        searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// Função para alterar ordenação
window.changeSortOrder = function(order) {
    sortOrder = order;
    currentPage = 1; // Resetar para primeira página ao mudar ordenação
    performSearch(true); // Resetar página ao mudar ordenação
};

// Função global para editar convidado
window.editGuest = function(guestId) {
    console.log('Editando convidado:', guestId);
    
    // Buscar o convidado na lista
    const guest = guestsList.find(g => {
        if (g.id && g.id.toString() === guestId.toString()) return true;
        if (g.name === guestId) return true;
        return false;
    });
    
    if (!guest) {
        console.error('Convidado não encontrado:', guestId);
        alert('Convidado não encontrado!');
        return;
    }
    
    console.log('Convidado encontrado:', guest);
    console.log('ID do convidado encontrado:', guest.id);
    // Criar uma cópia profunda do convidado para evitar referências
    guestToEdit = JSON.parse(JSON.stringify(guest));
    
    // Garantir que o ID seja preservado
    if (!guestToEdit.id && guestToEdit.firestoreId) {
        guestToEdit.id = guestToEdit.firestoreId;
    }
    
    // Garantir que ambos id e firestoreId estejam presentes
    if (guestToEdit.id && !guestToEdit.firestoreId) {
        guestToEdit.firestoreId = guestToEdit.id;
    }
    if (guestToEdit.firestoreId && !guestToEdit.id) {
        guestToEdit.id = guestToEdit.firestoreId;
    }
    
    console.log('🔍 editGuest - guest encontrado:', guest);
    console.log('🔍 editGuest - guestToEdit definido:', guestToEdit);
    console.log('🔍 editGuest - guestToEdit.id:', guestToEdit.id);
    console.log('🔍 editGuest - guestToEdit.firestoreId:', guestToEdit.firestoreId);
    
    // Preencher formulário de edição
    const nameInput = document.getElementById('editName');
    const emailInput = document.getElementById('editEmail');
    const phoneInput = document.getElementById('editPhone');
    const birthDateInput = document.getElementById('editBirthDate');
    
    if (nameInput) nameInput.value = guest.name || '';
    if (emailInput) emailInput.value = guest.email || '';
    if (phoneInput) phoneInput.value = guest.phone || '';
    if (birthDateInput) birthDateInput.value = guest.birthDate || '';
    
    // Configurar limite máximo da data de nascimento
    if (birthDateInput) {
        const today = new Date().toISOString().split('T')[0];
        birthDateInput.setAttribute('max', today);
    }
    
    // Selecionar status
    const attendanceRadios = document.querySelectorAll('input[name="editAttendance"]');
    attendanceRadios.forEach(radio => {
        radio.checked = (radio.value === guest.attendance);
    });
    
    // Preencher acompanhantes
    if (editCompanionsList) {
        editCompanionsList.innerHTML = '';
        
        // Se não houver acompanhantes, criar array vazio
        if (!guest.companions) {
            guest.companions = [];
        }
        
        // Adicionar cada acompanhante existente
        if (Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach((companion, index) => {
                addCompanionInput(companion, index);
            });
        }
    }
    
    // Mostrar modal
    if (editModal) {
        editModal.style.display = 'flex';
        console.log('Modal de edição aberto');
    } else {
        console.error('Modal de edição não encontrado!');
    }
};

// Função auxiliar para adicionar input de acompanhante
function addCompanionInput(value = '', index = null) {
    if (!editCompanionsList) return;
    
    const companionDiv = document.createElement('div');
    companionDiv.className = 'companion-edit-item';
    
    // Verificar se value é objeto (com nome e birthDate) ou string (legado)
    const companionName = typeof value === 'object' ? (value.name || '') : (value || '');
    const companionBirthDate = typeof value === 'object' ? (value.birthDate || '') : '';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'companion-edit-input';
    nameInput.value = companionName;
    nameInput.placeholder = 'Nome do acompanhante';
    if (index !== null) {
        nameInput.setAttribute('data-index', index);
    }
    
    const birthDateInput = document.createElement('input');
    birthDateInput.type = 'date';
    birthDateInput.className = 'companion-edit-birthdate';
    birthDateInput.value = companionBirthDate;
    birthDateInput.placeholder = 'Data de nascimento';
    const today = new Date().toISOString().split('T')[0];
    birthDateInput.setAttribute('max', today);
    if (index !== null) {
        birthDateInput.setAttribute('data-index', index);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-companion';
    removeBtn.textContent = '×';
    removeBtn.onclick = function() {
        companionDiv.remove();
    };
    
    companionDiv.appendChild(nameInput);
    companionDiv.appendChild(birthDateInput);
    companionDiv.appendChild(removeBtn);
    editCompanionsList.appendChild(companionDiv);
}

// Função global para excluir convidado
window.deleteGuest = function(guestId) {
    const guest = guestsList.find(g => (g.id && g.id.toString() === guestId) || g.name === guestId);
    
    if (!guest) {
        alert('Convidado não encontrado!');
        return;
    }
    
    // Verificar se há outros convidados com mesmo e-mail/telefone
    const similarGuests = guestsList.filter(g => 
        (g.email && g.email === guest.email) || 
        (g.phone && g.phone === guest.phone)
    );
    
    if (similarGuests.length > 1) {
        // Mostrar lista para escolher qual excluir
        let message = 'Encontrados múltiplos convidados com mesmo e-mail/telefone:\n\n';
        similarGuests.forEach((g, index) => {
            message += `${index + 1}. ${g.name} (${g.email || 'sem e-mail'})\n`;
        });
        message += '\nQual deseja excluir? (Digite o número)';
        
        const choice = prompt(message);
        const choiceIndex = parseInt(choice) - 1;
        
        if (choiceIndex >= 0 && choiceIndex < similarGuests.length) {
            guestToDelete = similarGuests[choiceIndex];
        } else {
            alert('Opção inválida!');
            return;
        }
    } else {
        guestToDelete = guest;
    }
    
    if (deleteConfirmModal) {
        const message = document.getElementById('deleteConfirmMessage');
        if (message) {
            // Verificar se há acompanhantes
            const companionsCount = guestToDelete.companions && Array.isArray(guestToDelete.companions) ? guestToDelete.companions.length : 0;
            let messageHTML = `Tem certeza que deseja excluir <strong>"${guestToDelete.name}"</strong>?`;
            
            if (companionsCount > 0) {
                messageHTML += `<br><br><span style="color: #dc3545; font-weight: 600;">⚠️ ATENÇÃO: ${companionsCount} acompanhante(s) também será(ão) excluído(s):</span><br>`;
                guestToDelete.companions.forEach((companion) => {
                    const companionName = typeof companion === 'object' ? (companion.name || '') : (companion || '');
                    messageHTML += `&nbsp;&nbsp;• ${companionName}<br>`;
                });
            }
            
            messageHTML += '<br><strong>Esta ação não pode ser desfeita!</strong>';
            message.innerHTML = messageHTML;
        }
        
        // Limpar campo de senha e erro
        const passwordInput = document.getElementById('deletePassword');
        const passwordError = document.getElementById('deletePasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
            setTimeout(() => {
                passwordInput.focus();
            }, 300);
        }
        
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        deleteConfirmModal.style.display = 'flex';
    }
};

// Função global para excluir acompanhante
window.deleteCompanion = async function(guestId, companionIndex) {
    const guest = guestsList.find(g => (g.id && g.id.toString() === guestId) || g.name === guestId);
    
    if (!guest || !guest.companions || !guest.companions[companionIndex]) {
        alert('Acompanhante não encontrado!');
        return;
    }
    
    const companion = guest.companions[companionIndex];
    const companionName = typeof companion === 'object' ? (companion.name || '') : (companion || '');
    
    if (confirm(`Tem certeza que deseja excluir o acompanhante "${companionName}"?`)) {
        guest.companions.splice(companionIndex, 1);
        await saveGuestToFirestore(guest);
        
        // Atualizar lista local
        const index = guestsList.findIndex(g => 
            (g.id && g.id === guest.id) || 
            (g.name && g.name === guest.name)
        );
        if (index !== -1) {
            guestsList[index] = guest;
        }
        
        await updateAdminStats();
        performSearch(); // Atualizar resultados da busca
        showAdminNotification('Acompanhante excluído com sucesso!', 'success');
    }
};

// Confirmar exclusão
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (!guestToDelete) {
            return;
        }
        
        const passwordInput = document.getElementById('deletePassword');
        const passwordError = document.getElementById('deletePasswordError');
        
        if (!passwordInput) {
            console.error('Campo de senha não encontrado!');
            alert('Erro: Campo de senha não encontrado!');
            return;
        }
        
        if (!passwordInput.value.trim()) {
            if (passwordError) {
                passwordError.style.display = 'block';
                const errorText = passwordError.querySelector('p');
                if (errorText) {
                    errorText.textContent = 'Por favor, digite sua senha!';
                }
            }
            passwordInput.focus();
            return;
        }
        
        const password = passwordInput.value.trim();
        
        // Validar senha
        let isValidPassword = false;
        
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                
                // Obter o e-mail do usuário atual autenticado
                const currentUser = window.firebaseAuth.currentUser;
                if (currentUser && currentUser.email) {
                    console.log('Usuário autenticado encontrado:', currentUser.email);
                    // Tentar fazer login novamente com a senha fornecida
                    try {
                        await signInWithEmailAndPassword(window.firebaseAuth, currentUser.email, password);
                        isValidPassword = true;
                        console.log('Senha válida!');
                    } catch (error) {
                        console.log('Senha inválida:', error.message);
                        isValidPassword = false;
                    }
                } else {
                    console.log('Nenhum usuário autenticado, não é possível validar senha');
                    // Se não houver usuário autenticado, não podemos validar a senha
                    // Mostrar mensagem de erro
                    if (passwordError) {
                        passwordError.style.display = 'block';
                        const errorText = passwordError.querySelector('p');
                        if (errorText) {
                            errorText.textContent = 'Você precisa estar logado para validar a senha. Faça login primeiro.';
                        }
                    }
                    return;
                }
            } catch (error) {
                console.error('Erro ao validar senha:', error);
                isValidPassword = false;
            }
        } else {
            // Fallback: usar sistema antigo se Firebase não estiver configurado
            const ADMIN_CREDENTIALS = window.ADMIN_CONFIG || {
                login: 'admin',
                password: 'admin'
            };
            isValidPassword = (password === ADMIN_CREDENTIALS.password);
        }
        
        if (!isValidPassword) {
            if (passwordError) {
                passwordError.style.display = 'block';
                const errorText = passwordError.querySelector('p');
                if (errorText) {
                    errorText.textContent = 'Senha incorreta!';
                }
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            return;
        }
        
        // Senha correta, proceder com a exclusão
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        // Mostrar loading
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Excluindo...';
        }
        
        try {
            await deleteGuestFromFirestore(guestToDelete);
            
            // Limpar campo de senha
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            guestToDelete = null;
            if (deleteConfirmModal) {
                deleteConfirmModal.style.display = 'none';
            }
            
            // Mostrar mensagem de sucesso
            showAdminNotification('Convidado excluído com sucesso!', 'success');
            
            await updateAdminStats();
            performSearch(); // Atualizar resultados da busca
        } catch (error) {
            console.error('Erro ao excluir convidado:', error);
            showAdminNotification('Erro ao excluir convidado: ' + error.message, 'error');
        } finally {
            if (confirmDeleteBtn) {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Confirmar Exclusão';
            }
        }
    });
}

// Cancelar exclusão
if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', function() {
        const passwordInput = document.getElementById('deletePassword');
        const passwordError = document.getElementById('deletePasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
        }
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        guestToDelete = null;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
    });
}

if (closeDeleteModal) {
    closeDeleteModal.addEventListener('click', function() {
        const passwordInput = document.getElementById('deletePassword');
        const passwordError = document.getElementById('deletePasswordError');
        
        if (passwordInput) {
            passwordInput.value = '';
        }
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        guestToDelete = null;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
    });
}

// Prevenir submit do formulário de senha de exclusão
const deletePasswordForm = document.getElementById('deletePasswordForm');
if (deletePasswordForm) {
    deletePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // O botão confirmDeleteBtn já tem o event listener
    });
}

// Fechar modal de edição
if (closeEditModal) {
    closeEditModal.addEventListener('click', function() {
        guestToEdit = null;
        if (editModal) {
            editModal.style.display = 'none';
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function() {
        guestToEdit = null;
        if (editModal) {
            editModal.style.display = 'none';
        }
    });
}

// Adicionar acompanhante no formulário de edição
if (addEditCompanionBtn) {
    addEditCompanionBtn.addEventListener('click', function() {
        addCompanionInput();
    });
}

// Salvar edição - Registrar após DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    const editFormElement = document.getElementById('editForm');
    if (editFormElement) {
        console.log('Formulário de edição encontrado e registrado');
        editFormElement.addEventListener('submit', handleEditSubmit);
    } else {
        console.error('Formulário de edição não encontrado no DOMContentLoaded!');
    }
});

// Também tentar registrar imediatamente (caso o DOM já esteja carregado)
if (editForm) {
    console.log('Formulário de edição encontrado imediatamente');
    editForm.addEventListener('submit', handleEditSubmit);
}

async function handleEditSubmit(e) {
    e.preventDefault();
    console.log('Formulário de edição submetido');
    
    if (!guestToEdit) {
        console.error('guestToEdit não definido');
        showEditMessage('Erro: Convidado não encontrado para edição!', 'error');
        return;
    }
    
    console.log('Salvando edição do convidado:', guestToEdit);
    
    // Coletar dados do formulário
    const nameInput = document.getElementById('editName');
    const emailInput = document.getElementById('editEmail');
    const phoneInput = document.getElementById('editPhone');
    const birthDateInput = document.getElementById('editBirthDate');
    const attendanceRadio = document.querySelector('input[name="editAttendance"]:checked');
    
    console.log('Inputs encontrados:', {
        nameInput: !!nameInput,
        emailInput: !!emailInput,
        phoneInput: !!phoneInput,
        birthDateInput: !!birthDateInput,
        attendanceRadio: !!attendanceRadio
    });
    
    // Validação básica - apenas verificar se os elementos existem
    if (!nameInput || !emailInput) {
        console.error('Campos não encontrados');
        showEditMessage('Erro: Campos do formulário não encontrados!', 'error');
        return;
    }
    
    console.log('Criando updatedGuest...');
    console.log('guestToEdit.id:', guestToEdit.id);
    
    // Validar nome completo (nome e sobrenome) se o campo estiver preenchido
    const nameValue = nameInput.value.trim();
    if (nameValue) {
        const nameParts = nameValue.split(/\s+/).filter(part => part.length > 0);
        if (nameParts.length < 2) {
            showEditMessage('Por favor, informe o nome completo (nome e sobrenome).', 'error');
            nameInput.focus();
            return;
        }
    }
    
    // Preservar o ID do Firestore mesmo se o nome for alterado
    // IMPORTANTE: O ID deve ser preservado ANTES de qualquer outra propriedade
    const originalId = guestToEdit.id || guestToEdit.firestoreId || null;
    console.log('🔍 ID original preservado:', originalId);
    console.log('🔍 guestToEdit.id:', guestToEdit.id);
    console.log('🔍 guestToEdit.firestoreId:', guestToEdit.firestoreId);
    console.log('🔍 guestToEdit completo:', guestToEdit);
    
    if (!originalId) {
        console.error('❌ ERRO CRÍTICO: Não foi possível encontrar o ID do convidado para edição!');
        showEditMessage('Erro: Não foi possível identificar o convidado para edição. Recarregue a página e tente novamente.', 'error');
        return;
    }
    console.log('guestToEdit completo antes de criar updatedGuest:', guestToEdit);
    
    // Criar updatedGuest garantindo que o ID seja preservado
    // NÃO usar spread operator primeiro, pois pode sobrescrever o ID
    const updatedGuest = {
        id: originalId, // DEFINIR O ID PRIMEIRO
        firestoreId: originalId, // Também como firestoreId para compatibilidade
        name: nameValue || null,
        email: emailInput.value.trim() || null,
        phone: phoneInput.value.trim() || null,
        birthDate: birthDateInput ? (birthDateInput.value || null) : null,
        attendance: attendanceRadio ? attendanceRadio.value : null,
        // Copiar outras propriedades do guestToEdit (exceto id, firestoreId e campos já definidos)
        ...Object.fromEntries(
            Object.entries(guestToEdit).filter(([key]) => 
                !['id', 'firestoreId', 'name', 'email', 'phone', 'birthDate', 'attendance'].includes(key)
            )
        )
    };
    
    console.log('✅ updatedGuest criado com ID:', updatedGuest.id);
    console.log('✅ updatedGuest.firestoreId:', updatedGuest.firestoreId);
    console.log('✅ updatedGuest completo:', updatedGuest);
    
    // Coletar acompanhantes
    if (editCompanionsList) {
        const companionInputs = editCompanionsList.querySelectorAll('.companion-edit-input');
        const companionBirthDates = editCompanionsList.querySelectorAll('.companion-edit-birthdate');
        updatedGuest.companions = [];
        
        // Validar todos os acompanhantes primeiro
        for (let index = 0; index < companionInputs.length; index++) {
            const nameInput = companionInputs[index];
            const name = nameInput.value.trim();
            if (name) {
                // Validar se o nome tem nome e sobrenome
                const nameParts = name.split(/\s+/).filter(part => part.length > 0);
                if (nameParts.length < 2) {
                    showEditMessage('Por favor, informe o nome completo (nome e sobrenome) do acompanhante.', 'error');
                    nameInput.focus();
                    return;
                }
            }
        }
        
        // Se passou na validação, coletar os dados
        companionInputs.forEach((nameInput, index) => {
            const name = nameInput.value.trim();
            if (name) {
                const birthDateInput = companionBirthDates[index];
                const birthDate = birthDateInput ? birthDateInput.value : null;
                updatedGuest.companions.push({
                    name: name,
                    birthDate: birthDate || null
                });
            }
        });
    } else {
        updatedGuest.companions = guestToEdit.companions || [];
    }
    
    console.log('Dados atualizados:', updatedGuest);
    
    // Salvar no Firestore
    try {
        console.log('📤 Chamando saveGuestToFirestore com:', updatedGuest);
        console.log('📤 updatedGuest.id:', updatedGuest.id);
        console.log('📤 updatedGuest.firestoreId:', updatedGuest.firestoreId);
        
        await saveGuestToFirestore(updatedGuest);
        
        console.log('✅ saveGuestToFirestore concluído com sucesso');
        console.log('✅ updatedGuest.id após salvar:', updatedGuest.id);
        
        // Atualizar lista local usando APENAS o ID (não o nome, pois pode ter mudado)
        const index = guestsList.findIndex(g => {
            // Usar APENAS o ID para encontrar o convidado
            if (g.id && originalId && g.id === originalId) return true;
            if (g.id && guestToEdit.id && g.id === guestToEdit.id) return true;
            return false;
        });
        
        if (index !== -1) {
            // Atualizar o item existente mantendo o ID
            guestsList[index] = { ...updatedGuest, id: originalId };
            console.log('Lista local atualizada pelo ID:', originalId);
        } else {
            // Se não encontrou pelo ID, tentar pelo nome antigo (fallback)
            const indexByName = guestsList.findIndex(g => {
                return g.name && guestToEdit.name && g.name === guestToEdit.name;
            });
            
            if (indexByName !== -1) {
                // Atualizar usando o ID encontrado
                const existingId = guestsList[indexByName].id;
                guestsList[indexByName] = { ...updatedGuest, id: existingId || originalId };
                console.log('Lista local atualizada pelo nome (fallback):', existingId || originalId);
            } else {
                // Se não encontrou de forma alguma, adicionar com o ID original
                guestsList.push({ ...updatedGuest, id: originalId });
                console.log('Convidado adicionado à lista local com ID:', originalId);
            }
        }
        
        // Mostrar mensagem de sucesso ANTES de fechar o modal
        showEditMessage('Convidado atualizado com sucesso!', 'success');
        
        await updateAdminStats();
        performSearch(); // Atualizar resultados da busca
        
        // Fechar modal após mostrar a mensagem de sucesso
        setTimeout(() => {
            guestToEdit = null;
            if (editModal) {
                editModal.style.display = 'none';
            }
        }, 3000); // 3 segundos para visualizar a mensagem de sucesso
    } catch (error) {
        console.error('Erro ao salvar no Firestore:', error);
        // Mostrar mensagem de erro detalhada
        const errorMessage = error.message || 'Erro ao salvar alterações. Tente novamente.';
        showEditMessage(`Erro: ${errorMessage}`, 'error');
        // NÃO recarregar a página em caso de erro para que o usuário possa ver a mensagem
    }
}

// Função para exibir mensagens na modal de edição
function showEditMessage(message, type = 'success') {
    console.log('showEditMessage chamado:', message, type);
    const messageElement = document.getElementById('editMessage');
    console.log('Elemento encontrado:', !!messageElement);
    
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = 'edit-message ' + type;
        messageElement.style.display = 'block';
        messageElement.style.visibility = 'visible';
        messageElement.style.opacity = '1';
        
        console.log('Mensagem exibida:', messageElement.textContent, messageElement.className);
        
        // Remover mensagem após 5 segundos (aumentado para dar mais tempo de visualização)
        setTimeout(() => {
            if (messageElement) {
                messageElement.style.display = 'none';
                messageElement.textContent = '';
                messageElement.className = 'edit-message';
            }
        }, 5000);
    } else {
        console.error('Elemento editMessage não encontrado!');
    }
}

// Função para exibir notificações na área admin
function showAdminNotification(message, type = 'success') {
    const notificationElement = document.getElementById('adminNotification');
    
    if (notificationElement) {
        notificationElement.textContent = message;
        notificationElement.className = 'admin-notification ' + type;
        notificationElement.style.display = 'block';
        notificationElement.style.visibility = 'visible';
        notificationElement.style.opacity = '1';
        
        // Scroll suave até a notificação
        setTimeout(() => {
            notificationElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
        // Remover mensagem após 4 segundos
        setTimeout(() => {
            if (notificationElement) {
                notificationElement.style.opacity = '0';
                notificationElement.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (notificationElement) {
                        notificationElement.style.display = 'none';
                        notificationElement.style.visibility = 'hidden';
                        notificationElement.className = 'admin-notification';
                    }
                }, 300);
            }
        }, 4000);
    } else {
        console.error('Elemento adminNotification não encontrado!');
    }
}

// Função para excluir convidado do Firestore
async function deleteGuestFromFirestore(guest) {
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, deleteDoc, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            const guestsRef = collection(window.firebaseDb, 'guests');
            
            // Se tem ID do Firestore, usar diretamente
            if (guest.id && typeof guest.id === 'string' && guest.id.length > 0) {
                await deleteDoc(doc(guestsRef, guest.id));
            } else {
                // Buscar por nome
                const q = query(guestsRef, where('name', '==', guest.name));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (docSnapshot) => {
                    await deleteDoc(doc(guestsRef, docSnapshot.id));
                });
            }
            
            // Remover do localStorage também
            guestsList = guestsList.filter(g => 
                !((g.id && g.id === guest.id) || (g.name && g.name === guest.name))
            );
            saveToLocalStorage();
            
            console.log('Convidado excluído do Firestore');
            return true;
        } catch (error) {
            console.error('Erro ao excluir do Firestore:', error);
            // Fallback: remover apenas do localStorage
            guestsList = guestsList.filter(g => 
                !((g.id && g.id === guest.id) || (g.name && g.name === guest.name))
            );
            saveToLocalStorage();
            return false;
        }
    } else {
        // Remover apenas do localStorage
        guestsList = guestsList.filter(g => 
            !((g.id && g.id === guest.id) || (g.name && g.name === guest.name))
        );
        saveToLocalStorage();
        return false;
    }
}

// Função para limpar toda a lista
async function clearAllGuests() {
    console.log('Iniciando limpeza de todos os convidados...');
    
    if (isFirebaseConfigured()) {
        try {
            console.log('Limpando Firestore...');
            const { collection, getDocs, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            const guestsRef = collection(window.firebaseDb, 'guests');
            const querySnapshot = await getDocs(guestsRef);
            
            console.log(`Encontrados ${querySnapshot.size} documentos para excluir`);
            
            // Excluir todos os documentos
            const deletePromises = [];
            querySnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(docSnapshot.ref));
            });
            
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                console.log('Todos os convidados excluídos do Firestore');
            } else {
                console.log('Nenhum documento encontrado para excluir');
            }
        } catch (error) {
            console.error('Erro ao limpar Firestore:', error);
            throw error; // Re-lançar o erro para ser tratado acima
        }
    } else {
        console.log('Firebase não configurado, limpando apenas localStorage');
    }
    
    // Limpar localStorage também
    guestsList = [];
    saveToLocalStorage();
    console.log('Lista local limpa');
    
    alert('Lista de convidados limpa com sucesso!');
}

// Função para carregar limite de acompanhantes
async function loadCompanionLimit() {
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            const configRef = doc(collection(window.firebaseDb, 'config'), 'companionLimit');
            const configDoc = await getDoc(configRef);
            
            if (configDoc.exists()) {
                const limit = configDoc.data().limit || 5;
                if (companionLimitInput) {
                    companionLimitInput.value = limit;
                }
                console.log('Limite de acompanhantes carregado:', limit);
                return limit;
            }
        } catch (error) {
            console.error('Erro ao carregar limite de acompanhantes:', error);
        }
    }
    
    // Fallback para localStorage
    const storedLimit = localStorage.getItem('companionLimit');
    if (storedLimit) {
        const limit = parseInt(storedLimit);
        if (companionLimitInput) {
            companionLimitInput.value = limit;
        }
        console.log('Limite de acompanhantes carregado do localStorage:', limit);
        return limit;
    }
    
    // Valor padrão
    if (companionLimitInput) {
        companionLimitInput.value = 5;
    }
    return 5;
}

// Função para salvar limite de acompanhantes
async function saveCompanionLimit(limit) {
    const limitValue = parseInt(limit);
    if (isNaN(limitValue) || limitValue < 0) {
        return { success: false, message: 'Por favor, digite um número válido maior ou igual a zero!' };
    }
    
    // Sempre salvar no localStorage primeiro (funciona sempre)
    localStorage.setItem('companionLimit', limitValue.toString());
    
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            const configRef = doc(collection(window.firebaseDb, 'config'), 'companionLimit');
            await setDoc(configRef, { limit: limitValue }, { merge: true });
            console.log('Limite de acompanhantes salvo no Firestore:', limitValue);
            return { success: true, message: `✅ Limite de acompanhantes atualizado para ${limitValue} com sucesso!` };
        } catch (error) {
            console.error('Erro ao salvar limite no Firestore:', error);
            // Se for erro de permissão, informar mas continuar (já salvou no localStorage)
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                return { 
                    success: true, 
                    message: `✅ Limite salvo localmente: ${limitValue}\n⚠️ Nota: Para salvar no Firebase, é necessário configurar as regras do Firestore para permitir escrita na coleção 'config'.` 
                };
            }
            return { success: true, message: `✅ Limite salvo localmente: ${limitValue} (Firebase indisponível)` };
        }
    } else {
        return { success: true, message: `✅ Limite salvo localmente: ${limitValue}` };
    }
}

// Função para carregar configurações de campos
async function loadFieldsConfig() {
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            const configRef = doc(collection(window.firebaseDb, 'config'), 'fieldsConfig');
            const configDoc = await getDoc(configRef);
            
            if (configDoc.exists()) {
                const config = configDoc.data();
                // Se não existir a propriedade, usar padrão true
                const emailValue = config.enableEmail !== undefined ? config.enableEmail !== false : true;
                const phoneValue = config.enablePhone !== undefined ? config.enablePhone !== false : true;
                const birthDateValue = config.enableBirthDate !== undefined ? config.enableBirthDate !== false : true;
                
                if (enableEmailField) {
                    enableEmailField.checked = emailValue;
                }
                if (enablePhoneField) {
                    enablePhoneField.checked = phoneValue;
                }
                if (enableBirthDateField) {
                    enableBirthDateField.checked = birthDateValue;
                }
                console.log('Configurações de campos carregadas:', config);
                return { enableEmail: emailValue, enablePhone: phoneValue, enableBirthDate: birthDateValue };
            }
        } catch (error) {
            console.error('Erro ao carregar configurações de campos:', error);
        }
    }
    
    // Fallback para localStorage
    const storedEmail = localStorage.getItem('enableEmailField');
    const storedPhone = localStorage.getItem('enablePhoneField');
    const storedBirthDate = localStorage.getItem('enableBirthDateField');
    
    // Se não houver valor salvo, usar padrão true (marcado)
    const emailValue = storedEmail === null ? true : storedEmail !== 'false';
    const phoneValue = storedPhone === null ? true : storedPhone !== 'false';
    const birthDateValue = storedBirthDate === null ? true : storedBirthDate !== 'false';
    
    if (enableEmailField) {
        enableEmailField.checked = emailValue;
    }
    if (enablePhoneField) {
        enablePhoneField.checked = phoneValue;
    }
    if (enableBirthDateField) {
        enableBirthDateField.checked = birthDateValue;
    }
    
    return {
        enableEmail: emailValue,
        enablePhone: phoneValue,
        enableBirthDate: birthDateValue
    };
}

// Função para salvar configurações de campos
async function saveFieldsConfig() {
    const emailEnabled = enableEmailField ? enableEmailField.checked : true;
    const phoneEnabled = enablePhoneField ? enablePhoneField.checked : true;
    const birthDateEnabled = enableBirthDateField ? enableBirthDateField.checked : true;
    
    const config = {
        enableEmail: emailEnabled,
        enablePhone: phoneEnabled,
        enableBirthDate: birthDateEnabled
    };
    
    // Sempre salvar no localStorage primeiro (funciona sempre)
    localStorage.setItem('enableEmailField', emailEnabled.toString());
    localStorage.setItem('enablePhoneField', phoneEnabled.toString());
    localStorage.setItem('enableBirthDateField', birthDateEnabled.toString());
    
    if (isFirebaseConfigured()) {
        try {
            const { collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            const configRef = doc(collection(window.firebaseDb, 'config'), 'fieldsConfig');
            await setDoc(configRef, config, { merge: true });
            console.log('Configurações de campos salvas no Firestore:', config);
            return { success: true, message: '✅ Configurações de campos salvas com sucesso!' };
        } catch (error) {
            console.error('Erro ao salvar configurações no Firestore:', error);
            // Se for erro de permissão, informar mas continuar (já salvou no localStorage)
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                return { 
                    success: true, 
                    message: `✅ Configurações salvas localmente!\n⚠️ Nota: Para salvar no Firebase, é necessário configurar as regras do Firestore para permitir escrita na coleção 'config'.` 
                };
            }
            return { success: true, message: '✅ Configurações salvas localmente (Firebase indisponível)' };
        }
    } else {
        return { success: true, message: '✅ Configurações salvas localmente!' };
    }
}

// Função para exibir mensagem de configuração
function showConfigMessage(messageElementId, message, isSuccess = true) {
    const messageElement = document.getElementById(messageElementId);
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.className = 'config-message ' + (isSuccess ? 'config-message-success' : 'config-message-error');
    messageElement.style.display = 'block';
    
    // Scroll suave para a mensagem
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Remover mensagem após 5 segundos
    setTimeout(() => {
        if (messageElement) {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }
    }, 5000);
}

// Event listener para salvar limite
if (saveCompanionLimitBtn) {
    saveCompanionLimitBtn.addEventListener('click', async function() {
        if (!companionLimitInput) {
            showConfigMessage('companionLimitMessage', '❌ Erro: Campo de limite não encontrado!', false);
            return;
        }
        
        // Desabilitar botão durante o salvamento
        saveCompanionLimitBtn.disabled = true;
        saveCompanionLimitBtn.textContent = '💾 Salvando...';
        
        const limit = companionLimitInput.value;
        const result = await saveCompanionLimit(limit);
        
        // Reabilitar botão
        saveCompanionLimitBtn.disabled = false;
        saveCompanionLimitBtn.textContent = '💾 Salvar';
        
        showConfigMessage('companionLimitMessage', result.message, result.success);
    });
}

// Event listener para salvar configurações de campos
if (saveFieldsConfigBtn) {
    saveFieldsConfigBtn.addEventListener('click', async function() {
        // Desabilitar botão durante o salvamento
        saveFieldsConfigBtn.disabled = true;
        saveFieldsConfigBtn.textContent = '💾 Salvando...';
        
        const result = await saveFieldsConfig();
        
        // Reabilitar botão
        saveFieldsConfigBtn.disabled = false;
        saveFieldsConfigBtn.textContent = '💾 Salvar Configurações';
        
        if (result.success) {
            showConfigMessage('fieldsConfigMessage', result.message, true);
        } else {
            showConfigMessage('fieldsConfigMessage', '❌ Erro ao salvar configurações. Tente novamente.', false);
        }
    });
}

// Função para baixar PDF da lista de presentes (disponível globalmente)
window.downloadGiftListPDF = async function downloadGiftListPDF() {
    try {
        // Carregar a biblioteca html2pdf se ainda não estiver carregada
        if (typeof html2pdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(() => reject(new Error('Timeout ao carregar html2pdf')), 10000);
            });
        }

        // Carregar o template da lista de presentes
        const response = await fetch('gift-list-template.html');
        if (!response.ok) {
            throw new Error('Não foi possível carregar gift-list-template.html. Verifique se o arquivo existe.');
        }
        const htmlContent = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.style.height = 'auto';
        tempContainer.style.minHeight = '1131px';
        tempContainer.style.overflow = 'visible';
        tempContainer.style.backgroundColor = '#ffffff';
        document.body.appendChild(tempContainer);
        
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
            const styleEl = document.createElement('style');
            styleEl.textContent = style.textContent;
            tempContainer.appendChild(styleEl);
        });
        
        const fontLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        fontLinks.forEach(link => {
            const linkEl = document.createElement('link');
            linkEl.rel = 'stylesheet';
            linkEl.href = link.href;
            document.head.appendChild(linkEl);
        });
        
        const templateElement = doc.getElementById('giftList');
        if (!templateElement) {
            document.body.removeChild(tempContainer);
            throw new Error('Elemento da lista de presentes não encontrado no template');
        }
        
        const clonedElement = templateElement.cloneNode(true);
        tempContainer.appendChild(clonedElement);
        
        await new Promise((resolve) => {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    setTimeout(resolve, 1500);
                });
            } else {
                setTimeout(resolve, 2500);
            }
        });
        
        if (!clonedElement.offsetHeight || !clonedElement.offsetWidth) {
            document.body.removeChild(tempContainer);
            throw new Error('Elemento não está renderizado corretamente');
        }
        
        clonedElement.offsetHeight;
        
        const opt = {
            filename: '💕 Lista de Presentes - Erli e Francisco.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 0.95,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: false,
                letterRendering: true
            },
            jsPDF: {
                unit: 'px',
                format: [800, 1131],
                orientation: 'portrait',
                compress: true,
                precision: 16
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy']
            },
            margin: [0, 0, 0, 0]
        };
        
        const worker = html2pdf()
            .set(opt)
            .from(clonedElement);
        
        await worker.toPdf().get('pdf').then((pdf) => {
            // Não remover páginas - manter todas as páginas geradas
            console.log('Total de páginas geradas:', pdf.internal.getNumberOfPages());
        }).save();
        
        setTimeout(() => {
            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            fontLinks.forEach(() => {
                const lastLink = document.head.querySelector('link[rel="stylesheet"]:last-of-type');
                if (lastLink && lastLink.href.includes('fonts.googleapis.com')) {
                    document.head.removeChild(lastLink);
                }
            });
        }, 1000);
        
        console.log('PDF da lista de presentes gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar PDF da lista de presentes:', error);
        alert('❌ Erro ao gerar PDF: ' + error.message);
    }
}

// Função para baixar PDF do convite
async function downloadInvitationPDF() {
    try {
        // Carregar a biblioteca html2pdf se ainda não estiver carregada
        if (typeof html2pdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            document.head.appendChild(script);
            
            // Aguardar o script carregar
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(() => reject(new Error('Timeout ao carregar html2pdf')), 10000);
            });
        }

        // Carregar o template do PDF
        const response = await fetch('pdf-template.html');
        if (!response.ok) {
            throw new Error('Não foi possível carregar pdf-template.html. Verifique se o arquivo existe.');
        }
        const htmlContent = await response.text();
        
        // Criar um parser para extrair o conteúdo do template
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Criar um container temporário oculto no DOM
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.style.height = '1131px';
        tempContainer.style.overflow = 'hidden';
        tempContainer.style.backgroundColor = '#ffffff';
        document.body.appendChild(tempContainer);
        
        // Copiar os estilos do template
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
            const styleEl = document.createElement('style');
            styleEl.textContent = style.textContent;
            tempContainer.appendChild(styleEl);
        });
        
        // Copiar os links de fontes
        const fontLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        fontLinks.forEach(link => {
            const linkEl = document.createElement('link');
            linkEl.rel = 'stylesheet';
            linkEl.href = link.href;
            document.head.appendChild(linkEl);
        });
        
        // Copiar o elemento do convite
        const templateElement = doc.getElementById('convite');
        if (!templateElement) {
            document.body.removeChild(tempContainer);
            throw new Error('Elemento do convite não encontrado no template');
        }
        
        // Clonar o elemento e adicionar ao container
        const clonedElement = templateElement.cloneNode(true);
        tempContainer.appendChild(clonedElement);
        
        // Aguardar as fontes carregarem e o elemento renderizar
        await new Promise((resolve) => {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    setTimeout(resolve, 1500);
                });
            } else {
                setTimeout(resolve, 2500);
            }
        });
        
        // Verificar se o elemento está visível
        if (!clonedElement.offsetHeight || !clonedElement.offsetWidth) {
            document.body.removeChild(tempContainer);
            throw new Error('Elemento não está renderizado corretamente');
        }
        
        // Forçar reflow para garantir renderização
        clonedElement.offsetHeight;
        
        // Log para debug
        console.log('Elemento clonado:', {
            width: clonedElement.offsetWidth,
            height: clonedElement.offsetHeight,
            hasContent: clonedElement.innerHTML.length > 0
        });
        
        // Configurações do PDF
        const opt = {
            filename: 'Convite_Erli_e_Francisco.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 0.95,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: false,
                letterRendering: true
            },
            jsPDF: {
                unit: 'px',
                format: [800, 1131],
                orientation: 'portrait',
                compress: true,
                precision: 16
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy']
            },
            margin: [0, 0, 0, 0]
        };
        
        // Gerar o PDF e manipular para remover página em branco
        const worker = html2pdf()
            .set(opt)
            .from(clonedElement);
        
        // Usar toPdf para ter controle sobre o PDF gerado
        await worker.toPdf().get('pdf').then((pdf) => {
            // Verificar e remover primeira página se estiver em branco
            const totalPages = pdf.internal.getNumberOfPages();
            if (totalPages > 1) {
                // Remover a primeira página (que está em branco)
                pdf.deletePage(1);
            }
        }).save();
        
        // Remover o container temporário e links de fontes após um pequeno delay
        setTimeout(() => {
            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            fontLinks.forEach(() => {
                const lastLink = document.head.querySelector('link[rel="stylesheet"]:last-of-type');
                if (lastLink && lastLink.href.includes('fonts.googleapis.com')) {
                    document.head.removeChild(lastLink);
                }
            });
        }, 1000);
        
        console.log('PDF gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('❌ Erro ao gerar PDF: ' + error.message);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Área administrativa carregada!');
    
    // Carregar limite de acompanhantes
    await loadCompanionLimit();
    
    // Carregar configurações de campos
    await loadFieldsConfig();
    
    // Carregar convidados do Firestore ou localStorage
    await loadGuestsFromFirestore();
    console.log('Convidados registrados:', guestsList.length);
    
    // Event listener para botão de download do PDF
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async function() {
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.textContent = '⏳ Gerando PDF...';
            
            await downloadInvitationPDF();
            
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.textContent = '📥 Baixar PDF do Convite';
        });
    }
    
    if (!isFirebaseConfigured()) {
        console.warn('Firebase não configurado. Usando localStorage como fallback.');
    } else {
        // Verificar estado de autenticação
        await checkAuthState();
    }
});
