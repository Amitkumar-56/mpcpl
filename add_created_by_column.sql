-- Add missing columns to filling_requests table
-- Check if columns exist before adding them to avoid errors

-- Add created_by column if it doesn't exist
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL COMMENT 'User ID who created the request';

-- Add area_name column if it doesn't exist  
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS area_name VARCHAR(255) DEFAULT NULL COMMENT 'Area name for location';

-- Add customer_lat column if it doesn't exist
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10,8) DEFAULT NULL COMMENT 'Customer latitude';

-- Add customer_lng column if it doesn't exist  
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(11,8) DEFAULT NULL COMMENT 'Customer longitude';

-- Check the final table structure
DESCRIBE filling_requests;
