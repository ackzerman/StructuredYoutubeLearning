import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const colors = {
    success: { bg: '#0c2a18', border: 'rgba(74,222,128,0.35)', color: '#4ade80' },
    error:   { bg: '#2a0c0c', border: 'rgba(248,113,113,0.35)', color: '#f87171' },
    info:    { bg: '#0e1a2a', border: 'rgba(19,197,180,0.35)',  color: '#13c5b4' },
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} className="toast" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{icons[t.type]}</span>
              {t.msg}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
