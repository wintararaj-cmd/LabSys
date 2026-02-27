import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

let _idCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 380);
    }, []);

    const add = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++_idCounter;
        setToasts(prev => [...prev, { id, message, type, exiting: false }]);
        if (duration > 0) setTimeout(() => remove(id), duration);
        return id;
    }, [remove]);

    const toast = {
        success: (msg, dur) => add(msg, 'success', dur),
        error:   (msg, dur) => add(msg, 'error', dur ?? 6000),
        warning: (msg, dur) => add(msg, 'warning', dur),
        info:    (msg, dur) => add(msg, 'info', dur),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={remove} />
        </ToastContext.Provider>
    );
}

const ICONS = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
};

function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-container" aria-live="polite">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
                    role="alert"
                >
                    <span className={`toast-icon toast-icon-${t.type}`}>{ICONS[t.type]}</span>
                    <span className="toast-message">{t.message}</span>
                    <button className="toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss">×</button>
                    <div className={`toast-progress toast-progress-${t.type}`} />
                </div>
            ))}
        </div>
    );
}
