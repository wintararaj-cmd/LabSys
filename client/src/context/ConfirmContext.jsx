import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
        return new Promise((resolve) => {
            setDialog({ title, message, confirmText, cancelText, variant, resolve });
        });
    }, []);

    const handleConfirm = () => {
        dialog?.resolve(true);
        setDialog(null);
    };

    const handleCancel = () => {
        dialog?.resolve(false);
        setDialog(null);
    };

    const variantConfig = {
        danger: { icon: '🗑️', color: '#ef4444', bg: '#fef2f2', btnClass: 'confirm-btn-danger' },
        warning: { icon: '⚠️', color: '#f59e0b', bg: '#fffbeb', btnClass: 'confirm-btn-warning' },
        info: { icon: 'ℹ️', color: '#3b82f6', bg: '#eff6ff', btnClass: 'confirm-btn-info' },
    };

    const cfg = variantConfig[dialog?.variant] || variantConfig.danger;

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <div className="confirm-overlay" onClick={handleCancel}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon-wrap" style={{ background: cfg.bg }}>
                            <span className="confirm-icon">{cfg.icon}</span>
                        </div>
                        <h3 className="confirm-title">{dialog.title}</h3>
                        <p className="confirm-message">{dialog.message}</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn-cancel" onClick={handleCancel}>
                                {dialog.cancelText}
                            </button>
                            <button className={`confirm-btn ${cfg.btnClass}`} onClick={handleConfirm}>
                                {dialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
    return ctx;
}
