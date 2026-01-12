// Script para página administrativa
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
    const headers = ['Nome', 'E-mail', 'Telefone', 'Status', 'Tipo', 'Data de Cadastro'];
    
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

// Botão limpar lista
if (clearListBtn) {
    clearListBtn.addEventListener('click', function() {
        if (clearConfirmModal) {
            clearConfirmModal.style.display = 'flex';
        }
    });
}

// Confirmar limpeza
if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const passwordInput = document.getElementById('clearPassword');
        const passwordError = document.getElementById('clearPasswordError');
        
        if (!passwordInput || !passwordInput.value.trim()) {
            if (passwordError) {
                passwordError.style.display = 'block';
                passwordError.querySelector('p').textContent = 'Por favor, digite sua senha!';
            }
            return;
        }
        
        const password = passwordInput.value.trim();
        
        // Validar senha
        let isValidPassword = false;
        
        if (isFirebaseConfigured() && window.firebaseAuth) {
            try {
                // Verificar se o usuário está autenticado e a senha está correta
                const { signInWithEmailAndPassword, getAuth } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js');
                
                // Obter o e-mail do usuário atual autenticado
                const currentUser = window.firebaseAuth.currentUser;
                if (currentUser && currentUser.email) {
                    // Tentar fazer login novamente com a senha fornecida
                    // Se funcionar, a senha está correta
                    try {
                        await signInWithEmailAndPassword(window.firebaseAuth, currentUser.email, password);
                        isValidPassword = true;
                    } catch (error) {
                        isValidPassword = false;
                    }
                } else {
                    // Se não houver usuário autenticado, usar fallback
                    const ADMIN_CREDENTIALS = window.ADMIN_CONFIG || {
                        login: 'admin',
                        password: 'admin'
                    };
                    isValidPassword = (password === ADMIN_CREDENTIALS.password);
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
                passwordError.querySelector('p').textContent = 'Senha incorreta!';
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            return;
        }
        
        // Senha correta, proceder com a limpeza
        if (passwordError) {
            passwordError.style.display = 'none';
        }
        
        await clearAllGuests();
        
        // Limpar campo de senha
        if (passwordInput) {
            passwordInput.value = '';
        }
        
        if (clearConfirmModal) {
            clearConfirmModal.style.display = 'none';
        }
        await updateAdminStats();
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    });
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
    
    if (!searchTerm) {
        if (searchResults) {
            searchResults.innerHTML = '<p class="search-message">Digite um termo para buscar.</p>';
        }
        return;
    }
    
    const results = guestsList.filter(guest => {
        const nameMatch = guest.name && guest.name.toLowerCase().includes(searchTerm);
        const emailMatch = guest.email && guest.email.toLowerCase().includes(searchTerm);
        const phoneMatch = guest.phone && guest.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
        
        return nameMatch || emailMatch || phoneMatch;
    });
    
    displaySearchResults(results);
}

// Exibir resultados da busca
function displaySearchResults(results) {
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<p class="search-message">Nenhum convidado encontrado.</p>';
        return;
    }
    
    let html = '<div class="results-list">';
    
    results.forEach(guest => {
        const status = guest.attendance === 'yes' ? 'Confirmado' : 
                      guest.attendance === 'maybe' ? 'Em Dúvida' : 'Não Comparecerá';
        const statusIcon = guest.attendance === 'yes' ? '✅' : 
                          guest.attendance === 'maybe' ? '❓' : '❌';
        const date = new Date(guest.dateAdded).toLocaleDateString('pt-BR');
        const companionsCount = guest.companions && Array.isArray(guest.companions) ? guest.companions.length : 0;
        
        html += `
            <div class="result-item">
                <div class="result-info">
                    <h4>${guest.name || 'Sem nome'}</h4>
                    <p><strong>E-mail:</strong> ${guest.email || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> ${guest.phone || 'Não informado'}</p>
                    <p><strong>Status:</strong> ${statusIcon} ${status}</p>
                    <p><strong>Data:</strong> ${date}</p>
                    ${companionsCount > 0 ? `<p><strong>Acompanhantes:</strong> ${companionsCount} pessoa(s)</p>` : ''}
                </div>
                <div class="result-actions">
                    <button class="btn-edit" onclick="editGuest('${guest.id || guest.name}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="deleteGuest('${guest.id || guest.name}')">🗑️ Excluir</button>
                </div>
            </div>
        `;
        
        // Se houver acompanhantes, mostrar cada um separadamente
        if (guest.companions && Array.isArray(guest.companions) && guest.companions.length > 0) {
            guest.companions.forEach((companion, index) => {
                html += `
                    <div class="result-item result-companion">
                        <div class="result-info">
                            <h4>${companion} <span class="companion-badge">Acompanhante</span></h4>
                            <p><strong>E-mail:</strong> ${guest.email || 'Não informado'}</p>
                            <p><strong>Telefone:</strong> ${guest.phone || 'Não informado'}</p>
                            <p><strong>Status:</strong> ${statusIcon} ${status}</p>
                            <p><strong>Data:</strong> ${date}</p>
                        </div>
                        <div class="result-actions">
                            <button class="btn-delete" onclick="deleteCompanion('${guest.id || guest.name}', ${index})">🗑️ Excluir Acompanhante</button>
                        </div>
                    </div>
                `;
            });
        }
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

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
            message.textContent = `Tem certeza que deseja excluir "${guestToDelete.name}"? Esta ação não pode ser desfeita!`;
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
    if (isFirebaseConfigured()) {
        try {
            const { collection, getDocs, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js');
            
            const guestsRef = collection(window.firebaseDb, 'guests');
            const querySnapshot = await getDocs(guestsRef);
            
            // Excluir todos os documentos
            const deletePromises = [];
            querySnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(doc(guestsRef, docSnapshot.id)));
            });
            
            await Promise.all(deletePromises);
            console.log('Todos os convidados excluídos do Firestore');
        } catch (error) {
            console.error('Erro ao limpar Firestore:', error);
        }
    }
    
    // Limpar localStorage também
    guestsList = [];
    saveToLocalStorage();
    
    alert('Lista de convidados limpa com sucesso!');
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Área administrativa carregada!');
    
    // Carregar convidados do Firestore ou localStorage
    await loadGuestsFromFirestore();
    console.log('Convidados registrados:', guestsList.length);
    
    if (!isFirebaseConfigured()) {
        console.warn('Firebase não configurado. Usando localStorage como fallback.');
    } else {
        // Verificar estado de autenticação
        await checkAuthState();
    }
});
