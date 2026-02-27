import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { DarkModeProvider } from './context/DarkModeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <DarkModeProvider>
                <AuthProvider>
                    <ToastProvider>
                        <ConfirmProvider>
                            <App />
                        </ConfirmProvider>
                    </ToastProvider>
                </AuthProvider>
            </DarkModeProvider>
        </BrowserRouter>
    </React.StrictMode>
);
