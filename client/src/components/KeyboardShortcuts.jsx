import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUT_SECTIONS = [
    {
        label: '🔍 Navigation',
        shortcuts: [
            { keys: ['Ctrl', 'K'], description: 'Open global search' },
            { keys: ['G', 'D'], description: 'Go to Dashboard' },
            { keys: ['G', 'B'], description: 'Go to Billing' },
            { keys: ['G', 'R'], description: 'Go to Reports' },
            { keys: ['G', 'P'], description: 'Go to Patients' },
            { keys: ['G', 'I'], description: 'Go to Inventory' },
            { keys: ['G', 'T'], description: 'Go to Test Master' },
            { keys: ['G', 'S'], description: 'Go to Settings' },
        ],
    },
    {
        label: '📋 Actions',
        shortcuts: [
            { keys: ['?'], description: 'Show keyboard shortcuts' },
            { keys: ['Esc'], description: 'Close modal / Cancel' },
            { keys: ['Ctrl', 'Enter'], description: 'Submit active form' },
            { keys: ['N'], description: 'New invoice (on Billing page)' },
            { keys: ['F'], description: 'Focus search / filter field' },
            { keys: ['R'], description: 'Refresh current data' },
        ],
    },
    {
        label: '🌙 Interface',
        shortcuts: [
            { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle dark mode' },
            { keys: ['↑', '↓'], description: 'Navigate search results' },
            { keys: ['Enter'], description: 'Select highlighted item' },
            { keys: ['Tab'], description: 'Move between form fields' },
        ],
    },
    {
        label: '📊 Reports & Export',
        shortcuts: [
            { keys: ['Ctrl', 'E'], description: 'Export current table to CSV' },
            { keys: ['Ctrl', 'P'], description: 'Print current page / invoice' },
        ],
    },
];

// Navigation shortcuts map (G + key)
const GO_MAP = {
    d: '/',
    b: '/billing',
    r: '/reports',
    p: '/patients',
    i: '/inventory',
    t: '/tests',
    s: '/settings',
};

export default function KeyboardShortcuts() {
    const [open, setOpen] = useState(false);
    const [gMode, setGMode] = useState(false);      // waiting for 2nd key after G
    const navigate = useNavigate();

    useEffect(() => {
        let gTimer = null;

        const handler = (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isTyping = ['input', 'textarea', 'select'].includes(tag) ||
                document.activeElement?.isContentEditable;

            // Always allow Ctrl+K (handled by GlobalSearch), Ctrl+Shift+D, Esc
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                document.documentElement.toggleAttribute('data-theme', true);
                const isDark = document.documentElement.hasAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
                // Let DarkModeContext handle state; just trigger the sidebar button
                document.querySelector('.dark-toggle-btn')?.click();
                return;
            }

            if (e.key === 'Escape') {
                setOpen(false);
                setGMode(false);
                return;
            }

            // Don't intercept while typing in inputs
            if (isTyping) return;

            // G + key navigation
            if (gMode) {
                clearTimeout(gTimer);
                setGMode(false);
                const dest = GO_MAP[e.key.toLowerCase()];
                if (dest) {
                    e.preventDefault();
                    navigate(dest);
                }
                return;
            }

            // Single-key shortcuts (not in inputs)
            if (e.key === '?') {
                e.preventDefault();
                setOpen(o => !o);
                return;
            }

            if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setGMode(true);
                // Auto-cancel G mode after 1.5s
                gTimer = setTimeout(() => setGMode(false), 1500);
                return;
            }

            if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
                // Trigger a custom event that pages can listen to for refresh
                window.dispatchEvent(new CustomEvent('labsys:refresh'));
                return;
            }

            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
                // Focus first visible search input on the page
                const searchInput = document.querySelector(
                    'input[type="search"], input[placeholder*="earch"], input[placeholder*="ilter"]'
                );
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                }
                return;
            }

            // Ctrl+E: export
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('labsys:export'));
                return;
            }
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
        };
    }, [gMode, navigate]);

    if (!open) {
        return (
            <button
                className="ks-fab"
                onClick={() => setOpen(true)}
                title="Keyboard Shortcuts (?)"
                aria-label="Show keyboard shortcuts"
            >
                <span className="ks-fab-icon">⌨️</span>
                <span className="ks-fab-label">Shortcuts</span>
            </button>
        );
    }

    return (
        <div className="ks-overlay" onClick={() => setOpen(false)}>
            <div className="ks-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="ks-header">
                    <div className="ks-title-row">
                        <span className="ks-title-icon">⌨️</span>
                        <h2 className="ks-title">Keyboard Shortcuts</h2>
                    </div>
                    <button className="ks-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
                </div>

                {/* Tip bar */}
                <div className="ks-tip">
                    Press <Kbd>?</Kbd> anywhere to toggle this panel · <Kbd>G</Kbd> then a key to navigate
                </div>

                {/* Shortcuts grid */}
                <div className="ks-body">
                    {SHORTCUT_SECTIONS.map(section => (
                        <div key={section.label} className="ks-section">
                            <div className="ks-section-label">{section.label}</div>
                            <div className="ks-list">
                                {section.shortcuts.map((s, i) => (
                                    <div key={i} className="ks-row">
                                        <span className="ks-desc">{s.description}</span>
                                        <span className="ks-keys">
                                            {s.keys.map((k, ki) => (
                                                <React.Fragment key={ki}>
                                                    {ki > 0 && <span className="ks-plus">+</span>}
                                                    <Kbd>{k}</Kbd>
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ks-footer">
                    <span>Press <Kbd>Esc</Kbd> to close</span>
                    <span className="ks-version">LabSys v1.0</span>
                </div>
            </div>
        </div>
    );
}

function Kbd({ children }) {
    return <kbd className="ks-kbd">{children}</kbd>;
}
