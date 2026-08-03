# AGENTS.md - Guia de Desenvolvimento "Histórias que Rolamos"

**Última atualização**: 2026-04-30  
**Versão**: 1.0.0

---

## 📋 Visão Geral

Aplicativo de RPG (Tormenta20, D&D, etc.) para registrar memórias de campanha, heróis, tokens e galeria de imagens. Construído com React + TypeScript + Tailwind CSS + Dexie (IndexedDB).

---

## 🏗️ Arquitetura

### Stack Principal
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + CSS custom properties (oklch)
- **State**: Context API (RouterContext, SearchContext, CampaignContext)
- **DB**: Dexie (IndexedDB) com `dexie-react-hooks`
- **Build**: Vite 8
- **Roteamento**: Custom router (não React Router)

### Estrutura de Pastas
```
src/
├── components/
│   ├── layout/       # AppLayout (header, bottom nav, search)
│   ├── ui/           # Componentes base (button, dialog, input, etc.)
│   ├── campaign/     # Modais de campanha
│   ├── character/    # Modais de personagem
│   ├── gallery/      # Modais de galeria/tokens
│   └── memory/       # Modais de memória
├── contexts/         # Contexts (Router, Search, Campaign, Confirmation)
├── db/               # Dexie database schema
├── hooks/            # Custom hooks (useMediaUrl, etc.)
├── services/         # Serviços (media, backup)
├── types/            # TypeScript types
└── views/            # Telas principais
```

---

## 🎨 Design System

### Temas (5 disponíveis)

| Tema | ID | Tipo | Canvas | Accent |
|------|----|------|--------|--------|
| **Grimoire Noir** | `grimoire` | Dark | `#0A0A0C` | `#C5A880` |
| **Parchment Scroll** | `parchment` | Claro | `#F4F1EA` | `#8B7355` |
| **Emerald Court** | `emerald` | Dark | `#06140C` | `#4ADE80` |
| **Crimson Throne** | `crimson` | Dark | `#120A0A` | `#C0392B` |
| **Frostbound** | `frost` | Dark | `#0A0F1A` | `#7EB8E8` |

### Tokens Semânticos (obrigatórios)

```css
--color-medieval-charcoal: ...;   /* Canvas - fundo principal */
--color-medieval-stone: ...;      /* Surface - cards/containers */
--color-medieval-gold: ...;       /* Accent - CTA, ativo, focus */
--color-medieval-brightGold: ...; /* Accent Bright - hover, destaque */
--color-medieval-wine: ...;       /* Danger - erros, exclusão */
--color-medieval-parchment: ...;  /* Ink - texto principal */
--color-medieval-silver: ...;     /* Muted - texto secundário */
--color-medieval-accent: ...;     /* Accent alternativo */
--color-medieval-border: ...;     /* Border - bordas estruturais */
```

### Fontes (obrigatórias)

| Uso | Fonte | Substitui |
|-----|-------|-----------|
| Títulos | **Fraunces** | ~~Cinzel~~ (BANNED) |
| Corpo | **Outfit** | ~~Inter~~ (BANNED) |
| Números/Mono | **JetBrains Mono** | - |

### Spacing Tokens

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Shadows

```css
--shadow-card: 0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.15);
--shadow-elevated: 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.2);
--shadow-hover: 0 4px 12px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.25);
--shadow-glow: 0 0 20px rgba(212,175,55,0.3);
```

### Transições

```css
--transition-fast: 200ms;
--transition-base: 300ms;  /* MÍNIMO para interações */
--transition-slow: 500ms;
```

---

## 📐 Regras de Componentes

### Classes CSS Reutilizáveis

| Classe | Uso |
|--------|-----|
| `grimoire-card` | Card base com glassmorphism |
| `grimoire-card-hover` | Card com hover elevado |
| `grimoire-card-elevated` | Card elevado (hero/dashboard) |
| `glass-panel` | Overlay com blur forte |
| `btn-gold` | Botão primário (accent) |
| `btn-stone` | Botão secundário |
| `btn-wine` | Botão destrutivo |
| `medieval-input` | Input padrão |
| `stagger-item` | Animação de entrada escalonada |
| `spatial-card` | Card com profundidade 3D |
| `perspective-container` | Container com perspectiva |

### Regras de Transições
- ✅ **Mínimo 300ms** (`duration-300`) para todas as interações
- ✅ Usar `transition-all` ou `transition-colors` com `duration-300`
- ✅ Hover states devem incluir transformações (`scale`, `translate-y`)
- ✅ Focus states obrigatórios: `focus:ring-2 focus:ring-medieval-gold/40`

### Regras de Loading
- ✅ Todos os botões de submit devem ter `LoadingSpinner`
- ✅ Usar `LoadingSkeleton` para carregamento de conteúdo
- ✅ Sempre mostrar feedback visual durante operações async

### Regras de Acessibilidade
- ✅ Focus states visíveis em todos os elementos interativos
- ✅ Respeitar `prefers-reduced-motion`
- ✅ Touch targets mínimos de 44x44px
- ✅ Contraste mínimo WCAG AA (4.5:1 para texto)
- ✅ `aria-label` em botões de ícone

---

## 🚫 Anti-Patterns (BANNED)

### Fontes
- ❌ **Inter** - substituída por Outfit
- ❌ **Cinzel** - substituída por Fraunces
- ❌ Serif genéricas (Times New Roman, Georgia, Garamond)

### Cores
- ❌ **Pure black** (`#000000`) - usar off-black `#0A0A0C`
- ❌ **Neon glows** - sombras difusas apenas
- ❌ **Oversaturated accents** - saturação < 80%
- ❌ Gradientes neon/roxo

### Layout
- ❌ **3-column equal cards** - usar grids assimétricos
- ❌ **Overlapping elements** - cada elemento em sua zona espacial
- ❌ **Centered Hero** em layouts de alta variância
- ❌ **Horizontal scroll** em mobile

### Conteúdo
- ❌ **Emojis** - usar ícones SVG (lucide-react)
- ❌ **AI copywriting clichés** ("Elevate", "Seamless", "Unleash")
- ❌ **Filler text** ("Scroll to explore", "Swipe down")
- ❌ **Nomes genéricos** ("John Doe", "Acme")

### Performance
- ❌ Animar `box-shadow` ou `filter` continuamente
- ❌ Animar `top`, `left`, `width`, `height`
- ❌ Usar `h-screen` - usar `min-h-[100dvh]`

---

## 📝 Regras de Código

### TypeScript
- ✅ Usar tipos explícitos (não `any` quando possível)
- ✅ Tipos em `src/types/`
- ✅ Props de componentes com interfaces

### React
- ✅ Componentes funcionais com hooks
- ✅ `useLiveQuery` para dados reativos do Dexie
- ✅ `createPortal` para modais
- ✅ `useConfirmation` para ações destrutivas

### Estilo
- ✅ Tailwind classes com prefixo `medieval-` para cores
- ✅ Classes custom em `src/index.css` (componentes)
- ✅ Tokens em `src/styles.css` (design system)
- ✅ Nunca usar valores hex hardcoded em componentes

### Nomes
- ✅ Componentes: PascalCase (`CampaignHome`)
- ✅ Hooks: camelCase com prefixo `use` (`useMediaUrl`)
- ✅ Contexts: PascalCase com sufixo `Context` (`CampaignContext`)
- ✅ Arquivos: PascalCase para componentes, camelCase para utils

---

## 🎨 Animações

### Staggered Entrances
```css
.stagger-item {
  opacity: 0;
  animation: staggerFadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```
- ✅ Usar em listas e grids
- ✅ Delays: 0.05s - 0.4s (8 níveis)
- ✅ Easing: `cubic-bezier(0.16, 1, 0.3, 1)`

### Spatial Depth
```css
.spatial-card:hover {
  transform: translateY(-4px) rotateX(2deg) rotateY(0deg);
}
```
- ✅ Usar `will-change: transform` para performance
- ✅ Respeitar `prefers-reduced-motion`

---

## 📚 Documentação de Referência

### Arquivos de Contexto
- `UX_IMPROVEMENT_PLAN.md` - Plano geral de UX
- `UX_AUDIT_REPORT.md` - Issues identificadas
- `SPRINT_1_PROGRESS.md` - Foundation (tokens, loading, transições)
- `SPRINT_2_PROGRESS.md` - Polish (hover, focus, badges)
- `SPRINT_3_PROGRESS.md` - Premium (glassmorphism, 3D, animations)
- `THEME_REFORMULATION.md` - 5 temas implementados

### Skills Utilizadas
- `ux-audit` - Heurísticas de Nielsen
- `web-design-guidelines` - Vercel guidelines
- `uxui-principles` - 168 princípios UX/UI
- `antigravity-design-expert` - Glassmorphism, 3D, motion
- `theme-factory` - Paletas e fontes
- `stitch-design-taste` - Design system premium + anti-patterns
- `tailwind-design-system` - Design tokens
- `ui-tokens` - Gestão de tokens semânticos

---

## 🔄 Fluxo de Trabalho

### Para Novos Componentes
1. Usar tokens semânticos (nunca hex hardcoded)
2. Aplicar transições `duration-300`
3. Adicionar focus states
4. Adicionar loading states se async
5. Usar `stagger-item` se em lista
6. Testar em todos os 5 temas

### Para Novos Temas
1. Adicionar `[data-theme='nome']` em `src/index.css`
2. Definir todos os 9 tokens semânticos
3. Adicionar opção em `SettingsView.tsx`
4. Verificar contraste WCAG AA
5. Testar em todos os componentes

### Para Modais
1. Usar `createPortal`
2. Adicionar `LoadingSpinner` no botão submit
3. Usar `useConfirmation` para ações destrutivas
4. Fechar com `onClose` e `disabled={loading}`

---

## ✅ Checklist de Qualidade

### Antes de Commitar
- [ ] TypeScript compilation sem erros (`npx tsc --noEmit`)
- [ ] Sem hex hardcoded em componentes
- [ ] Transições `duration-300+`
- [ ] Focus states em elementos interativos
- [ ] Loading states em operações async
- [ ] Testado em todos os 5 temas
- [ ] Respeita `prefers-reduced-motion`
- [ ] Sem anti-patterns (Inter, Cinzel, pure black, etc.)

---

**Este documento é a fonte de verdade para desenvolvimento.**
**Sempre consultar antes de fazer alterações.**