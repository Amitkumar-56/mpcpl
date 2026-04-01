-- Add completion location columns to filling_requests table
-- These will store area name and coordinates when request is completed

-- Add completed_area_name column if it doesn't exist
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS completed_area_name VARCHAR(255) DEFAULT NULL COMMENT 'Area name where request was completed';

-- Add completed_lat column if it doesn't exist  
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS completed_lat DECIMAL(10,8) DEFAULT NULL COMMENT 'Latitude where request was completed';

-- Add completed_lng column if it doesn't exist
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS completed_lng DECIMAL(11,8) DEFAULT NULL COMMENT 'Longitude where request was completed';

-- Add completed_by_employee_id column if it doesn't exist (to track who completed)
ALTER TABLE filling_requests ADD COLUMN IF NOT EXISTS completed_by_employee_id INT DEFAULT NULL COMMENT 'Employee ID who completed the request';

-- Check the final table structure
DESCRIBE filling_requests;
