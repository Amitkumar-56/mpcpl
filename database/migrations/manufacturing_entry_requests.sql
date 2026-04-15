-- Manufacturing Entry Requests Table
-- Admin creates entry permission requests, Security Guard processes them
-- Created: 2026-04-14

CREATE TABLE IF NOT EXISTS mfg_entry_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(50) NOT NULL UNIQUE,
  vehicle_number VARCHAR(50) NOT NULL,
  driver_name VARCHAR(200) NULL,
  driver_phone VARCHAR(20) NULL,
  purpose VARCHAR(500) NULL,
  material_type VARCHAR(200) NULL,
  material_name VARCHAR(200) NULL,
  quantity DECIMAL(15,3) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  remarks TEXT NULL,
  
  -- OTP fields
  otp_code VARCHAR(10) NULL,
  otp_generated_at TIMESTAMP NULL,
  otp_verified TINYINT(1) DEFAULT 0,
  
  -- Status: pending (admin created), approved (security verified OTP), processing (inside), completed (exited)
  status ENUM('pending', 'approved', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
  
  -- Security Guard fields
  entry_photo TEXT NULL,
  exit_photo TEXT NULL,
  entry_location_lat DECIMAL(10,8) NULL,
  entry_location_lng DECIMAL(11,8) NULL,
  entry_location_name VARCHAR(300) NULL,
  exit_location_lat DECIMAL(10,8) NULL,
  exit_location_lng DECIMAL(11,8) NULL,
  exit_location_name VARCHAR(300) NULL,
  entry_time TIMESTAMP NULL,
  exit_time TIMESTAMP NULL,
  
  -- Who created / processed
  created_by INT NULL,
  created_by_name VARCHAR(200) NULL,
  processed_by INT NULL,
  processed_by_name VARCHAR(200) NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_mfg_entry_vehicle ON mfg_entry_requests(vehicle_number);
CREATE INDEX idx_mfg_entry_status ON mfg_entry_requests(status);
CREATE INDEX idx_mfg_entry_code ON mfg_entry_requests(request_code);
CREATE INDEX idx_mfg_entry_created_at ON mfg_entry_requests(created_at);
