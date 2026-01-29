-- Add images column to filling_requests table
ALTER TABLE filling_requests ADD COLUMN images TEXT DEFAULT NULL;

-- Add remarks column if not exists
ALTER TABLE filling_requests ADD COLUMN remark TEXT DEFAULT NULL;

-- Add actual quantity column if not exists
ALTER TABLE filling_requests ADD COLUMN aqty DECIMAL(10,2) DEFAULT NULL;
