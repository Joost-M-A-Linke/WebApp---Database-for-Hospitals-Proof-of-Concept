USE `database_name`; -- Replace with your actual database name

-- INSERT admin user (password: provided by user)
INSERT INTO `users` (username, passwordHash, displayName, role, createdAt, updatedAt)
VALUES ('admin', '$2b$10$kyI6H.DTIQRpWiAWhnb/reC00f6hcURZuDPIcrCPLpR4D/JAdf0W.', 'Administrator', 'admin', NOW(), NOW());

-- To remove an old user, uncomment and replace OLD_USERNAME:
-- DELETE FROM users WHERE username = 'OLD_USERNAME';
