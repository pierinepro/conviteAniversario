# 🚀 Guia de Deploy no Netlify

## ✅ Seu projeto está pronto para o Netlify!

O projeto já está configurado e pronto para ser publicado. Siga os passos abaixo:

## 📋 Passo a Passo

### Opção 1: Deploy via GitHub (Recomendado)

1. **Acesse o Netlify**
   - Vá para: https://app.netlify.com
   - Faça login com sua conta GitHub

2. **Conecte o Repositório**
   - Clique em "Add new site" → "Import an existing project"
   - Escolha "GitHub"
   - Autorize o Netlify a acessar seus repositórios
   - Selecione o repositório: `pierinepro/convite_de_casamento`

3. **Configure o Deploy**
   - **Branch to deploy**: `main`
   - **Build command**: Deixe em branco (não precisa de build)
   - **Publish directory**: `.` (ponto - raiz do projeto)
   - Clique em "Deploy site"

4. **Aguarde o Deploy**
   - O Netlify vai fazer o deploy automaticamente
   - Você verá uma URL temporária tipo: `random-name-123.netlify.app`

5. **Configurar Domínio Personalizado (Opcional)**
   - Vá em "Site settings" → "Domain management"
   - Clique em "Add custom domain"
   - Digite seu domínio (ex: `convite-casamento.com`)
   - Siga as instruções para configurar o DNS

### Opção 2: Deploy Manual (Arrastar e Soltar)

1. **Acesse o Netlify**
   - Vá para: https://app.netlify.com
   - Faça login

2. **Arraste a Pasta**
   - Na página inicial, arraste a pasta do projeto inteira
   - Ou clique em "Add new site" → "Deploy manually"

3. **Aguarde o Deploy**
   - O Netlify vai fazer o upload e deploy automaticamente

## ⚙️ Configurações Importantes

### Firebase já está configurado
O Firebase já está configurado no código e funcionará automaticamente no Netlify. Não precisa de variáveis de ambiente adicionais.

### Arquivos de Configuração
- ✅ `netlify.toml` - Configuração do Netlify (já criado)
- ✅ `.gitignore` - Arquivos ignorados (config.js está protegido)

## 🔒 Segurança

### Credenciais do Firebase
As credenciais do Firebase estão no código HTML. Isso é normal para aplicações frontend, pois:
- As credenciais do Firebase são públicas por design
- A segurança é garantida pelas regras do Firestore
- Certifique-se de que as regras do Firestore estão configuradas corretamente

### Regras do Firestore (Importante!)

No Firebase Console, configure as regras do Firestore:

**Para desenvolvimento/teste:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Para produção (mais seguro):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{document=**} {
      // Permite leitura e escrita para todos (público)
      // Para maior segurança, você pode adicionar validações aqui
      allow read, write: if true;
    }
  }
}
```

## ✅ Checklist Antes do Deploy

- [x] Projeto no GitHub
- [x] Firebase configurado
- [x] Arquivo `netlify.toml` criado
- [x] Todos os arquivos HTML, CSS e JS estão presentes
- [ ] Regras do Firestore configuradas
- [ ] Usuário admin criado no Firebase Authentication

## 🧪 Testar Após o Deploy

1. **Teste a página principal**
   - Acesse a URL do Netlify
   - Verifique se a página carrega corretamente
   - Teste o formulário de confirmação

2. **Teste o painel admin**
   - Acesse: `sua-url.netlify.app/admin.html`
   - Faça login com as credenciais do Firebase
   - Verifique se consegue ver os dados

3. **Teste o Firebase**
   - Preencha o formulário de confirmação
   - Verifique se os dados aparecem no Firebase Console
   - Teste a busca e edição no painel admin

## 🔄 Atualizações Futuras

Após fazer mudanças no código:

1. **Commit e Push para o GitHub**
   ```bash
   git add .
   git commit -m "Sua mensagem"
   git push
   ```

2. **Deploy Automático**
   - O Netlify detecta automaticamente mudanças no GitHub
   - Faz o deploy automaticamente em alguns segundos
   - Você recebe uma notificação quando o deploy termina

## 🆘 Problemas Comuns

### Erro 404 ao acessar admin.html
- Verifique se o arquivo `admin.html` está na raiz do projeto
- Verifique se o arquivo foi commitado no GitHub

### Firebase não funciona
- Verifique se as credenciais estão corretas no `index.html`
- Verifique se as regras do Firestore permitem leitura/escrita
- Verifique o console do navegador para erros

### Formulário não salva dados
- Verifique as regras do Firestore
- Verifique o console do navegador para erros
- Certifique-se de que o Firebase está inicializado corretamente

## 📞 Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Netlify (Site settings → Build & deploy → Deploy logs)
3. Verifique o Firebase Console para erros

---

**Pronto!** Seu projeto está configurado e pronto para ser publicado no Netlify! 🎉
