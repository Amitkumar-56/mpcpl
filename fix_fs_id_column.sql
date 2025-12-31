-- Fix fs_id column type to store comma-separated station IDs
-- Run this SQL in your MySQL database

-- Current column type: fs_id int(11) - This can only store single integers!
-- We need to change it to VARCHAR(255) to store comma-separated values like "2,3,4,5,6,7"

-- Step 1: Check current column type (optional)
-- DESCRIBE employee_profile;

-- Step 2: Change fs_id column from INT(11) to VARCHAR(255)
-- This will allow storing comma-separated station IDs
ALTER TABLE employee_profile 
MODIFY COLUMN fs_id VARCHAR(255) DEFAULT NULL;

-- Step 3: Verify the change
-- DESCRIBE employee_profile;
-- fs_id should now show as varchar(255)

-- Note: 
-- - Existing data will be automatically converted
-- - Single numbers will become strings (e.g., 2 becomes "2")
-- - This is correct and will work with comma-separated values like "2,3,4,5,6,7"
-- - After running this, create/edit employees with multiple stations will work correctly

