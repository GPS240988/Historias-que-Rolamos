# UX Improvement Plan - "Histórias que Rolamos"

**Data**: 2026-04-30  
**Status**: Em andamento - Fase de Auditoria  
**Abordagem**: Híbrida (Opção C) - Auditoria + Implementação incremental  

---

## 📋 Contexto

Este documento serve como checkpoint para continuidade do trabalho de melhoria de layout e UX do projeto "Histórias que Rolamos".  
Quando o contexto for reiniciado, usar este arquivo para retomar exatamente de onde paramos.

---

## ✅ Skills Instaladas e Relevantes

Todas as skills estão em: `C:\Users\bobor\Documents\Histórias que Rolamos\.agent\skills\`

### Skills Prioritárias (em ordem de uso):

1. **`ux-audit`** - Auditoria usando heurísticas de Nielsen + mobile UX best practices
2. **`web-design-guidelines`** - Conformidade com Web Interface Guidelines (Vercel)
3. **`accessibility-compliance-accessibility-audit`** - WCAG compliance
4. **`uxui-principles`** - 168 princípios research-backed de UX/UI
5. **`ux-flow`** - Design de fluxos de navegação
6. **`antigravity-design-expert`** - Design premium com glassmorphism, GSAP, 3D

---

## 🎯 Estratégia de Trabalho (Opção C - Híbrida)

### Fase 1: Auditoria (SEMANA 1)
**Objetivo**: Identificar issues críticos antes de implementar

**Skills a usar**:
- `ux-audit` → Auditoria de heurísticas de Nielsen
- `web-design-guidelines` → Validação técnica
- `accessibility-compliance` → WCAG compliance

**Arquivos para auditar**:
- `src/components/layout/AppLayout.tsx` (navegação global)
- `src/views/CampaignHome.tsx` (home screen)
- `src/components/ui/*.tsx` (componentes base)

**Output esperado**:
- Relatório de issues priorizadas (Alta/Média/Baixa)
- Heurísticas violadas
- Sugestões de remediação

---

### Fase 2: Implementação Incremental (SEMANA 2-3)
**Objetivo**: Corrigir issues críticos e melhorias importantes

**Ordem de implementação**:
1. Correções de acessibilidade (WCAG)
2. Melhorias de navegação (ux-flow)
3. Refatoração de componentes (uxui-principles)
4. Polish visual (antigravity-design-expert)

---

### Fase 3: Redesign Completo (SEMANA 4+)
**Objetivo**: Aplicar design premium do antigravity-design-expert

**Mudanças visuais**:
- Glassmorphism nos cards
- Animações GSAP (staggered, parallax)
- Sombras em camadas (weightlessness)
- Transições suaves (0.3s ease-out mínimo)

---

## 📊 Estado Atual do Projeto

### Arquitetura
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS + CSS custom properties (oklch)
- **State**: Context API (RouterContext, SearchContext, CampaignContext)
- **DB**: Dexie (IndexedDB)
- **Roteamento**: Custom router (não React Router)

### Componentes Principais
```
src/
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx (header, bottom nav, search overlay)
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── skeleton.tsx
│   │   └── tooltip.tsx
│   ├── campaign/
│   ├── character/
│   ├── gallery/
│   └── memory/
├── views/
│   ├── CampaignHome.tsx (HERO - foco principal)
│   ├── TimelineView.tsx
│   ├── CharactersView.tsx
│   ├── GalleryView.tsx
│   ├── SettingsView.tsx
│   └── ...
└── styles.css (design tokens)
```

### Design System Atual
- **Cores**: Medieval theme (charcoal, gold, parchment, silver)
- **Tipografia**: font-medieval (títulos), font-serif (corpo)
- **Cards**: `grimoire-card` (base component)
- **Botões**: `btn-gold`, `btn-stone`
- **Espaçamento**: Genérico (space-y-4, gap-6, p-4)
- **Sombras**: shadow-md, shadow-lg (básicas)

---

## 🔍 Issues Conhecidas (Pré-Auditoria)

### Críticas (Alta Prioridade)
- [ ] **Escala tipográfica inconsistente** - Falta módulo claro
- [ ] **Espaçamentos genéricos** - Ausência de spacing tokens
- [ ] **Sombras subutilizadas** - Apenas shadow-md/lg sem variações
- [ ] **Bottom nav ocupa espaço** - 60px sem valor agregado
- [ ] **Falta de loading states** - Componentes não têm skeletons
- [ ] **Micro-interações básicas** - Hover simples, sem elaboração

### Médias (Média Prioridade)
- [ ] **Transições curtas** - duration-200 (mínimo recomendado: 0.3s)
- [ ] **Empty states genéricos** - Podem ser mais elaborados
- [ ] **Falta de breadcrumbs** - Perda de contexto em telas profundas
- [ ] **Search overlay básico** - Falta categorização visual
- [ ] **Cards sem profundidade** - Sem hover elevation ou 3D effects

### Baixas (Polish)
- [ ] **Animações de entrada** - Apenas animate-fade-in
- [ ] **Focus states** - Não verificados
- [ ] **Tooltips** - Ausentes em botões de ícone
- [ ] **Badges/notificações** - Ausentes no bottom nav

---

## 🚀 Próximos Passos (Para Continuar)

### Imediato (Próxima Sessão)
1. **Executar `ux-audit`** em:
   - `AppLayout.tsx` (navegação)
   - `CampaignHome.tsx` (home screen)

2. **Executar `web-design-guidelines`** em:
   - Componentes UI principais
   - Verificar conformidade técnica

3. **Gerar relatório** de auditoria:
   ```markdown
   # Auditoria UX - [DATA]
   
   ## Issues Críticos
   - [Issue 1] - Heurística violada
   - [Issue 2] - Heurística violada
   
   ## Issues Médios
   ...
   ```

### Curto Prazo (Esta Semana)
4. Implementar correções críticas
5. Aplicar spacing tokens
6. Refinar tipografia

### Médio Prazo (Próximas 2 Semanas)
7. Redesign do Home Screen (CampaignHome.tsx)
8. Adicionar glassmorphism (antigravity-design-expert)
9. Implementar GSAP animations
10. Melhorar bottom nav

---

## 📚 Recursos e Referências

### Skills Documentation
- `ux-audit`: Nielsen's 10 heuristics + mobile UX
- `web-design-guidelines`: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- `uxui-principles`: 168 princípios research-backed
- `antigravity-design-expert`: Glassmorphism, GSAP, 3D CSS

### Links Úteis
- StyleSeed Toss: https://github.com/bitjaru/styleseed
- UX UI Principles: https://github.com/uxuiprinciples/agent-skills
- Vercel Web Guidelines: https://github.com/vercel-labs/web-interface-guidelines

---

## 🎨 Direção de Design

### Conceito: "Grimório Premium"
**Fusão de**: Tema medieval + Design moderno premium

**Elementos-chave**:
- **Weightlessness**: Cards flutuantes com sombras suaves
- **Glassmorphism**: Translucidez + backdrop-blur (sem exagero)
- **Spatial Depth**: Profundidade com perspective CSS
- **Motion**: Animações suaves (0.3s+), staggered entrances
- **Typography**: Escala modular clara

**Não mudar**:
- Identidade medieval (cores, fontes)
- Arquitetura de componentes
- Tema escuro base

---

## 📝 Notas de Implementação

### Tailwind Config
- Usar `oklch` colors (já implementado)
- Adicionar spacing tokens em `tailwind.config.js`
- Customizar shadows em `src/styles.css`

### Performance
- Animações devem respeitar `prefers-reduced-motion`
- Usar `will-change: transform` para elementos animados
- Não animar `box-shadow` ou `filter` continuamente

### Acessibilidade
- Garantir WCAG 2.1 AA
- Contraste mínimo 4.5:1 para texto
- Touch targets mínimos de 44x44px
- Navegação por teclado funcional

---

## 🔄 Como Retomar Este Trabalho

1. **Ler este arquivo** para entender contexto
2. **Verificar Fase atual** (início: Fase 1 - Auditoria)
3. **Executar skills na ordem**: `ux-audit` → `web-design-guidelines` → `accessibility-compliance`
4. **Gerar relatório** de auditoria
5. **Implementar correções** seguindo prioridade Alta → Média → Baixa
6. **Atualizar este arquivo** após cada milestone

---

## 📊 Checklist de Progresso

### Fase 1: Auditoria
- [ ] Executar `ux-audit` em AppLayout.tsx
- [ ] Executar `ux-audit` em CampaignHome.tsx
- [ ] Executar `web-design-guidelines` em componentes principais
- [ ] Executar `accessibility-compliance` em telas principais
- [ ] Gerar relatório consolidado de issues

### Fase 2: Implementação Incremental
- [ ] Implementar spacing tokens
- [ ] Refinar escala tipográfica
- [ ] Padronizar sombras
- [ ] Adicionar loading states
- [ ] Melhorar empty states
- [ ] Implementar micro-interações básicas

### Fase 3: Redesign Premium
- [ ] Aplicar glassmorphism nos cards
- [ ] Implementar GSAP animations
- [ ] Adicionar staggered entrances
- [ ] Criar parallax effects
- [ ] Refinar bottom nav com badges
- [ ] Adicionar tooltips

---

**Última atualização**: 2026-04-30  
**Próxima ação**: Executar auditoria com `ux-audit` em AppLayout.tsx e CampaignHome.tsx