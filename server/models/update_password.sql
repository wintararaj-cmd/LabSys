-- Update password hash for admin user
-- Password: Test123!
UPDATE users 
SET password_hash = '$2a$10$sDZuR7BWXF4x9EoN3jyQ5.p9dylv83hoNbpwB5cvl1vFQTuiE3EbW' 
WHERE email = 'admin@citydiag.com';

-- Verify the update
SELECT email, role, is_active FROM users WHERE email = 'admin@citydiag.com';
