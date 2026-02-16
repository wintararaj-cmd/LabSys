-- 12. Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- INITIAL, ADD, REMOVE
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
