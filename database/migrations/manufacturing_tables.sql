-- Manufacturing Module Database Tables
-- Created: 2026-04-14

-- 1. Raw Materials Master Table
CREATE TABLE IF NOT EXISTS mfg_raw_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_code VARCHAR(50) NOT NULL UNIQUE,
  material_name VARCHAR(200) NOT NULL,
  category ENUM('type_a_raw', 'other_raw') NOT NULL DEFAULT 'type_a_raw',
  unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
  current_stock DECIMAL(15,3) DEFAULT 0,
  min_stock_level DECIMAL(15,3) DEFAULT 0,
  supplier_id INT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Finished Goods Master Table
CREATE TABLE IF NOT EXISTS mfg_finished_goods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NULL,
  unit ENUM('kg', 'litre', 'pcs', 'box') NOT NULL DEFAULT 'kg',
  current_stock DECIMAL(15,3) DEFAULT 0,
  batch_id INT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Manufacturing Batches Table
CREATE TABLE IF NOT EXISTS mfg_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  batch_date DATE NOT NULL,
  product_name VARCHAR(200) NULL,
  target_quantity DECIMAL(15,3) DEFAULT 0,
  actual_quantity DECIMAL(15,3) DEFAULT 0,
  unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
  status ENUM('draft', 'in_process', 'testing', 'completed', 'rejected') DEFAULT 'draft',
  notes TEXT NULL,
  created_by INT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Batch Materials (raw materials used per batch)
CREATE TABLE IF NOT EXISTS mfg_batch_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  material_id INT NOT NULL,
  material_name VARCHAR(200) NULL,
  quantity_used DECIMAL(15,3) DEFAULT 0,
  unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES mfg_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES mfg_raw_materials(id) ON DELETE CASCADE
);

-- 5. Tanker Allocation Table
CREATE TABLE IF NOT EXISTS mfg_tanker_allocation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanker_code VARCHAR(100) NOT NULL,
  tanker_type ENUM('type_a_raw', 'other_raw') NOT NULL DEFAULT 'type_a_raw',
  material_id INT NULL,
  material_name VARCHAR(200) NULL,
  batch_id INT NULL,
  quantity DECIMAL(15,3) DEFAULT 0,
  unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
  driver_name VARCHAR(200) NULL,
  vehicle_number VARCHAR(50) NULL,
  allocation_date DATE NOT NULL,
  status ENUM('allocated', 'in_transit', 'arrived', 'unloaded', 'completed') DEFAULT 'allocated',
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES mfg_raw_materials(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES mfg_batches(id) ON DELETE SET NULL
);

-- 6. Lab Testing Table
CREATE TABLE IF NOT EXISTS mfg_lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_code VARCHAR(50) NOT NULL UNIQUE,
  batch_id INT NOT NULL,
  batch_code VARCHAR(50) NULL,
  test_method VARCHAR(200) NOT NULL,
  test_date DATE NOT NULL,
  tested_by VARCHAR(200) NULL,
  parameters TEXT NULL,
  result_value VARCHAR(200) NULL,
  result_status ENUM('pending', 'pass', 'fail', 'retest') DEFAULT 'pending',
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES mfg_batches(id) ON DELETE CASCADE
);

-- 7. Security Gate Entry/Exit Table
CREATE TABLE IF NOT EXISTS security_gate_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_code VARCHAR(50) NOT NULL UNIQUE,
  tanker_code VARCHAR(100) NULL,
  vehicle_number VARCHAR(50) NOT NULL,
  driver_name VARCHAR(200) NULL,
  driver_phone VARCHAR(20) NULL,
  material_type VARCHAR(200) NULL,
  material_name VARCHAR(200) NULL,
  quantity DECIMAL(15,3) DEFAULT 0,
  unit ENUM('kg', 'litre') DEFAULT 'kg',
  direction ENUM('entry', 'exit') NOT NULL,
  entry_time TIMESTAMP NULL,
  exit_time TIMESTAMP NULL,
  entry_photo TEXT NULL,
  exit_photo TEXT NULL,
  gate_status ENUM('arrived', 'under_processing', 'ready_to_exit', 'exited') DEFAULT 'arrived',
  purpose VARCHAR(200) NULL,
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_mfg_raw_materials_category ON mfg_raw_materials(category);
CREATE INDEX idx_mfg_raw_materials_status ON mfg_raw_materials(status);
CREATE INDEX idx_mfg_batches_status ON mfg_batches(status);
CREATE INDEX idx_mfg_batches_date ON mfg_batches(batch_date);
CREATE INDEX idx_mfg_tanker_allocation_status ON mfg_tanker_allocation(status);
CREATE INDEX idx_mfg_tanker_allocation_date ON mfg_tanker_allocation(allocation_date);
CREATE INDEX idx_mfg_lab_tests_batch ON mfg_lab_tests(batch_id);
CREATE INDEX idx_mfg_lab_tests_status ON mfg_lab_tests(result_status);
CREATE INDEX idx_security_gate_status ON security_gate_entries(gate_status);
CREATE INDEX idx_security_gate_vehicle ON security_gate_entries(vehicle_number);
CREATE INDEX idx_security_gate_direction ON security_gate_entries(direction);
