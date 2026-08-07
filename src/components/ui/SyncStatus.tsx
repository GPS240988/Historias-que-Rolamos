import React, { useState } from 'react';
import { useSync } from '../../contexts/SyncContext';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { SyncConflictResolver } from './SyncConflictResolver';
import { CloudAuthModal } from './CloudAuthModal';

export const SyncStatus: React.FC = () => {
  const { status, error, isAuthenticated, syncNow, conflicts } = useSync();
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: RefreshCw,
          colorClass: 'text-medieval-gold animate-spin',
          title: 'Sincronizando com a Nuvem...',
          bgClass: 'bg-medieval-gold/10'
        };
      case 'conflict':
        return {
          icon: ShieldAlert,
          colorClass: 'text-red-500 animate-pulse',
          title: 'Conflito de Sincronização Encontrado!',
          bgClass: 'bg-red-500/10'
        };
      case 'pending':
        return {
          icon: AlertTriangle,
          colorClass: 'text-yellow-500 animate-pulse',
          title: 'Alterações Pendentes para Sincronizar',
          bgClass: 'bg-yellow-500/10'
        };
      case 'synced':
      default:
        return {
          icon: Cloud,
          colorClass: 'text-medieval-gold hover:text-medieval-brightGold',
          title: 'Grimório Sincronizado',
          bgClass: 'bg-medieval-gold/5'
        };
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="p-1.5 rounded hover:bg-medieval-charcoal hover:scale-105 text-medieval-silver/50 hover:text-medieval-gold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-medieval-gold/30 flex items-center space-x-1"
          title="Conectar Grimório à Nuvem (Offline)"
        >
          <CloudOff className="w-4 h-4" />
          <span className="text-[9px] font-medieval uppercase tracking-wider hidden sm:inline">Offline</span>
        </button>
        {isAuthOpen && <CloudAuthModal onClose={() => setIsAuthOpen(false)} />}
      </>
    );
  }

  const config = getStatusConfig();
  const Icon = config.icon;

  const handleClick = () => {
    if (status === 'conflict') {
      setIsConflictOpen(true);
    } else {
      syncNow();
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`p-1.5 rounded hover:bg-medieval-charcoal hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-medieval-gold/30 flex items-center space-x-1.5 ${config.bgClass}`}
        title={error ? `${config.title} (Erro: ${error})` : config.title}
      >
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
        {status === 'conflict' && (
          <span className="text-[8px] bg-red-600 text-white font-medieval px-1 rounded-full text-center leading-none min-w-[14px] h-[14px] flex items-center justify-center">
            {conflicts.length}
          </span>
        )}
        <span className="text-[9px] font-medieval uppercase tracking-wider hidden sm:inline text-medieval-gold">
          {status === 'synced' ? 'Nuvem' : status === 'syncing' ? 'Sincronizando' : status === 'conflict' ? 'Conflito' : 'Pendente'}
        </span>
      </button>

      {isConflictOpen && <SyncConflictResolver onClose={() => setIsConflictOpen(false)} />}
    </>
  );
};
