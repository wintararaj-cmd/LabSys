import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI, invoiceAPI } from '../services/api';

/**
 * GlobalSearch — activated by Ctrl+K (or Cmd+K on Mac).
 * Searches patients and invoices in real-time.
 */
export default function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ patients: [], invoices: [] });
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Keyboard shortcut to open
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults({ patients: [], invoices: [] });
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults({ patients: [], invoices: [] });
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                const [pr, ir] = await Promise.all([
                    patientAPI.getAll({ search: query, limit: 5 }),
                    invoiceAPI.getAll({ mobile: query, limit: 5 }),
                ]);
                setResults({
                    patients: pr.data.patients || [],
                    invoices: ir.data.invoices || [],
                });
                setSelected(0);
            } catch (_) {
                // silently fail
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const allResults = [
        ...results.patients.map(p => ({ type: 'patient', ...p })),
        ...results.invoices.map(i => ({ type: 'invoice', ...i })),
    ];

    const handleSelect = (item) => {
        setOpen(false);
        if (item.type === 'patient') {
            navigate('/patients');
        } else {
            navigate('/billing');
        }
    };

    // Arrow key navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected(s => Math.min(s + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected(s => Math.max(s - 1, 0));
        } else if (e.key === 'Enter' && allResults[selected]) {
            handleSelect(allResults[selected]);
        }
    };

    if (!open) return (
        <button
            className="global-search-trigger"
            onClick={() => setOpen(true)}
            title="Search (Ctrl+K)"
        >
            <span className="gs-icon">🔍</span>
            <span className="gs-hint">Search...</span>
            <kbd className="gs-kbd">Ctrl K</kbd>
        </button>
    );

    return (
        <div className="gs-overlay" onClick={() => setOpen(false)}>
            <div className="gs-modal" onClick={e => e.stopPropagation()}>
                <div className="gs-input-row">
                    <span className="gs-search-icon">🔍</span>
                    <input
                        ref={inputRef}
                        className="gs-input"
                        placeholder="Search patients, invoices, phone numbers..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                    {loading && <span className="gs-spinner" />}
                    <button className="gs-close" onClick={() => setOpen(false)}>✕</button>
                </div>

                {allResults.length > 0 && (
                    <div className="gs-results">
                        {results.patients.length > 0 && (
                            <div className="gs-section">
                                <div className="gs-section-label">Patients</div>
                                {results.patients.map((p, i) => (
                                    <div
                                        key={`p-${p.id}`}
                                        className={`gs-item ${selected === i ? 'gs-item-active' : ''}`}
                                        onClick={() => handleSelect({ type: 'patient', ...p })}
                                        onMouseEnter={() => setSelected(i)}
                                    >
                                        <span className="gs-item-icon">🧑‍⚕️</span>
                                        <div className="gs-item-body">
                                            <div className="gs-item-title">{p.name}</div>
                                            <div className="gs-item-sub">UHID: {p.uhid} · {p.phone} · {p.gender}/{p.age}y</div>
                                        </div>
                                        <span className="gs-item-badge">Patient</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.invoices.length > 0 && (
                            <div className="gs-section">
                                <div className="gs-section-label">Invoices</div>
                                {results.invoices.map((inv, i) => {
                                    const idx = results.patients.length + i;
                                    return (
                                        <div
                                            key={`i-${inv.id}`}
                                            className={`gs-item ${selected === idx ? 'gs-item-active' : ''}`}
                                            onClick={() => handleSelect({ type: 'invoice', ...inv })}
                                            onMouseEnter={() => setSelected(idx)}
                                        >
                                            <span className="gs-item-icon">🧾</span>
                                            <div className="gs-item-body">
                                                <div className="gs-item-title">{inv.invoice_number} — {inv.patient_name}</div>
                                                <div className="gs-item-sub">₹{parseFloat(inv.net_amount).toFixed(2)} · {inv.payment_status}</div>
                                            </div>
                                            <span className="gs-item-badge">Invoice</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {query.length >= 2 && allResults.length === 0 && !loading && (
                    <div className="gs-empty">No results for "<strong>{query}</strong>"</div>
                )}

                <div className="gs-footer">
                    <span><kbd>↑↓</kbd> navigate</span>
                    <span><kbd>Enter</kbd> select</span>
                    <span><kbd>Esc</kbd> close</span>
                </div>
            </div>
        </div>
    );
}
