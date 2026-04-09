-- Create vendors database table
-- Simple structure for name and phone only

CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(10) NOT NULL COMMENT 'Exactly 10 digits',
    status TINYINT(1) DEFAULT 1 COMMENT '1=active, 0=inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    -- Indexes for better performance
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    -- Constraint for phone number validation
    CONSTRAINT chk_phone_length CHECK (LENGTH(phone) = 10 AND phone REGEXP '^[0-9]{10}$')
);

-- Show table structure
DESCRIBE vendors;

-- Add sample data for testing (optional)
INSERT IGNORE INTO vendors (name, phone, created_by) VALUES
('Test Vendor 1', '9876543210', 1),
('Test Vendor 2', '9876543211', 1),
('Test Vendor 3', '9876543212', 1);

-- Show sample data
SELECT * FROM vendors ORDER BY created_at DESC;
