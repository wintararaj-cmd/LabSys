import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Tests from './pages/Tests';
import Doctors from './pages/Doctors';
import Inventory from './pages/Inventory';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import Brochure from './pages/Brochure';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return user ? children : <Navigate to="/login" />;
}

function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
            <Route path="/promote" element={<Brochure />} />

            <Route path="/" element={
                <PrivateRoute>
                    <Layout />
                </PrivateRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="patients" element={<Patients />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="tests" element={<Tests />} />
                <Route path="doctors" element={<Doctors />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="branches" element={<Branches />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
