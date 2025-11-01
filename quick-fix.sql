-- Quick fix for AUTO_INCREMENT issues
-- Run these commands in your MySQL database

-- Fix customers table
ALTER TABLE customers MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT;

-- Fix customer_balances table  
ALTER TABLE customer_balances MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Fix customer_permissions table
ALTER TABLE customer_permissions MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Add credit_days column
ALTER TABLE customers ADD COLUMN credit_days INT DEFAULT 7;

-- Add columns to customer_balances
ALTER TABLE customer_balances ADD COLUMN limit_expiry DATE NULL;
ALTER TABLE customer_balances ADD COLUMN validity_days INT DEFAULT 7;