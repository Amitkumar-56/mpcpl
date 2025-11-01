-- SQL script to fix database structure for credit days feature
-- Run this in your MySQL database

-- Fix customers table ID to be AUTO_INCREMENT
ALTER TABLE customers MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT;

-- Add credit_days column if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_days INT DEFAULT 7 COMMENT 'Number of credit days for credit customers';

-- Fix customer_balances table ID to be AUTO_INCREMENT  
ALTER TABLE customer_balances MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Add missing columns to customer_balances
ALTER TABLE customer_balances ADD COLUMN IF NOT EXISTS limit_expiry DATE NULL COMMENT 'Credit limit expiry date for credit days customers';
ALTER TABLE customer_balances ADD COLUMN IF NOT EXISTS last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time credit was reset';
ALTER TABLE customer_balances ADD COLUMN IF NOT EXISTS validity_days INT DEFAULT 7 COMMENT 'Credit validity days';

-- Test the fix by showing table structures
DESCRIBE customers;
DESCRIBE customer_balances;