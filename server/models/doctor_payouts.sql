-- 11. Doctor Payouts
CREATE TABLE doctor_payouts (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id INT REFERENCES doctors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20), -- CASH, ONLINE, CHECK
    reference_number VARCHAR(50), -- Check No, Transaction ID
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
