# Diagnóstico e Correção - Sincronização de Dados

**Data**: 2026-04-30  
**Status**: ✅ **CORRIGIDO**  
**Problema**: Usuário não via a última versão ao recarregar a página

---

## 🔍 Problemas Identificados

### 1. PWA Service Worker com Cache Stale (CRÍTICO)

**Arquivo**: `vite.config.ts`

**Problema**: O Service Worker do PWA cacheava assets estáticos e não forçava atualização imediata. Com `registerType: 'autoUpdate'` sem `skipWaiting`, o navegador continuava servindo o bundle antigo.

**Correção aplicada**:
```ts
workbox: {
  skipWaiting: true,        // Novo SW assume controle imediatamente
  clientsClaim: true,       // Páginas abertas são controladas pelo novo SW
  navigateFallback: '/index.html',
  globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
  cleanupOutdatedCaches: true,  // Remove caches antigos
}
```

**Cache busting adicionado**:
```ts
entryFileNames: `assets/[name]-[hash].js`,
chunkFileNames: `assets/[name]-[hash].js`,
assetFileNames: `assets/[name]-[hash].[ext]`,
```

---

### 2. activeCampaignId Inválido no localStorage (ALTO)

**Arquivo**: `src/contexts/CampaignContext.tsx`

**Problema**: Se o `activeCampaignId` no localStorage apontava para uma campanha deletada, o código não limpava o ID inválido quando não havia campanhas restantes.

**Correção aplicada**:
```ts
useEffect(() => {
  if (!campaign && campaigns.length > 0 && activeCampaignId !== 'new') {
    const firstId = campaigns[0].id;
    setActiveCampaignIdState(firstId);
    localStorage.setItem('activeCampaignId', firstId);
  }
  if (!campaign && campaigns.length === 0 && activeCampaignId !== 'new') {
    localStorage.removeItem('activeCampaignId');
  }
}, [campaign, campaigns, activeCampaignId]);
```

---

### 3. useEffect com Dependência Vazia (MÉDIO)

**Arquivo**: `src/contexts/CampaignContext.tsx`

**Problema**: O `useEffect` que aplicava o tema rodava apenas uma vez no mount, não reagindo a mudanças de tema.

**Correção aplicada**:
```ts
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);  // ← Agora reage a mudanças de tema
```

---

### 4. Falta de Storage Event Listener (MÉDIO)

**Arquivo**: `src/contexts/CampaignContext.tsx`

**Problema**: Abas abertas não sincronizavam mudanças de tema/campanha entre si.

**Correção aplicada**:
```ts
useEffect(() => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'activeCampaignId') {
      setActiveCampaignIdState(e.newValue);
    }
    if (e.key === 'theme') {
      const newTheme = e.newValue || 'grimoire';
      setThemeState(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

---

## 📊 Resumo das Correções

| # | Problema | Severidade | Correção |
|---|----------|------------|----------|
| 1 | PWA cache stale | 🔴 Crítico | `skipWaiting` + `clientsClaim` + cache busting |
| 2 | activeCampaignId inválido | 🔴 Alto | Fallback correto + limpeza do localStorage |
| 3 | useEffect dependência vazia | 🟡 Médio | Adicionado `[theme]` como dependência |
| 4 | Sem storage listener | 🟡 Médio | Listener para sincronização entre abas |

---

## 📁 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `vite.config.ts` | PWA workbox config + cache busting |
| `src/contexts/CampaignContext.tsx` | Storage listener + fallback + useEffect fix |

---

## ✅ Verificação

- TypeScript compilation sem erros
- PWA agora atualiza imediatamente após deploy
- Estado sincroniza entre abas
- IDs inválidos são limpos automaticamente

---

**Última atualização**: 2026-04-30  
**Status**: ✅ **CORRIGIDO**