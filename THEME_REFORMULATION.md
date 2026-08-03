# Reformulação de Temas - "Histórias que Rolamos"

**Data**: 2026-04-30  
**Status**: ✅ **COMPLETO**  
**Baseado em**: `theme-factory` + `stitch-design-taste` + `tailwind-design-system` + `ui-tokens`

---

## 🎨 Os 5 Temas

### 1. **Grimoire Noir** (Dark - Padrão)
**Atmosfera**: "Biblioteca arcana à meia-luz, com dourado envelhecido e tinta sobre pergaminho escuro"

| Token | Valor | Função |
|-------|-------|--------|
| Canvas | `#0A0A0C` | Fundo principal (off-black) |
| Surface | `#141418` | Cards e containers |
| Ink | `#E8E4DC` | Texto principal |
| Muted | `#8A8A93` | Texto secundário |
| Accent | `#C5A880` | Dourado envelhecido |
| Accent Bright | `#E5CDA8` | Hover, destaque |
| Danger | `#7B1F26` | Wine |
| Border | `rgba(197,168,128,0.15)` | Bordas |

**Fontes**: Fraunces + Outfit + JetBrains Mono

---

### 2. **Parchment Scroll** (Claro)
**Atmosfera**: "Pergaminho antigo iluminado por vela, com tinta sépia"

| Token | Valor | Função |
|-------|-------|--------|
| Canvas | `#F4F1EA` | Fundo pergaminho |
| Surface | `#E8E4DC` | Cards |
| Ink | `#2C2C2C` | Texto principal |
| Muted | `#5D5D5D` | Texto secundário |
| Accent | `#8B7355` | Sépia |
| Accent Bright | `#5D4037` | Hover |
| Danger | `#7B1F26` | Wine |
| Border | `rgba(139,115,85,0.2)` | Bordas |

**Fontes**: Fraunces + Outfit

---

### 3. **Emerald Court** (Dark - Verde)
**Atmosfera**: "Corte élfica sob a copa de uma floresta encantada"

| Token | Valor | Função |
|-------|-------|--------|
| Canvas | `#06140C` | Fundo floresta |
| Surface | `#0D2418` | Cards |
| Ink | `#ECFDF5` | Texto principal |
| Muted | `#94A3B8` | Texto secundário |
| Accent | `#4ADE80` | Verde élfico |
| Accent Bright | `#BBF7D0` | Hover |
| Danger | `#EF4444` | Vermelho |
| Border | `rgba(74,222,128,0.15)` | Bordas |

**Fontes**: Fraunces + Outfit

---

### 4. **Crimson Throne** (Dark - Vermelho) **NOVO**
**Atmosfera**: "Salão do trono em chamas, com veludo carmesim e ouro imperial"

| Token | Valor | Função |
|-------|-------|--------|
| Canvas | `#120A0A` | Fundo carmesim |
| Surface | `#1E1212` | Cards |
| Ink | `#F5E8E8` | Texto principal |
| Muted | `#A08A8A` | Texto secundário |
| Accent | `#C0392B` | Vermelho imperial |
| Accent Bright | `#E74C3C` | Hover |
| Danger | `#8B0000` | Wine profundo |
| Border | `rgba(192,57,43,0.2)` | Bordas |

**Fontes**: Fraunces + Outfit

---

### 5. **Frostbound** (Dark - Azul) **NOVO**
**Atmosfera**: "Tundra congelada com runas de gelo e prata lunar"

| Token | Valor | Função |
|-------|-------|--------|
| Canvas | `#0A0F1A` | Fundo noite ártica |
| Surface | `#141C2E` | Cards |
| Ink | `#E8F0F8` | Texto principal |
| Muted | `#8A9BB5` | Texto secundário |
| Accent | `#7EB8E8` | Azul gelo |
| Accent Bright | `#A8D4F5` | Hover |
| Danger | `#B03060` | Carmesim gelado |
| Border | `rgba(126,184,232,0.15)` | Bordas |

**Fontes**: Fraunces + Outfit

---

## 🔤 Fontes Premium (Substituições)

### Antes (BANNED pelo stitch-design-taste)
- ❌ **Cinzel** - serif genérica
- ❌ **Inter** - sans genérica

### Depois (Premium)
- ✅ **Fraunces** - serif moderna com caráter (títulos)
- ✅ **Outfit** - sans geométrica premium (corpo)
- ✅ **JetBrains Mono** - para números e metadados

---

## 📐 Arquitetura de Tokens

### Semântica Funcional (via `ui-tokens`)
```css
--color-medieval-charcoal: ...;  /* Canvas - fundo */
--color-medieval-stone: ...;     /* Surface - cards */
--color-medieval-gold: ...;      /* Accent - CTA, ativo */
--color-medieval-brightGold: ...; /* Accent Bright - hover */
--color-medieval-wine: ...;      /* Danger - erros */
--color-medieval-parchment: ...; /* Ink - texto principal */
--color-medieval-silver: ...;    /* Muted - texto secundário */
--color-medieval-accent: ...;    /* Accent alternativo */
--color-medieval-border: ...;    /* Border - bordas */
```

### Compatibilidade
- ✅ `[data-theme='dark']` mapeado para `grimoire` (backwards compatible)
- ✅ `CampaignContext` migra automaticamente `dark` → `grimoire`
- ✅ Todas as classes existentes funcionam com os novos tokens

---

## 📁 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/index.css` | 5 temas + novas fontes + token `--color-medieval-border` |
| `src/views/SettingsView.tsx` | 5 opções de tema com novos nomes |
| `src/contexts/CampaignContext.tsx` | Tema padrão `grimoire` + migração `dark` |

---

## 🎯 Anti-Patterns Evitados (via `stitch-design-taste`)

- ✅ **Sem Inter** - substituída por Outfit
- ✅ **Sem Cinzel** - substituída por Fraunces
- ✅ **Sem pure black** (`#000000`) - off-black `#0A0A0C`
- ✅ **Sem neon glows** - sombras difusas
- ✅ **Sem 3-column equal cards** - grids assimétricos
- ✅ **Sem emojis** - ícones SVG

---

## 📈 Impacto

### Antes
- 3 temas (dark, parchment, emerald)
- Fontes genéricas (Cinzel, Inter)
- Sem token de borda semântico

### Depois
- 5 temas com identidades distintas
- Fontes premium (Fraunces, Outfit, JetBrains Mono)
- Token de borda semântico por tema
- Compatibilidade com temas antigos

---

**Última atualização**: 2026-04-30  
**Status**: ✅ **COMPLETO**