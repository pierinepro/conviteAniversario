# Convite de aniversário (site estático)

Site de convite infantil com **RSVP** online, **painel admin** (Firebase Authentication), dados no **Firestore** e exportação para **Excel**. Pensado para hospedagem simples (por exemplo **Netlify**), sem build.

## O que o projeto faz

**Convidados (`index.html`)**

- Página do evento (textos, data, local, traje, presentes conforme você configurar).
- Confirmação de presença: vou / em dúvida / não vou, acompanhantes e campos configuráveis.
- Cortina de abertura, animações e integração com Firestore (com fallback em `localStorage` se necessário).

**Admin (`admin.html`)**

- Login com **e-mail e senha** criados no Firebase (não há senha fixa no código).
- Estatísticas, busca, edição, exclusão, limpeza da lista com confirmação e exportação `.xlsx`.

## Tecnologias

- HTML, CSS, JavaScript (ES modules e imports dinâmicos do Firebase CDN).
- **Firebase**: Firestore, Authentication (e-mail/senha); Analytics opcional na página do convite.
- **SheetJS** no admin para Excel.

## Estrutura principal

```
conviteAniversario/
├── index.html                 # Convite público
├── admin.html                 # Painel administrativo
├── script.js                  # Lógica do convite
├── script-admin.js            # Lógica do admin
├── style.css
├── config.js                  # Legado / referência (login admin real é Firebase Auth)
├── firebase-config.js.example # Exemplo se quiser externalizar config (opcional)
├── pdf-template-birthday.html # Modelo usado na geração de PDF no admin
├── images/                    # Fotos e assets do convite
├── netlify.toml               # Publicação e headers no Netlify
├── FIREBASE_SETUP.md          # Passo a passo Firebase (regras, domínios, credenciais)
├── NETLIFY_DEPLOY.md          # Deploy (se usar Netlify)
└── README.md
```

## Configurar o Firebase

1. Siga o guia **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** (projeto, Firestore, regras, Authentication, usuário admin).
2. No Console, em **Configurações do projeto** → **Geral** → app **Web**, copie o objeto **`firebaseConfig`** (aba **Geral**, não “Contas de serviço”).
3. Cole o **mesmo** `firebaseConfig` em **`index.html`** e **`admin.html`**, no `<script type="module">` do `<head>` (os dois precisam apontar para o mesmo projeto).

Exemplo de formato (valores são os do seu app no Console):

```javascript
const firebaseConfig = {
  apiKey: '...',
  authDomain: '....firebaseapp.com',
  projectId: '...',
  storageBucket: '....firebasestorage.app',
  messagingSenderId: '...',
  appId: '...',
  measurementId: 'G-...' // opcional (Analytics)
};
```

4. Em **Authentication** → **Settings** → **Authorized domains**, inclua o domínio do site publicado (por exemplo `*.netlify.app`).

**Admin:** crie o usuário em **Authentication** → **Users**. Não é necessário (nem recomendável) colocar e-mail/senha do admin em `script-admin.js`.

## Rodar localmente

Abra `index.html` com um servidor estático simples (o Firebase e os módulos ES costumam exigir `http://`, não `file://`). Por exemplo:

```bash
npx serve .
```

Depois acesse a URL indicada no terminal e use `/admin.html` para o painel.

## Publicar

- **Netlify:** pasta do projeto como site estático; veja [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) e `netlify.toml`.
- Após o deploy, confira domínios autorizados no Firebase e as regras do Firestore.

## Dados no Firestore

- Coleção de convidados: padrão `guests` (alterável com `FIRESTORE_GUESTS_COLLECTION` em `script.js` e `script-admin.js` — alinhe as **regras** do Firestore se mudar o nome).
- Documentos em `config/` guardam opções do painel (limite de acompanhantes, lista fechada, campos do formulário, visibilidade dos botões do convite, etc.).

Estrutura típica de um convidado (campos podem variar conforme configuração):

```javascript
{
  name: '...',
  email: '...',
  phone: '...',
  attendance: 'yes' | 'maybe' | 'no',
  companions: [],
  dateAdded: Timestamp
}
```

## Personalização

- Textos, data, local, links e seções: **`index.html`** (e imagens em **`images/`**).
- Aparência: **`style.css`**.
- PDF do convite: fluxo no admin usa **`pdf-template-birthday.html`** como base.

## Segurança (resumo)

- Painel protegido por Firebase Authentication.
- Operações sensíveis no admin pedem confirmação (ex.: limpar lista).
- Regras do Firestore devem refletir o que você aceita para convidados públicos vs. config; detalhes em **FIREBASE_SETUP.md**.

## Licença e uso

Uso pessoal/familiar. Adapte textos e credenciais conforme o seu evento.
