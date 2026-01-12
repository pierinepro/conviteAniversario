# 💍 Sistema de Convites de Casamento

Sistema web completo para gerenciamento de convites de casamento, permitindo que os convidados confirmem presença online e que os administradores gerenciem a lista de convidados de forma segura.

## 📋 Sobre o Projeto

Este projeto foi desenvolvido para facilitar o gerenciamento de convites de casamento, oferecendo:

- **Página de convite elegante** com informações do evento
- **Formulário de confirmação de presença** (RSVP) online
- **Painel administrativo** para gerenciar convidados
- **Armazenamento seguro** usando Firebase Firestore
- **Exportação de dados** em formato Excel (.xlsx)

## ✨ Funcionalidades

### Para Convidados
- Visualização da página de convite com informações do evento
- Confirmação de presença com três opções:
  - ✅ Vou comparecer
  - ❓ Em dúvida
  - ❌ Não vou comparecer
- Cadastro de acompanhantes
- Mensagens personalizadas para cada resposta
- Formatação automática de e-mail e telefone

### Para Administradores
- **Autenticação segura** com login e senha
- **Dashboard com estatísticas**:
  - Total de pessoas confirmadas
  - Total de pessoas em dúvida
  - Total de pessoas que não comparecerão
- **Busca de convidados** por nome, e-mail ou telefone
- **Edição de dados** dos convidados e acompanhantes
- **Exclusão individual** de convidados ou acompanhantes
- **Limpeza completa** da lista (com validação de senha)
- **Exportação para Excel** (.xlsx) com todos os dados

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura das páginas
- **CSS3** - Estilização responsiva e moderna
- **JavaScript (ES6+)** - Lógica e interatividade
- **Firebase**:
  - **Firestore** - Banco de dados NoSQL
  - **Authentication** - Autenticação de administradores
- **SheetJS (xlsx)** - Geração de arquivos Excel

## 📁 Estrutura do Projeto

```
convite/
├── index.html              # Página principal do convite
├── admin.html              # Painel administrativo
├── script.js               # Lógica da página principal
├── script-admin.js         # Lógica do painel admin
├── style.css               # Estilos compartilhados
├── config.js               # Configurações gerais
├── firebase-config.js.example  # Exemplo de configuração Firebase
├── FIREBASE_SETUP.md       # Guia de configuração do Firebase
└── README.md              # Este arquivo
```

## 🚀 Como Configurar

### 1. Pré-requisitos

- Conta no Firebase (gratuita)
- Editor de código
- Navegador moderno

### 2. Configuração do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o **Firestore Database** (modo de produção ou teste)
4. Ative o **Authentication** (método Email/Password)
5. Obtenha as credenciais do Firebase
6. Configure as credenciais no arquivo `index.html`

Para instruções detalhadas, consulte o arquivo [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

### 3. Configuração de Credenciais

Edite o arquivo `index.html` e substitua as credenciais do Firebase:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

### 4. Configuração de Login Admin

Edite o arquivo `script-admin.js` e configure as credenciais de administrador:

```javascript
const ADMIN_EMAIL = 'seu-email@exemplo.com';
const ADMIN_PASSWORD = 'sua-senha-segura';
```

**⚠️ Importante**: Crie o usuário admin no Firebase Authentication antes de usar o painel.

## 📖 Como Usar

### Para Convidados

1. Acesse a página `index.html`
2. Preencha o formulário com:
   - Nome completo
   - E-mail (obrigatório)
   - Telefone (opcional)
   - Status de presença
   - Nome dos acompanhantes (se houver)
3. Clique em "Confirmar"
4. Receba a mensagem de confirmação

### Para Administradores

1. Acesse a página `admin.html`
2. Faça login com e-mail e senha
3. Visualize as estatísticas no dashboard
4. Use as ferramentas disponíveis:
   - **Buscar**: Encontre convidados específicos
   - **Editar**: Modifique dados dos convidados
   - **Excluir**: Remova convidados individuais
   - **Exportar**: Baixe a lista completa em Excel
   - **Limpar Lista**: Remova todos os convidados (com validação)

## 🔒 Segurança

- Autenticação obrigatória para acesso ao painel admin
- Validação de senha para operações críticas (limpar lista)
- Dados armazenados de forma segura no Firebase
- Fallback para localStorage quando Firebase não estiver disponível

## 📊 Estrutura de Dados

Cada convidado é armazenado com a seguinte estrutura:

```javascript
{
  id: "ID_UNICO",
  name: "Nome do Convidado",
  email: "email@exemplo.com",
  phone: "(00) 00000-0000",
  attendance: "yes" | "maybe" | "no",
  companions: ["Acompanhante 1", "Acompanhante 2"],
  dateAdded: "Timestamp"
}
```

## 🎨 Personalização

### Alterar Informações do Evento

Edite o arquivo `index.html` para personalizar:
- Nomes dos noivos
- Data do casamento
- Local do evento
- Mensagem bíblica
- Código de vestimenta

### Alterar Estilos

Edite o arquivo `style.css` para personalizar:
- Cores
- Fontes
- Layout
- Animações

## 📝 Licença

Este projeto foi desenvolvido para uso pessoal/familiar.

## 👨‍💻 Desenvolvido com ❤️

Sistema desenvolvido especialmente para o casamento dos meus tios.

---

**Data do Evento**: 28/02/2026  
**Vestimenta**: Esporte Chique

> "Acima de tudo, porém, revistam-se do amor, que é o elo perfeito." - Colossenses 3:14
