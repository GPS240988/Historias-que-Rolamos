import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSync } from '../../contexts/SyncContext';
import { Shield, KeyRound, User, X, Sparkles } from 'lucide-react';

interface CloudAuthModalProps {
  onClose: () => void;
}

export const CloudAuthModal: React.FC<CloudAuthModalProps> = ({ onClose }) => {
  const { login, register } = useSync();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor, digite o nome de usuário e a senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#000000]/85 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-sm bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-6 relative animate-fade-in text-sm font-serif">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
          disabled={loading}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <Shield className="w-10 h-10 text-medieval-gold mx-auto mb-2 drop-shadow-md" />
          <h4 className="text-lg font-medieval font-bold tracking-widest text-medieval-gold uppercase leading-none">
            {isLogin ? 'Manuscritos na Nuvem' : 'Nova Linha do Tempo'}
          </h4>
          <p className="text-[10px] text-medieval-silver mt-1.5 leading-relaxed">
            {isLogin
              ? 'Conecte-se para sincronizar seus grimórios e compartilhar histórias.'
              : 'Registre sua assinatura para iniciar manuscritos compartilhados.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-xs text-justify">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Assinatura (Usuário)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: MestreValkaria, PlayerArkon"
              className="medieval-input text-xs"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Chave de Entrada (Senha)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a palavra secreta..."
              className="medieval-input text-xs"
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold py-2 text-xs flex justify-center items-center space-x-2 cursor-pointer mt-4"
          >
            {loading ? (
              <Sparkles className="w-4 h-4 text-medieval-stone animate-pulse" />
            ) : isLogin ? (
              'Destrancar Grimório'
            ) : (
              'Registrar Assinatura'
            )}
          </button>
        </form>

        {/* Tab Toggle Link */}
        <div className="text-center mt-5 pt-3 border-t border-medieval-gold/15 text-[10px] text-medieval-silver">
          {isLogin ? (
            <span>
              Ainda não possui uma conta?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className="text-medieval-gold hover:text-medieval-brightGold underline focus:outline-none transition-colors duration-200"
                disabled={loading}
              >
                Escrever Assinatura
              </button>
            </span>
          ) : (
            <span>
              Já possui assinatura?{' '}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className="text-medieval-gold hover:text-medieval-brightGold underline focus:outline-none transition-colors duration-200"
                disabled={loading}
              >
                Conectar Conta
              </button>
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
