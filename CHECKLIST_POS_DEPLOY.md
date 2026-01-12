# ✅ Checklist Pós-Deploy - O que verificar agora

## 🎉 Seu site está no ar!
**URL:** https://erlifrancisco.netlify.app

## 📋 O que fazer agora:

### 1. ✅ Testar a Página Principal
- [ ] Acesse: https://erlifrancisco.netlify.app
- [ ] Verifique se a página carrega corretamente
- [ ] Verifique se os estilos estão aplicados
- [ ] Teste a animação da porta de entrada

### 2. ✅ Testar o Formulário de Confirmação
- [ ] Preencha o formulário com dados de teste:
  - Nome completo
  - E-mail válido
  - Telefone (opcional)
  - Escolha um status (Vou comparecer / Em dúvida / Não vou comparecer)
- [ ] Adicione um acompanhante (se quiser testar)
- [ ] Clique em "Confirmar"
- [ ] Verifique se aparece a mensagem de confirmação

### 3. ✅ Verificar se os Dados Estão Salvando no Firebase
- [ ] Acesse: https://console.firebase.google.com
- [ ] Vá em "Firestore Database"
- [ ] Verifique se aparece uma coleção chamada "guests"
- [ ] Verifique se os dados do teste aparecem lá

### 4. ✅ Testar o Painel Admin
- [ ] Acesse: https://erlifrancisco.netlify.app/admin.html
- [ ] Faça login com as credenciais do Firebase Authentication
- [ ] Verifique se aparece o dashboard com estatísticas
- [ ] Verifique se os dados do teste aparecem

### 5. ✅ Verificar Regras do Firestore (IMPORTANTE!)
- [ ] Acesse: https://console.firebase.google.com
- [ ] Vá em "Firestore Database" → "Regras"
- [ ] Verifique se as regras estão assim:

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

- [ ] Se não estiver assim, **copie e cole** as regras acima
- [ ] Clique em "Publicar"

### 6. ✅ Verificar Firebase Authentication
- [ ] Acesse: https://console.firebase.google.com
- [ ] Vá em "Authentication" → "Users"
- [ ] Verifique se existe um usuário admin criado
- [ ] Se não existir, crie um:
  - Clique em "Add user"
  - Digite o e-mail do admin
  - Digite uma senha segura
  - Clique em "Add user"

### 7. ✅ Testar Funcionalidades do Admin
- [ ] Teste a busca de convidados
- [ ] Teste a edição de um convidado
- [ ] Teste a exclusão de um convidado
- [ ] Teste a exportação para Excel
- [ ] Verifique se as estatísticas estão corretas

## ⚠️ Problemas Comuns e Soluções

### ❌ Formulário não salva dados
**Solução:**
1. Verifique as regras do Firestore (item 5 acima)
2. Abra o console do navegador (F12) e veja se há erros
3. Verifique se as credenciais do Firebase estão corretas no código

### ❌ Não consigo fazer login no admin
**Solução:**
1. Verifique se o usuário admin foi criado no Firebase Authentication (item 6)
2. Verifique se o e-mail e senha estão corretos
3. Verifique se o Firebase Authentication está ativado

### ❌ Página não carrega ou aparece erro 404
**Solução:**
1. Verifique se todos os arquivos foram commitados no GitHub
2. Verifique os logs do Netlify (Site settings → Build & deploy → Deploy logs)
3. Tente fazer um novo deploy

### ❌ Estilos não estão aplicados
**Solução:**
1. Limpe o cache do navegador (Ctrl + Shift + Delete)
2. Verifique se o arquivo `style.css` está na raiz do projeto
3. Verifique se o arquivo foi commitado no GitHub

## 🎯 Próximos Passos (Opcional)

### Configurar Domínio Personalizado
- [ ] Vá em "Site settings" → "Domain management" no Netlify
- [ ] Clique em "Add custom domain"
- [ ] Digite seu domínio (ex: convite-casamento.com)
- [ ] Siga as instruções para configurar o DNS

### Compartilhar o Link
- [ ] Compartilhe o link: https://erlifrancisco.netlify.app
- [ ] Ou configure um domínio personalizado e compartilhe esse

## ✅ Tudo Pronto?

Se todos os itens acima estão funcionando:
- ✅ Site carregando corretamente
- ✅ Formulário salvando dados
- ✅ Admin funcionando
- ✅ Firebase conectado

**Parabéns! Seu sistema de convites está funcionando! 🎉**

---

**Dica:** Sempre que fizer mudanças no código, faça:
```bash
git add .
git commit -m "Sua mensagem"
git push
```

O Netlify fará o deploy automaticamente!
