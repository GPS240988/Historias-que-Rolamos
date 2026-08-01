# 📜 Histórias que Rolamos — Crônicas da Jornada

**Histórias que Rolamos** (ou *Crônicas da Jornada*) é um diário de campanha de RPG visual, interativo e offline-first desenvolvido sob uma estética *Medieval Dark Premium*. O sistema permite que Mestres (GMs) e jogadores registrem crônicas de sessões, controlem a evolução narrativa de seus personagens e gerenciem mapas, artes e tokens de combate de maneira totalmente segura e local.

A aplicação é um **PWA (Progressive Web App)** completo que salva todos os dados estruturados e arquivos de imagem diretamente no navegador usando o banco de dados IndexedDB via Dexie.js.

---

## 🛡️ Principais Funcionalidades

1. **Painel Geral (Dashboard)**: Resumo visual da campanha, tempo decorrido, sistema de jogo (ex: *Tormenta20*), descrição geral e atalhos de ações rápidas.
2. **Linha do Tempo das Crônicas**: Mural cronológico contendo relatos detalhados, tags personalizadas, ilustrações em alta resolução e o elenco de personagens que participaram do evento.
3. **Evolução de Personagens (Dossiê)**: Registro de fichas com imagens personalizadas, biografias, classes, raças e origens. Uma linha do tempo acoplada na ficha compila automaticamente a jornada narrativa daquele herói a partir das memórias onde ele subiu de nível.
4. **Mural e Galeria Visual**:
   - *Seção 1 (Imagens da Campanha)*: Álbum contendo artes do cenário, ilustrações de memórias, NPCs, monstros, mapas ou itens.
   - *Seção 2 (Arquivos e Fichas)*: Repositório de documentos PDF e fichas de personagem anexadas.
   - *Seção 3 (Tokens de Combate)*: Grade contendo tokens circulares de combate divididos por categoria (Heróis, Aliados, Ameaças).
5. **Filtros e Busca Spotlight**: Busca rápida global que autocompleta e filtra fichas, relatos e tokens em tempo real.
6. **Sistema de Backup & Exportação**:
   - Exportação rápida apenas dos dados relacionais em JSON.
   - Exportação completa empacotada em `.zip` contendo os dados estruturados e todos os arquivos binários originais.
   - Importação assistida por barras de progresso que reconstrói os registros IndexedDB e refaz as miniaturas via canvas.
7. **Pipeline de Mídia Otimizado**: Canvas-based resizing para miniaturas de 300x300 e validação rigorosa de cabeçalhos binários (magic numbers) contra falsificação de extensões.
8. **Sistema de Anexos Inteligente**: Separação automática de arquivos por tipo (galeria de imagens vs. documentos PDF) com flag `isGallery` no banco de dados.
9. **Descrição Narrativa Expansível**: Na capa da campanha, descrições longas podem ser expandidas/recollapsadas com botão "Ver Mais/Ver Menos".

---

## 🛠️ Pilha Tecnológica

* **Core**: React 19 + TypeScript + Vite
* **Banco de Dados**: Dexie.js (IndexedDB wrapper)
* **Estilização**: TailwindCSS v4 + Custom Vanilla CSS (HSL dark colors, gold accents, glassmorphism)
* **PWA & Offline**: `vite-plugin-pwa` (Precaching inteligente e Workbox SW autoUpdate)
* **Operações de Arquivos**: JSZip para exportações zipadas client-side
* **Suíte de Testes**: Vitest + jsdom + testing-library
* **Icons**: Lucide React

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js v18 ou superior instalado.
* NPM ou outro gerenciador de pacotes equivalente.

### Instalação de Dependências
Instale todas as dependências de produção e de desenvolvimento do projeto:
```bash
npm install
```

### Modo de Desenvolvimento (HMR)
Inicie o servidor de desenvolvimento local do Vite:
```bash
npm run dev
```
Abra o navegador em `http://localhost:5173`.

### Executando Testes Unitários
Rode a suíte de testes de validação de mídia, filtros de busca e backups estruturados via Vitest:
```bash
npm test
```

### Compilação de Produção
Gere os artefatos otimizados minificados de produção na pasta `dist/` (com divisão automática de chunks de terceiros para lucide-react e jszip):
```bash
npm run build
```

---

## 📂 Estrutura de Diretórios Relevantes

```
├── dist/                    # Assets estáticos prontos para deploy
├── src/
│   ├── components/          # Componentes reutilizáveis organizados por módulo
│   │   ├── campaign/        # Modais de criação/edição de campanha
│   │   ├── character/       # Formulários de personagens
│   │   ├── gallery/         # Modais de tokens, upload de mapas e visualizadores
│   │   ├── layout/          # Cabecalho, menu lateral e spotlight search panel
│   │   └── memory/          # Editor de crônicas e painel de participantes
│   ├── contexts/            # Contextos do React (Campaign, Router, Search)
│   ├── db/                  # Configuração do banco Dexie e schemas das tabelas
│   ├── hooks/               # Custom hooks (ex: useMediaUrl para URLs de Blobs)
│   ├── services/            # Serviços de validação de mídia e backups ZIP
│   ├── test/                # Suíte de testes unitários e setups
│   ├── views/               # Telas principais da aplicação
│   ├── App.tsx              # Componente raiz que roteia telas
│   ├── index.css            # Folha de estilos vanilla contendo animações e tokens HSL
│   └── main.tsx             # Ponto de entrada React DOM
├── vite.config.ts           # Configurações de bundles, PWA e Vitest
└── package.json             # Scripts de compilação e dependências
```

---

## ⚜️ Estética Medieval Dark Premium (HSL Design System)
A identidade visual do aplicativo utiliza a paleta de cores estruturada em HSL:
* **Background Dark Charcoal**: `#0f0f12` (`hsl(240, 9%, 6%)`) — Tons profundos que reduzem a fadiga ocular.
* **Stone Glass Card**: `#1e1e24` (`hsl(240, 10%, 13%)`) com opacidade de 80% e desfoque backdrop blur — Efeito grimoire de pergaminho.
* **Medieval Gold**: `#c5a880` (`hsl(36, 36%, 64%)`) — Destaques, bordas finas ornamentadas e botões principais.
* **Medieval Wine**: `#581c20` (`hsl(356, 52%, 23%)`) — Usado em exclusões, zonas de perigo e alertas críticos.
