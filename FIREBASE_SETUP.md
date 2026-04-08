# Firebase — Configuração do convite (Firestore + Auth)

Guia para o site estático (`index.html`, `admin.html`). Aqui só entra o **`firebaseConfig`** do app **Web**, na aba **Geral** das configurações do projeto.

---

## 1. Criar o projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/).
2. **Adicionar projeto** → nome (ex.: conviteGiovanna) → concluir o assistente (Analytics opcional).

Na aba **Geral** você vê **ID do projeto** e **Número do projeto**; o **`projectId`** do `firebaseConfig` é o mesmo **ID do projeto** (ex.: `convitegiovanna-ceef0`).

---

## 2. Firestore

1. Menu **Firestore Database** → **Criar banco de dados**.
2. ID do banco: deixe **`(default)`**.
3. Modo: para testar rápido pode usar **modo de teste**; depois publique as **regras** abaixo.
4. Edição **Standard**, região próxima (ex.: `southamerica-east1`).
5. **Regras** → cole, **Publicar**:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{document=**} {
      allow read, write: if true;
    }
    match /config/{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Coleção de convidados com outro nome:** se alterou `FIRESTORE_GUESTS_COLLECTION` em `script.js` e `script-admin.js`, inclua `match /SEU_NOME/{document=**}` com as mesmas permissões de `guests`, ou troque `guests` na regra.

**Regras um pouco mais seguras (opcional):** convidados públicos; `config` só escrita por usuário logado:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{document=**} {
      allow read, write: if true;
    }
    match /config/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Dados:** as coleções aparecem sozinhas no primeiro uso. Típico:

| Caminho | Uso |
|---------|-----|
| `guests` (ou nome no JS) | RSVP |
| `config/...` | painel admin (limite, lista, campos, botões do convite, etc.) |

---

## 3. Authentication (admin)

1. **Authentication** → **Começar**.
2. **Métodos de login** → ative **E-mail/senha** (não precisa “link por e-mail”).
3. Aba **Users** → **Adicionar usuário** (e-mail + senha) — são essas credenciais no login do **admin**.

Senhas ficam só no Firebase, não no código. Quem não estiver em **Users** não acessa o painel.

**Domínios:** **Authentication** → **Settings** → **Authorized domains** → inclua o site (ex.: `seudominio.netlify.app`). `localhost` costuma já estar para testes locais.

---

## 4. Credenciais Web (`firebaseConfig`)

1. Engrenagem ⚙️ → **Configurações do projeto** → aba **Geral**.
2. Role até **Seus aplicativos**.

**App Web novo:** ícone **`</>`** → registrar app (Hosting só se for usar) → copie o objeto **`firebaseConfig`**.

**App já existe:** clique no app Web → **Configuração do SDK** → copie o `firebaseConfig` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

---

## 5. Colar no código

O **mesmo** objeto nos dois arquivos:

- `index.html`
- `admin.html`

Dentro do `<script type="module">` no `<head>`, substitua o `const firebaseConfig = { ... }` pelo que copiou.

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "....firebaseapp.com",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
```

Se um HTML apontar para outro projeto que o outro, convite e admin ficam inconsistentes.

---

## 6. Testar e comportamento

- Abra o site e o **admin**; use F12 se algo falhar (rede, permissões, domínio não autorizado).
- **Firestore indisponível:** o convidado ainda pode usar **localStorage** como fallback; o **login do admin** depende do Auth + projeto certo.

**Limites do plano gratuito (ordem de grandeza):** armazenamento e cotas de leitura/escrita diárias — suficientes para um convite.

---

## 7. Opcional: mais um admin

**Authentication** → **Users** → **Adicionar usuário** com outro e-mail/senha.
