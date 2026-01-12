# 📚 Guia de Uso do Git - Como Fazer Mudanças e Salvar no GitHub

## ✅ Projeto já está no GitHub!

Seu projeto já foi enviado para: https://github.com/pierinepro/convite_de_casamento

## 🔄 Como Fazer Mudanças e Salvar no GitHub

### Passo 1: Fazer suas alterações
Edite os arquivos normalmente no seu editor (VS Code, Cursor, etc.)

### Passo 2: Ver o que foi alterado
```bash
git status
```
Este comando mostra quais arquivos foram modificados.

### Passo 3: Adicionar as mudanças
```bash
git add .
```
Este comando adiciona todas as mudanças para serem salvas.

**OU** para adicionar arquivos específicos:
```bash
git add nome-do-arquivo.html
git add script.js
```

### Passo 4: Criar um commit (salvar localmente)
```bash
git commit -m "Descrição do que foi alterado"
```

Exemplos de mensagens:
- `git commit -m "Adicionado campo de telefone no formulário"`
- `git commit -m "Corrigido bug na busca de convidados"`
- `git commit -m "Melhorado estilo dos botões"`

### Passo 5: Enviar para o GitHub
```bash
git push
```

Pronto! Suas mudanças agora estão salvas no GitHub.

## 📝 Exemplo Completo

```bash
# 1. Você editou o arquivo index.html
# 2. Ver o que mudou
git status

# 3. Adicionar as mudanças
git add index.html

# 4. Criar commit
git commit -m "Atualizado texto do convite"

# 5. Enviar para o GitHub
git push
```

## 🔍 Comandos Úteis

### Ver histórico de commits
```bash
git log
```

### Ver diferenças antes de commitar
```bash
git diff
```

### Desfazer mudanças em um arquivo (antes de fazer commit)
```bash
git checkout -- nome-do-arquivo
```

### Ver o que está no GitHub mas não está local
```bash
git pull
```
Use este comando se você fez mudanças em outro computador ou no próprio GitHub.

## ⚠️ Dica Importante

Sempre faça `git pull` antes de começar a trabalhar, especialmente se você trabalha em mais de um computador:

```bash
git pull
# Faça suas alterações
git add .
git commit -m "Sua mensagem"
git push
```

## 🆘 Problemas Comuns

### Erro: "Your branch is behind"
```bash
git pull
git push
```

### Erro: "Please tell me who you are"
Configure seu nome e email:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

### Desfazer último commit (mas manter as mudanças)
```bash
git reset --soft HEAD~1
```

## 📌 Resumo Rápido

**Fluxo básico para salvar mudanças:**
1. `git add .` - Adiciona mudanças
2. `git commit -m "mensagem"` - Salva localmente
3. `git push` - Envia para o GitHub

**Fluxo completo (recomendado):**
1. `git pull` - Atualiza do GitHub
2. Faça suas alterações
3. `git add .` - Adiciona mudanças
4. `git commit -m "mensagem"` - Salva localmente
5. `git push` - Envia para o GitHub

---

💡 **Lembre-se**: O Git salva o histórico de todas as mudanças, então você sempre pode voltar a versões anteriores se precisar!
