import React, { createContext, useContext, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  /** If set, the modal shows an input field and the user must type this exact value to confirm. */
  requiredInput?: string;
  /** Placeholder for the input field when requiredInput is set. */
  inputPlaceholder?: string;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const [inputValue, setInputValue] = useState('');
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setInputValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    if (options.requiredInput && inputValue !== options.requiredInput) {
      return; // Don't close — user hasn't typed the required keyword
    }
    setIsOpen(false);
    setInputValue('');
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setInputValue('');
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  const isConfirmDisabled = !!options.requiredInput && inputValue !== options.requiredInput;

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-[#000000]/85 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="w-full max-w-sm bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in text-sm font-serif">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-2 mb-3">
                <h4 className="text-sm font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-medieval-gold" />
                  <span>{options.title}</span>
                </h4>
                <button
                  onClick={handleCancel}
                  className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message */}
              <p className="text-xs text-medieval-parchment leading-relaxed text-justify mb-5 whitespace-pre-line">
                {options.message}
              </p>

              {/* Optional input field for dangerous confirmations */}
              {options.requiredInput && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={options.inputPlaceholder || `Digite "${options.requiredInput}" para confirmar`}
                    className="w-full bg-medieval-stone/40 border border-medieval-gold/20 rounded px-3 py-2 text-xs text-medieval-parchment placeholder:text-medieval-silver/50 focus:border-medieval-gold/50 focus:outline-none transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm();
                      if (e.key === 'Escape') handleCancel();
                    }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 border-t border-medieval-gold/10 pt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-stone py-1.5 px-4 text-xs cursor-pointer"
                >
                  {options.cancelLabel || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={`${
                    options.isDestructive
                      ? 'bg-medieval-wine/80 hover:bg-medieval-wine border border-red-500/30 text-red-200 hover:text-white'
                      : 'btn-gold'
                  } py-1.5 px-4 text-xs rounded transition-all cursor-pointer ${
                    isConfirmDisabled ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  {options.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};
