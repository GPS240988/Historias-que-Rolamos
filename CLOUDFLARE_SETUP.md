# 🏰 Manual de Configuração e Implantação da Nuvem (Cloudflare + Vercel)

Este guia detalha o passo a passo para configurar e implantar a infraestrutura de sincronização online para o aplicativo **Histórias que Rolamos** utilizando os planos gratuitos da **Cloudflare** e **Vercel**.

> **Nota:** Toda a mídia (imagens, tokens, retratos) é armazenada diretamente no banco D1 como Base64 — não é necessário ativar o R2 nem cadastrar cartão de crédito.

---

## Passo 1 — Acessar a Conta da Cloudflare
1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/).
2. Faça login ou crie uma conta gratuita caso não possua.

---

## Passo 2 — Instalar as Ferramentas da Cloudflare
No terminal do seu computador, instale a ferramenta CLI `wrangler` globalmente para gerenciar os serviços (Workers e D1):
```bash
npm install -g wrangler
```

---

## Passo 3 — Autenticar o Wrangler
Autentique o Wrangler com a sua conta da Cloudflare executando:
```bash
wrangler login
```
Isso abrirá uma janela do navegador pedindo permissão de acesso. Autorize e feche o navegador quando terminar.

---

## Passo 4 — Criar o Banco de Dados D1
Crie o banco de dados D1 (SQLite na nuvem) executando:
```bash
wrangler d1 create historias_que_rolamos_d1
```

---

## Passo 5 — Obter o ID do Banco de Dados
A saída do comando anterior exibirá um bloco de configuração semelhante a este:
```toml
[[d1_databases]]
binding = "DB"
database_name = "historias_que_rolamos_d1"
database_id = "xxxx-xxxx-xxxx-xxxx-xxxx"
```
Copie o valor do `database_id` gerado.

---

## Passo 6 — Configurar o Wrangler no Worker
Abra o arquivo [wrangler.toml](file:///c:/Users/bobor/Documents/Histórias que Rolamos/cloudflare/worker/wrangler.toml) e substitua a linha:
```toml
database_id = "D1_DATABASE_ID_TO_BE_REPLACED"
```
pelo ID copiado no Passo 5:
```toml
database_id = "SEU_DATABASE_ID_AQUI"
```

---

## Passo 7 — Aplicar as Migrações do D1
Inicialize a estrutura de tabelas do banco de dados executando as migrações (certifique-se de estar na pasta `cloudflare/worker`):

```bash
cd cloudflare/worker
```

### Local (para testes de desenvolvimento):
```bash
npx wrangler d1 migrations apply historias_que_rolamos_d1 --local
```

### Produção (Nuvem):
```bash
npx wrangler d1 migrations apply historias_que_rolamos_d1 --remote
```

---

## Passo 8 — Configurar Segredos no Worker
Configure a chave secreta de assinatura dos tokens JWT na nuvem para garantir a segurança da autenticação:
```bash
wrangler secret put JWT_SECRET
```
O console solicitará o valor do segredo. Digite uma frase secreta forte (ex: `minha_palavra_secreta_medieval_super_segura_123`) e pressione Enter.

---

## Passo 9 — Testar o Worker Localmente
Você pode rodar o Worker e o banco localmente para testes sem interferir com os dados de produção:
```bash
# Entre na pasta do worker
cd cloudflare/worker
npm install
npm run dev
```
Isso iniciará o worker local em `http://localhost:8787` emulando as chamadas a D1 em memória.

---

## Passo 10 — Implantar o Worker na Cloudflare
Com as configurações prontas, publique o Worker de sincronização na nuvem:
```bash
# Executado a partir da pasta cloudflare/worker
wrangler deploy
```
Copie a URL do Worker gerada (ex: `https://historias-que-rolamos-worker.seu-usuario.workers.dev`).

---

## Passo 11 — Configurar a Vercel (Frontend)
No painel do projeto de frontend na Vercel:
1. Vá em **Project Settings** > **Environment Variables**.
2. Adicione a seguinte variável de ambiente pública:
   - **Chave**: `VITE_API_BASE_URL`
   - **Valor**: `https://historias-que-rolamos-worker.seu-usuario.workers.dev` (A URL copiada no Passo 10, sem a barra `/` final).
3. Realize um novo deploy do frontend na Vercel para aplicar a variável.

---

## Passo 12 — Teste Manual de Sincronização
Para validar o funcionamento completo da sincronização com múltiplos dispositivos:

1. **Conexão**:
   - Abra o aplicativo e acesse a aba **Mais (Configurações)**.
   - Na seção **Sincronização na Nuvem**, registre um usuário e senha (ex: `MestreMesa` e `chave123`).
2. **Sincronizar Campanha Ativa**:
   - Com uma campanha ativa selecionada, clique em **Sincronizar Grimório Ativo**.
   - O status no cabeçalho deve mudar para `✓ Nuvem` (Sincronizado) e exibir um código de convite (UUID).
3. **Múltiplos Dispositivos**:
   - Em outro navegador ou aba anônima, registre outro usuário (ex: `JogadorA` e `chave456`).
   - Cole o código da campanha ativa do Mestre no campo **Entrar em Grimório Existente** e clique em **Entrar**.
   - A campanha stub será criada e as crônicas e fichas serão baixadas automaticamente da nuvem.
4. **Verificação de Colaboração**:
   - Crie um Herói no dispositivo do Mestre. Ele deve aparecer instantaneamente no dispositivo do Jogador após a sincronização periódica (ou ao clicar em Sincronizar).
5. **Verificação de Conflitos**:
   - Desative a internet de um dos dispositivos. Edite o nome do mesmo herói em ambos os lados com valores diferentes.
   - Fique online novamente. Ao tentar sincronizar, o indicador mostrará um alerta vermelho.
   - Clique no ícone de conflito para abrir o painel de **Resolução de Conflito** e decida qual versão manter.
6. **Mídia (Imagens)**:
   - Adicione uma nova imagem na Galeria ou como retrato de herói.
   - Abra o outro dispositivo e certifique-se de que a imagem carrega perfeitamente (armazenada como Base64 no D1 e sincronizada entre dispositivos).
