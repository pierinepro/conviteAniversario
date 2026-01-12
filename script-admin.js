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
    if (isFirebaseConfigured()) {
        try {
            const { collection, addDoc, setDoc, doc, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            // Verificar se o convidado já existe (por nome)
            const guestsRef = collection(window.firebaseDb, 'guests');
            const q = query(guestsRef, where('name', '==', guest.name));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Atualizar documento existente
                const docRef = querySnapshot.docs[0];
                await setDoc(doc(guestsRef, docRef.id), guest, { merge: true });
            } else {
                // Adicionar novo documento
                await addDoc(guestsRef, guest);
            }
            
            // Também salvar no localStorage como backup
            saveToLocalStorage();
            return true;
        } catch (error) {
            console.error('Erro ao salvar no Firestore:', error);
            // Fallback para localStorage
            saveToLocalStorage();
            return false;
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

// Função para exportar para Excel
async function exportToExcel() {
    const stats = await exportGuestsList();
    const guests = stats.all;
    
    // Criar cabeçalhos
    const headers = ['Nome', 'E-mail', 'Telefone', 'Status', 'Tipo', 'Convidado Principal', 'Data de Cadastro'];
    
    // Criar linhas de dados - uma linha para cada pessoa (convidado + acompanhantes)
    const rows = [];
    
    guests.forEach(guest => {
        const status = guest.attendance === 'yes' ? 'Confirmado' : 
                      guest.attendance === 'maybe' ? 'Em Dúvida' : 'Não Comparecerá';
        const date = new Date(guest.dateAdded).toLocaleDateString('pt-BR');
        
        // Linha do convidado principal
        rows.push([
            guest.name || '',
            guest.email || '',
            guest.phone || '',
            status,
            'Convidado',
            '-', // Convidado principal não tem convidado principal
            date
        ]);
        
        // Linhas dos acompanhantes (se houver)
        if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach(companion => {
                rows.push([
                    companion || '',
                    guest.email || '', // Mesmo e-mail do convidado principal
                    guest.phone || '', // Mesmo telefone do convidado principal
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
        { wch: 15 }, // Status
        { wch: 12 }, // Tipo
        { wch: 25 }, // Convidado Principal
        { wch: 15 }  // Data
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
                    await updateAdminStats();
                }
            } catch (error) {
                // Login falhou
                console.error('Erro de autenticação:', error);
                if (adminError) {
                    adminError.style.display = 'block';
                    let errorMessage = 'Login ou senha incorretos!';
                    
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Usuário não encontrado!';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Senha incorreta!';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'E-mail inválido!';
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

// Verificar se já está autenticado ao carregar a página
async function checkAuthState() {
    if (isFirebaseConfigured() && window.firebaseAuth) {
        try {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
            
            onAuthStateChanged(window.firebaseAuth, async (user) => {
                if (user) {
                    // Usuário está autenticado
                    console.log('Usuário autenticado:', user.email);
                    if (adminLoginModal) adminLoginModal.style.display = 'none';
                    if (adminArea) {
                        adminArea.style.display = 'block';
                        await updateAdminStats();
                    }
                } else {
                    // Usuário não está autenticado
                    if (adminArea) adminArea.style.display = 'none';
                    if (adminLoginModal) adminLoginModal.style.display = 'flex';
                }
            });
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
        }
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

// Buscar convidados
if (searchBtn) {
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
}

if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Função de busca
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Resetar para primeira página ao fazer nova busca
    currentPage = 1;
    
    let results;
    
    if (!searchTerm) {
        // Se estiver vazio, mostrar todos os convidados
        results = [...guestsList];
    } else {
        // Filtrar por termo de busca
        results = guestsList.filter(guest => {
            const nameMatch = guest.name && guest.name.toLowerCase().includes(searchTerm);
            const emailMatch = guest.email && guest.email.toLowerCase().includes(searchTerm);
            const phoneMatch = guest.phone && guest.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
            
            return nameMatch || emailMatch || phoneMatch;
        });
    }
    
    displaySearchResults(results);
}

// Exibir resultados da busca com paginação
function displaySearchResults(results) {
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<p class="search-message">Nenhum convidado encontrado.</p>';
        return;
    }
    
    // Calcular paginação
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    // Expandir resultados para incluir acompanhantes
    const expandedResults = [];
    paginatedResults.forEach(guest => {
        // Adicionar o convidado principal
        expandedResults.push({ ...guest, isCompanion: false, companionIndex: null });
        
        // Adicionar cada acompanhante como item separado
        if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach((companion, index) => {
                expandedResults.push({
                    ...guest,
                    name: companion,
                    mainGuestName: guest.name, // Guardar nome do convidado principal
                    mainGuestId: guest.id || guest.name, // Guardar ID do convidado principal para exclusão
                    isCompanion: true,
                    companionIndex: index
                });
            });
        }
    });
    
    let html = '<div class="results-list">';
    
    // Mostrar informações de paginação
    html += `<div class="pagination-info">
        <p>Mostrando ${startIndex + 1} - ${Math.min(endIndex, results.length)} de ${results.length} resultado(s)</p>
    </div>`;
    
    expandedResults.forEach(item => {
        const status = item.attendance === 'yes' ? 'Confirmado' : 
                      item.attendance === 'maybe' ? 'Em Dúvida' : 'Não Comparecerá';
        const statusIcon = item.attendance === 'yes' ? '✅' : 
                          item.attendance === 'maybe' ? '❓' : '❌';
        const date = new Date(item.dateAdded).toLocaleDateString('pt-BR');
        
        if (item.isCompanion) {
            // Item é um acompanhante
            const mainGuestName = item.mainGuestName || 'Convidado Principal';
            html += `
                <div class="result-item result-companion">
                    <div class="result-info">
                        <h4>${item.name} <span class="companion-badge">Acompanhante</span></h4>
                        <p class="companion-main-guest"><strong>Convidado Principal:</strong> ${mainGuestName}</p>
                        <p><strong>E-mail:</strong> ${item.email || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${item.phone || 'Não informado'}</p>
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
                        <p><strong>E-mail:</strong> ${item.email || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${item.phone || 'Não informado'}</p>
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
    
    // Adicionar controles de paginação
    if (totalPages > 1) {
        html += generatePaginationControls(totalPages, currentPage);
    }
    
    searchResults.innerHTML = html;
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
    currentPage = page;
    performSearch();
    // Scroll para o topo dos resultados
    if (searchResults) {
        searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    guestToEdit = guest;
    
    // Preencher formulário de edição
    const nameInput = document.getElementById('editName');
    const emailInput = document.getElementById('editEmail');
    const phoneInput = document.getElementById('editPhone');
    
    if (nameInput) nameInput.value = guest.name || '';
    if (emailInput) emailInput.value = guest.email || '';
    if (phoneInput) phoneInput.value = guest.phone || '';
    
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
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'companion-edit-input';
    input.value = value;
    input.placeholder = 'Nome do acompanhante';
    if (index !== null) {
        input.setAttribute('data-index', index);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-companion';
    removeBtn.textContent = '×';
    removeBtn.onclick = function() {
        companionDiv.remove();
    };
    
    companionDiv.appendChild(input);
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
                    messageHTML += `&nbsp;&nbsp;• ${companion}<br>`;
                });
            }
            
            messageHTML += '<br><strong>Esta ação não pode ser desfeita!</strong>';
            message.innerHTML = messageHTML;
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
    
    const companionName = guest.companions[companionIndex];
    
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
        alert('Acompanhante excluído com sucesso!');
    }
};

// Confirmar exclusão
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function() {
        if (guestToDelete) {
            await deleteGuestFromFirestore(guestToDelete);
            guestToDelete = null;
            if (deleteConfirmModal) {
                deleteConfirmModal.style.display = 'none';
            }
            await updateAdminStats();
            performSearch(); // Atualizar resultados da busca
        }
    });
}

// Cancelar exclusão
if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', function() {
        guestToDelete = null;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
    });
}

if (closeDeleteModal) {
    closeDeleteModal.addEventListener('click', function() {
        guestToDelete = null;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
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

// Salvar edição
if (editForm) {
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!guestToEdit) {
            alert('Erro: Convidado não encontrado para edição!');
            return;
        }
        
        console.log('Salvando edição do convidado:', guestToEdit);
        
        // Coletar dados do formulário
        const nameInput = document.getElementById('editName');
        const emailInput = document.getElementById('editEmail');
        const phoneInput = document.getElementById('editPhone');
        const attendanceRadio = document.querySelector('input[name="editAttendance"]:checked');
        
        if (!nameInput || !emailInput || !attendanceRadio) {
            alert('Erro: Campos obrigatórios não encontrados!');
            return;
        }
        
        const updatedGuest = {
            ...guestToEdit,
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim() || null,
            attendance: attendanceRadio.value
        };
        
        // Coletar acompanhantes
        if (editCompanionsList) {
            const companionInputs = editCompanionsList.querySelectorAll('.companion-edit-input');
            updatedGuest.companions = [];
            companionInputs.forEach(input => {
                const name = input.value.trim();
                if (name) {
                    updatedGuest.companions.push(name);
                }
            });
        } else {
            updatedGuest.companions = guestToEdit.companions || [];
        }
        
        console.log('Dados atualizados:', updatedGuest);
        
        // Salvar no Firestore
        try {
            await saveGuestToFirestore(updatedGuest);
            console.log('Convidado salvo no Firestore');
        } catch (error) {
            console.error('Erro ao salvar no Firestore:', error);
            alert('Erro ao salvar alterações. Tente novamente.');
            return;
        }
        
        // Atualizar lista local
        const index = guestsList.findIndex(g => {
            if (g.id && guestToEdit.id && g.id === guestToEdit.id) return true;
            if (g.name && guestToEdit.name && g.name === guestToEdit.name) return true;
            return false;
        });
        
        if (index !== -1) {
            guestsList[index] = updatedGuest;
            console.log('Lista local atualizada');
        } else {
            // Se não encontrou, adicionar
            guestsList.push(updatedGuest);
            console.log('Convidado adicionado à lista local');
        }
        
        // Fechar modal e atualizar
        guestToEdit = null;
        if (editModal) {
            editModal.style.display = 'none';
        }
        
        await updateAdminStats();
        performSearch(); // Atualizar resultados da busca
        
        alert('Convidado atualizado com sucesso!');
    });
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
                if (enableEmailField) {
                    enableEmailField.checked = config.enableEmail !== false; // Padrão: true
                }
                if (enablePhoneField) {
                    enablePhoneField.checked = config.enablePhone !== false; // Padrão: true
                }
                console.log('Configurações de campos carregadas:', config);
                return config;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações de campos:', error);
        }
    }
    
    // Fallback para localStorage
    const storedEmail = localStorage.getItem('enableEmailField');
    const storedPhone = localStorage.getItem('enablePhoneField');
    
    if (enableEmailField) {
        enableEmailField.checked = storedEmail !== 'false'; // Padrão: true
    }
    if (enablePhoneField) {
        enablePhoneField.checked = storedPhone !== 'false'; // Padrão: true
    }
    
    return {
        enableEmail: storedEmail !== 'false',
        enablePhone: storedPhone !== 'false'
    };
}

// Função para salvar configurações de campos
async function saveFieldsConfig() {
    const emailEnabled = enableEmailField ? enableEmailField.checked : true;
    const phoneEnabled = enablePhoneField ? enablePhoneField.checked : true;
    
    const config = {
        enableEmail: emailEnabled,
        enablePhone: phoneEnabled
    };
    
    // Sempre salvar no localStorage primeiro (funciona sempre)
    localStorage.setItem('enableEmailField', emailEnabled.toString());
    localStorage.setItem('enablePhoneField', phoneEnabled.toString());
    
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
