-- Add employee name columns to filling_logs table
-- Run this script to fix the "Unknown column" error

-- Add the missing name columns
ALTER TABLE filling_logs 
ADD COLUMN created_by_name VARCHAR(255) DEFAULT NULL AFTER created_by,
ADD COLUMN processed_by_name VARCHAR(255) DEFAULT NULL AFTER processed_by,
ADD COLUMN completed_by_name VARCHAR(255) DEFAULT NULL AFTER completed_by,
ADD COLUMN cancelled_by_name VARCHAR(255) DEFAULT NULL AFTER cancelled_by,
ADD COLUMN updated_by_name VARCHAR(255) DEFAULT NULL AFTER updated_by;

-- Show the updated table structure
DESCRIBE filling_logs;
