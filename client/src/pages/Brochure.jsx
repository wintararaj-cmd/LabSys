import React from 'react';
import { Link } from 'react-router-dom';
import './Brochure.css';

const Brochure = () => {
    return (
        <div className="brochure-container">
            {/* Navigation */}
            <nav className="br-nav">
                <div className="br-logo">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
                        <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2563eb" />
                                <stop offset="1" stopColor="#0ea5e9" />
                            </linearGradient>
                        </defs>
                    </svg>
                    Lab<span>Sys</span>
                </div>
                <div className="br-nav-links">
                    <a href="#features">Features</a>
                    <a href="#stats">Impact</a>
                    <a href="#pricing">Pricing</a>
                    <button onClick={() => window.print()} className="br-btn-outline" style={{ background: 'transparent', cursor: 'pointer' }}>Print</button>
                    <Link to="/login" className="br-btn-outline">Login</Link>
                    <Link to="/register" className="br-cta-btn">Get Started</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="br-hero">
                <div className="br-hero-content">
                    <span className="br-section-tag">Next-Gen Lab Management</span>
                    <h1>Empower Your Pathology Lab with <span>LabSys</span></h1>
                    <p>
                        The all-in-one SaaS platform designed to streamline diagnostic workflows,
                        automate billing, and deliver professional reports with lightning speed.
                    </p>
                    <div className="br-hero-btns">
                        <Link to="/register" className="br-cta-btn">Start Free Trial</Link>
                        <a href="#features" className="br-btn-outline">Explore Features</a>
                    </div>
                </div>
                <div className="br-hero-image">
                    <div className="br-hero-card">
                        <div className="br-hero-mockup">
                            <div style={{ height: '300px', background: 'var(--br-gradient)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', textAlign: 'center', padding: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                                    <h3>Advanced Analytics Dashboard</h3>
                                    <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Real-time insights at your fingertips</p>
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ height: '80px', background: '#f1f5f9', borderRadius: '12px', padding: '15px' }}>
                                    <div style={{ width: '40%', height: '8px', background: '#cbd5e1', borderRadius: '4px', marginBottom: '8px' }}></div>
                                    <div style={{ width: '80%', height: '12px', background: 'var(--br-primary)', borderRadius: '4px' }}></div>
                                </div>
                                <div style={{ height: '80px', background: '#f1f5f9', borderRadius: '12px', padding: '15px' }}>
                                    <div style={{ width: '40%', height: '8px', background: '#cbd5e1', borderRadius: '4px', marginBottom: '8px' }}></div>
                                    <div style={{ width: '60%', height: '12px', background: 'var(--br-accent)', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="br-features">
                <span className="br-section-tag">Powerful Capabilities</span>
                <h2>Everything You Need to Scale</h2>
                <div className="br-feature-grid">
                    <div className="br-feature-card">
                        <div className="br-feature-icon">💰</div>
                        <h3>Smart Billing</h3>
                        <p>GST-compliant invoicing with automated calculations for CGST, SGST, and IGST. Seamlessly handle discounts and multiple payment modes.</p>
                    </div>
                    <div className="br-feature-card">
                        <div className="br-feature-icon">📝</div>
                        <h3>Instant Reports</h3>
                        <p>Generate professional PDF reports with QR code verification and automatic abnormal value detection tailored to gender-specific ranges.</p>
                    </div>
                    <div className="br-feature-card">
                        <div className="br-feature-icon">📦</div>
                        <h3>Inventory 2.0</h3>
                        <p>Never run out of reagents. Track stock levels, batch numbers, and receive automated alerts for low stock and expiring items.</p>
                    </div>
                    <div className="br-feature-card">
                        <div className="br-feature-icon">🛡️</div>
                        <h3>SaaS Security</h3>
                        <p>Enterprise-grade multi-tenant isolation ensuring your lab data is private, secure, and always available on the cloud.</p>
                    </div>
                    <div className="br-feature-card">
                        <div className="br-feature-icon">👨‍⚕️</div>
                        <h3>Doctor Portal</h3>
                        <p>Manage referral networks with ease. Track doctor commissions and generate detailed referral analytics automatically.</p>
                    </div>
                    <div className="br-feature-card">
                        <div className="br-feature-icon">📱</div>
                        <h3>Multi-Branch</h3>
                        <p>Manage multiple collection centers and laboratory branches from a single unified admin dashboard with granular access control.</p>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="br-stats">
                <div className="br-stat-item">
                    <h4>500+</h4>
                    <p>Labs Onboarded</p>
                </div>
                <div className="br-stat-item">
                    <h4>1M+</h4>
                    <p>Reports Generated</p>
                </div>
                <div className="br-stat-item">
                    <h4>99.9%</h4>
                    <p>Uptime Record</p>
                </div>
                <div className="br-stat-item">
                    <h4>4.9/5</h4>
                    <p>User Satisfaction</p>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="br-pricing">
                <span className="br-section-tag">Flexible Plans</span>
                <h2>Pricing That Grows With You</h2>
                <div className="br-pricing-grid">
                    {/* Starter Plan */}
                    <div className="br-price-card">
                        <div className="br-price-header">
                            <h3>Starter Plan</h3>
                            <div className="br-price">₹0<span>/mo</span></div>
                            <p style={{ color: 'var(--br-text-muted)', marginBottom: '30px' }}>Perfect for new laboratories starting their digital journey.</p>
                        </div>
                        <ul className="br-price-features">
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Up to 100 Invoices/mo</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Single User Access</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Basic Report Templates</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Email Support</li>
                        </ul>
                        <Link to="/register" className="br-price-btn">Get Started</Link>
                    </div>

                    {/* Growth Plan - Featured */}
                    <div className="br-price-card featured">
                        <div className="br-price-header">
                            <h3>Growth Plan</h3>
                            <div className="br-price" style={{ color: 'white' }}>₹2,999<span>/mo</span></div>
                            <p style={{ opacity: 0.7, marginBottom: '30px' }}>Advanced features for scaling pathology labs and clinics.</p>
                        </div>
                        <ul className="br-price-features">
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> 1,000 Invoices/mo</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Up to 5 User Accounts</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Custom Branding</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> WhatsApp Integration</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Priority Support</li>
                        </ul>
                        <Link to="/register" className="br-price-btn">Start 14-Day Trial</Link>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="br-price-card">
                        <div className="br-price-header">
                            <h3>Enterprise</h3>
                            <div className="br-price">₹9,999<span>/mo</span></div>
                            <p style={{ color: 'var(--br-text-muted)', marginBottom: '30px' }}>Comprehensive solution for multi-branch laboratory chains.</p>
                        </div>
                        <ul className="br-price-features">
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Unlimited Invoices</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Unlimited Users & Branches</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Full API Access</li>
                            <li><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Dedicated Account Manager</li>
                        </ul>
                        <Link to="/register" className="br-price-btn">Contact Sales</Link>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="br-final-cta">
                <div className="br-cta-box">
                    <h2>Ready to Modernize Your Lab?</h2>
                    <p>Join hundreds of pathology labs who have already transformed their operations with LabSys.</p>
                    <Link to="/register" className="br-cta-btn" style={{ padding: '20px 40px', fontSize: '1.2rem' }}>Get Started Today</Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="br-footer">
                <div className="br-footer-grid">
                    <div className="br-footer-info">
                        <h4>LabSys</h4>
                        <p>The leading cloud-based pathology laboratory management system built for precision and speed.</p>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                            <span style={{ cursor: 'pointer', opacity: 0.6 }}>Twitter</span>
                            <span style={{ cursor: 'pointer', opacity: 0.6 }}>LinkedIn</span>
                            <span style={{ cursor: 'pointer', opacity: 0.6 }}>Facebook</span>
                        </div>
                    </div>
                    <div className="br-footer-links">
                        <h5>Product</h5>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#stats">Success Stories</a></li>
                        </ul>
                    </div>
                    <div className="br-footer-links">
                        <h5>Company</h5>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>
                    <div className="br-footer-links">
                        <h5>Legal</h5>
                        <ul>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">GST Compliance</a></li>
                        </ul>
                    </div>
                </div>
                <div className="br-footer-bottom">
                    &copy; 2026 LabSys Platform. All rights reserved. Professional Lab Management Excellence.
                </div>
            </footer>
        </div>
    );
};

export default Brochure;
