# Configuração do Firebase - Passo a Passo

## 1. Criar Conta no Firebase

1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto" ou "Create a project"
3. Digite um nome para o projeto (ex: "convite-casamento")
4. Clique em "Continuar"
5. Desative o Google Analytics (não é necessário) ou deixe ativado se quiser
6. Clique em "Criar projeto"

## 2. Criar o Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. **ID do banco de dados**: 
   - Você pode deixar o padrão `(default)` ou escolher um nome simples como `convite-db`
   - O ID é apenas um identificador interno, não afeta o funcionamento
   - Recomendação: deixe `(default)` para simplificar
4. Escolha "Começar no modo de teste" (para desenvolvimento)
5. **Escolha "Edição Standard"** (a opção gratuita com indexação automática)
   - Esta é a opção correta para convites de casamento
   - Mecanismo de consulta simples com indexação automática
   - Documentos de até 1 MiB (mais que suficiente)
6. Escolha a localização (escolha a mais próxima do Brasil, ex: us-central ou southamerica-east1)
7. Clique em "Ativar"

## 3. Ativar Firebase Authentication (IMPORTANTE - Para Segurança do Admin)

1. No menu lateral, clique em "Authentication"
2. Clique em "Get started" ou "Começar"
3. Na aba "Sign-in method" ou "Métodos de login", você verá uma lista de métodos de autenticação
4. Encontre a opção **"E-mail/senha"** (Email/Password)
5. Clique no toggle **"Ativar"** ao lado de "E-mail/senha"
   - O toggle ficará azul/ativado quando estiver ligado
6. **NÃO precisa ativar** "Link do e-mail (login sem senha)" - deixe desativado
7. Clique no botão **"Salvar"** no canto inferior direito
8. Aguarde a confirmação de que foi salvo com sucesso

### Criar Usuário Admin:

1. Ainda em "Authentication", vá na aba "Users"
2. Clique em "Add user" ou "Adicionar usuário"
3. Digite o e-mail do admin:
   - **Precisa ter formato válido**: exemplo@dominio.com
   - **Recomendado**: Use um e-mail real que você tenha acesso (caso precise recuperar senha)
   - **Pode ser**: Um e-mail que você criou especificamente para isso
   - **Exemplos válidos**: admin@seuemail.com, convite@seudominio.com
4. Digite uma senha forte (mínimo 6 caracteres, mas recomendo pelo menos 8 caracteres com letras, números e símbolos)
5. Clique em "Add user" ou "Adicionar usuário"
6. **ANOTE ESTAS CREDENCIAIS** - você usará para fazer login no painel admin

**Nota sobre o e-mail:**
- O Firebase valida o formato do e-mail (deve ter @ e domínio)
- Não precisa verificar o e-mail para fazer login (pode desativar verificação de e-mail se quiser)
- Mas é recomendado usar um e-mail real caso precise recuperar a senha no futuro

## 4. Firebase Hosting (Opcional - Aparece junto com as Credenciais)

**Nota**: A opção de configurar o Firebase Hosting aparece junto com a tela de obter credenciais (passo 6). Você pode ignorá-la por enquanto.

- **Pule/ignore** a opção de Hosting quando aparecer
- Foque apenas em copiar as credenciais do Firebase
- O Hosting pode ser configurado depois, quando for publicar o site
- Não há custos financeiros e pode ser feito a qualquer momento

## 5. Configurar Regras de Segurança do Firestore

1. Vá em "Firestore Database" > "Regras" (Rules)
2. Substitua as regras por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para convidados (para confirmarem presença)
    match /guests/{document=**} {
      // Qualquer um pode ler e escrever (para convidados confirmarem presença)
      allow read, write: if true;
    }
    
    // Regras para configurações do painel admin
    match /config/{document=**} {
      // Todos podem ler (para carregar configurações)
      // Todos podem escrever (para salvar configurações do admin)
      allow read, write: if true;
    }
  }
}
```

3. Clique em "Publicar"

**Nota**: 
- As regras acima permitem que qualquer pessoa leia e escreva na coleção `guests` (necessário para os convidados confirmarem presença)
- As regras também permitem leitura e escrita na coleção `config` (necessário para salvar configurações do painel admin, como limite de acompanhantes e campos habilitados)
- O acesso ao painel admin é controlado pelo Firebase Authentication, não pelas regras do Firestore
- **Importante**: Se você receber erro "Missing or insufficient permissions" ao salvar configurações, verifique se adicionou a regra para a coleção `config` acima

### Regras Mais Seguras (Opcional)

Se você quiser mais segurança, pode restringir a escrita na coleção `config` apenas para usuários autenticados:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{document=**} {
      allow read, write: if true;
    }
    
    match /config/{document=**} {
      allow read: if true;  // Todos podem ler
      allow write: if request.auth != null;  // Apenas usuários autenticados podem escrever
    }
  }
}
```

**Nota sobre localStorage**: Mesmo sem permissão no Firestore para a coleção `config`, as configurações funcionarão perfeitamente usando localStorage. As regras do Firestore são necessárias apenas se você quiser sincronizar as configurações entre diferentes dispositivos ou navegadores.

## 6. Obter as Credenciais do Firebase

1. No menu lateral, clique no ícone de engrenagem ⚙️ ao lado de "Visão geral do projeto"
2. Clique em "Configurações do projeto"
3. Role até "Seus aplicativos"
4. Clique no ícone `</>` (Web)
5. Na tela "Adicionar o Firebase ao seu app da Web":
   - **Passo 1 - Registrar app:**
     - O campo "Apelido do app" já vem preenchido (ex: "Convite Web - Lica")
     - Você pode deixar como está ou alterar se quiser
     - **IMPORTANTE**: **NÃO marque** a checkbox "Configure também o Firebase Hosting para este app"
     - Deixe a checkbox **desmarcada** (não selecionada)
     - Clique no botão azul **"Registrar app"**
   - **Passo 2 - Adicionar o SDK do Firebase:**
     - Após clicar em "Registrar app", você verá as credenciais do Firebase
     - **COPIE AS CONFIGURAÇÕES** que aparecem (firebaseConfig)
     - Você verá um objeto JavaScript com `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
     - Copie todos esses valores
     - Você pode clicar em "Copiar" se houver um botão, ou copiar manualmente

## 7. Configurar no Código

1. Abra o arquivo `index.html`
2. Encontre a seção com `firebaseConfig` (por volta da linha 15)
3. Substitua os valores pelos que você copiou:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

## 6. Testar

1. Abra o site no navegador
2. Abra o Console do navegador (F12)
3. Se aparecer "Firebase não configurado", verifique se copiou as credenciais corretamente
4. Se aparecer "Convidados registrados: X", está funcionando!

## Importante

- Os dados serão salvos automaticamente no Firestore
- O localStorage continuará funcionando como backup
- Se o Firebase não estiver configurado, o sistema usa localStorage automaticamente
- Todos os dados ficam seguros na nuvem do Google

## Limites Gratuitos do Firebase

- 1 GB de armazenamento
- 50.000 leituras/dia
- 20.000 escritas/dia
- 20.000 exclusões/dia

Isso é mais que suficiente para um convite de casamento!

## 7. Sistema de Autenticação (SEGURO)

✅ **O sistema agora usa Firebase Authentication!** As credenciais NÃO ficam no código.

### Como funciona:

1. **Login Seguro**: O login é feito através do Firebase Authentication
2. **Credenciais no Firebase**: As credenciais são gerenciadas pelo Firebase, não pelo código
3. **Acesso Protegido**: Apenas usuários autenticados podem acessar o painel admin
4. **Sem Exposição**: As senhas nunca aparecem no código-fonte

### Fazer Login no Painel Admin:

1. Clique no link "admin" no canto superior direito
2. Digite o **e-mail** que você criou no Firebase Authentication
3. Digite a **senha** que você definiu
4. Clique em "Entrar"

### Adicionar Mais Admins (Opcional):

1. No Firebase Console, vá em "Authentication" > "Users"
2. Clique em "Add user"
3. Adicione o e-mail e senha do novo admin
4. Pronto! Ele poderá fazer login também

### Segurança:

✅ **Muito mais seguro** que o método anterior:
- Senhas são criptografadas pelo Firebase
- Autenticação gerenciada pelo Google
- Não há credenciais no código
- Sistema de logout automático
- Verificação de autenticação em tempo real

### Fallback (Se Firebase não estiver configurado):

Se o Firebase não estiver configurado, o sistema usa o arquivo `config.js` como fallback. Mas recomendo fortemente usar Firebase Authentication para máxima segurança!
