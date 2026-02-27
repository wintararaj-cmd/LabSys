import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
    { icon: '💰', title: 'Billing & Invoicing', desc: 'Generate invoices, track payments, process refunds instantly' },
    { icon: '📄', title: 'Report Management', desc: 'Enter results, verify and print patient reports with ease' },
    { icon: '📊', title: 'Live Dashboard', desc: 'Real-time collection, pending dues, and inventory alerts' },
    { icon: '🧪', title: 'Test Master', desc: 'Manage test catalogue, pricing and department mapping' },
    { icon: '📦', title: 'Inventory Tracking', desc: 'Stock levels, reorder alerts, expiry tracking' },
    { icon: '📈', title: 'Financial Reports', desc: 'GST, cash book, doctor commissions and sale reports' },
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [featureIdx, setFeatureIdx] = useState(0);
    const emailRef = useRef(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Cycle through feature highlights
    useEffect(() => {
        const t = setInterval(() => {
            setFeatureIdx(i => (i + 1) % FEATURES.length);
        }, 3500);
        return () => clearInterval(t);
    }, []);

    // Auto-focus email
    useEffect(() => { emailRef.current?.focus(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(email, password);
        if (result.success) {
            navigate('/', { replace: true });
        } else {
            setError(result.error || 'Invalid credentials. Please try again.');
            setLoading(false);
        }
    };

    const fillDemo = () => {
        setEmail('admin@citydiag.com');
        setPassword('Test123!');
    };

    return (
        <div className="lp-root">
            {/* Left panel — branding */}
            <div className="lp-left" aria-hidden="true">
                {/* Animated background orbs */}
                <div className="lp-orb lp-orb-1" />
                <div className="lp-orb lp-orb-2" />
                <div className="lp-orb lp-orb-3" />

                <div className="lp-brand">
                    <div className="lp-brand-logo">
                        <span className="lp-brand-icon">🧪</span>
                        <span className="lp-brand-name">LabSys</span>
                    </div>
                    <p className="lp-brand-tagline">
                        Next-generation pathology lab management — built for modern diagnostics centres.
                    </p>
                </div>

                {/* Rotating feature highlight */}
                <div className="lp-features">
                    <div className="lp-feature-card" key={featureIdx}>
                        <div className="lp-feature-icon">{FEATURES[featureIdx].icon}</div>
                        <div>
                            <div className="lp-feature-title">{FEATURES[featureIdx].title}</div>
                            <div className="lp-feature-desc">{FEATURES[featureIdx].desc}</div>
                        </div>
                    </div>

                    {/* Dots indicator */}
                    <div className="lp-dots">
                        {FEATURES.map((_, i) => (
                            <button
                                key={i}
                                className={`lp-dot ${i === featureIdx ? 'lp-dot-active' : ''}`}
                                onClick={() => setFeatureIdx(i)}
                                aria-label={`Feature ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="lp-stats-row">
                    <div className="lp-stat"><strong>10+</strong><span>Modules</span></div>
                    <div className="lp-stat-divider" />
                    <div className="lp-stat"><strong>100%</strong><span>Offline-ready</span></div>
                    <div className="lp-stat-divider" />
                    <div className="lp-stat"><strong>∞</strong><span>Patients</span></div>
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="lp-right">
                <div className="lp-form-wrap">
                    {/* Mobile logo */}
                    <div className="lp-mobile-logo">
                        <span>🧪</span> LabSys
                    </div>

                    <div className="lp-form-header">
                        <h1 className="lp-form-title">Welcome back</h1>
                        <p className="lp-form-sub">Sign in to your lab management dashboard</p>
                    </div>

                    {error && (
                        <div className="lp-error" role="alert">
                            <span className="lp-error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="lp-form" noValidate>
                        <div className="lp-field">
                            <label className="lp-label" htmlFor="login-email">Email address</label>
                            <div className="lp-input-wrap">
                                <span className="lp-input-icon">📧</span>
                                <input
                                    id="login-email"
                                    ref={emailRef}
                                    type="email"
                                    className="lp-input"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@lab.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="lp-field">
                            <label className="lp-label" htmlFor="login-pwd">Password</label>
                            <div className="lp-input-wrap">
                                <span className="lp-input-icon">🔒</span>
                                <input
                                    id="login-pwd"
                                    type={showPwd ? 'text' : 'password'}
                                    className="lp-input"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="lp-show-pwd"
                                    onClick={() => setShowPwd(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                                >
                                    {showPwd ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="lp-submit"
                            disabled={loading}
                            id="login-submit-btn"
                        >
                            {loading ? (
                                <>
                                    <span className="lp-spinner" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign in to LabSys
                                    <span className="lp-submit-arrow">→</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo credentials */}
                    <div className="lp-demo">
                        <div className="lp-demo-label">
                            <span className="lp-demo-badge">DEMO</span>
                            <span>Try the system without a real account</span>
                        </div>
                        <button className="lp-demo-fill" onClick={fillDemo}>
                            ⚡ Fill demo credentials
                        </button>
                    </div>

                    <div className="lp-register">
                        New laboratory? <Link to="/register">Register your clinic →</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
