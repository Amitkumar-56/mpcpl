-- ============================================================
-- 🌾 FARMING CRM DATABASE SCHEMA
-- Run this SQL in your MySQL database to create all tables
-- Database: masafipetro_dev (or your configured DB_NAME)
-- ============================================================

-- 1. Animal Categories Master
CREATE TABLE IF NOT EXISTS farming_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default categories
INSERT IGNORE INTO farming_categories (name, type, description, icon) VALUES
('Dairy Cow', 'cow', 'Milk producing cows / दूध देने वाली गाय', '🐄'),
('Beef Cow', 'cow', 'Meat producing cows', '🐂'),
('Bull', 'cow', 'Breeding bulls / सांड', '🐂'),
('Dairy Goat', 'goat', 'Milk producing goats / दूध देने वाली बकरी', '🐐'),
('Meat Goat', 'goat', 'Meat producing goats / मांस वाली बकरी', '🐐'),
('Broiler Chicken', 'chicken', 'Meat chicken / ब्रायलर मुर्गी', '🐔'),
('Layer Chicken', 'chicken', 'Egg laying chicken / अंडे वाली मुर्गी', '🐔'),
('Desi Chicken', 'chicken', 'Country chicken / देसी मुर्गी', '🐓'),
('Freshwater Fish', 'fish', 'Pond fish / तालाब मछली', '🐟'),
('Marine Fish', 'fish', 'Sea fish / समुद्री मछली', '🐟'),
('Honey Bee Colony', 'honey', 'Bee hive colony / मधुमक्खी कॉलोनी', '🍯');

-- 2. Animals Master (Main Registry)
CREATE TABLE IF NOT EXISTS farming_animals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag_id VARCHAR(100) UNIQUE NOT NULL COMMENT 'Auto-generated: COW-F-0001, GOAT-M-0012',
  barcode VARCHAR(200) COMMENT 'Auto-generated: FARM-COW-F0001-123456',
  name VARCHAR(150) COMMENT 'Animal name',
  category_id INT COMMENT 'FK to farming_categories',
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  breed VARCHAR(150) COMMENT 'Breed name / नस्ल',
  gender ENUM('male','female','unknown') DEFAULT 'unknown',
  date_of_birth DATE COMMENT 'Date of birth / जन्म तिथि',
  weight DECIMAL(10,2) COMMENT 'Current weight in kg',
  color VARCHAR(100) COMMENT 'Color / रंग',
  mother_id INT COMMENT 'FK to farming_animals (mother / माता)',
  father_id INT COMMENT 'FK to farming_animals (father / पिता)',
  batch_id INT COMMENT 'FK to farming_batches',
  purchase_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Purchase price / खरीद कीमत',
  source VARCHAR(200) COMMENT 'Where purchased from / कहाँ से आया',
  health_status ENUM('healthy','sick','treatment','quarantine','deceased') DEFAULT 'healthy',
  status ENUM('active','sold','deceased','transferred') DEFAULT 'active',
  photo_url TEXT COMMENT 'Photo URL',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mother_id) REFERENCES farming_animals(id) ON DELETE SET NULL,
  FOREIGN KEY (father_id) REFERENCES farming_animals(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_batch (batch_id),
  INDEX idx_health (health_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Batches (Group animals)
CREATE TABLE IF NOT EXISTS farming_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(100) UNIQUE NOT NULL COMMENT 'Auto-generated batch code',
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  batch_name VARCHAR(200) NOT NULL COMMENT 'Batch name / बैच का नाम',
  total_count INT DEFAULT 0 COMMENT 'Total animals in batch',
  start_date DATE COMMENT 'Batch start date',
  status ENUM('active','completed','cancelled') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Inward Register (Animals/Stock coming IN)
CREATE TABLE IF NOT EXISTS farming_inward (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  animal_id INT COMMENT 'FK to farming_animals (optional)',
  batch_id INT COMMENT 'FK to farming_batches (optional)',
  inward_type ENUM('purchase','birth','transfer_in','return','gift') NOT NULL COMMENT 'खरीद/जन्म/ट्रांसफर',
  quantity INT DEFAULT 1 COMMENT 'Number of animals/items',
  weight DECIMAL(10,2) COMMENT 'Total weight in kg',
  unit_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Price per unit / प्रति इकाई कीमत',
  total_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Total price / कुल कीमत',
  supplier_name VARCHAR(200) COMMENT 'Supplier/Seller name',
  supplier_contact VARCHAR(100) COMMENT 'Supplier phone/contact',
  vehicle_no VARCHAR(100) COMMENT 'Vehicle number',
  invoice_no VARCHAR(100) COMMENT 'Invoice/Bill number',
  inward_date DATE COMMENT 'Date of inward',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_date (inward_date),
  INDEX idx_inward_type (inward_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Outward Register (Animals/Products going OUT)
CREATE TABLE IF NOT EXISTS farming_outward (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  animal_id INT COMMENT 'FK to farming_animals (optional)',
  batch_id INT COMMENT 'FK to farming_batches (optional)',
  outward_type ENUM('sale','death','transfer_out','slaughter','gift') NOT NULL COMMENT 'बिक्री/मृत्यु/ट्रांसफर',
  product_type VARCHAR(150) COMMENT 'Product being sold (Milk/Meat/Eggs etc)',
  quantity INT DEFAULT 1,
  weight DECIMAL(10,2) COMMENT 'Total weight in kg',
  unit_price DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  buyer_name VARCHAR(200) COMMENT 'Buyer name / खरीदार',
  buyer_contact VARCHAR(100),
  vehicle_no VARCHAR(100),
  invoice_no VARCHAR(100),
  outward_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_date (outward_date),
  INDEX idx_outward_type (outward_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Daily Production (Milk, Eggs, Honey, Dung, Meat, Fish etc.)
CREATE TABLE IF NOT EXISTS farming_production (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  animal_id INT COMMENT 'FK to farming_animals (optional, for individual tracking)',
  batch_id INT COMMENT 'FK to farming_batches (optional, for batch tracking)',
  product_name VARCHAR(150) NOT NULL COMMENT 'दूध/अंडे/शहद/गोबर/मांस etc',
  quantity DECIMAL(15,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg' COMMENT 'kg/litre/pieces/grams',
  quality_grade VARCHAR(50) COMMENT 'A/B/C grade',
  production_date DATE COMMENT 'Production date',
  shift ENUM('morning','evening','full_day') DEFAULT 'full_day' COMMENT 'सुबह/शाम/पूरा दिन',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_date (production_date),
  INDEX idx_product (product_name),
  INDEX idx_animal (animal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Feed / Fodder Management (चारा प्रबंधन)
CREATE TABLE IF NOT EXISTS farming_feed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  animal_id INT COMMENT 'FK to farming_animals (optional)',
  batch_id INT COMMENT 'FK to farming_batches (optional)',
  feed_name VARCHAR(200) NOT NULL COMMENT 'Feed name / चारे का नाम',
  quantity DECIMAL(15,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg',
  cost_per_unit DECIMAL(15,2) DEFAULT 0 COMMENT 'Cost per unit / प्रति इकाई लागत',
  total_cost DECIMAL(15,2) DEFAULT 0 COMMENT 'Total cost / कुल लागत',
  feed_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_date (feed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Health / Medical Records (स्वास्थ्य रिकॉर्ड)
CREATE TABLE IF NOT EXISTS farming_health (
  id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT COMMENT 'FK to farming_animals',
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  doctor_id INT COMMENT 'FK to farming_doctors',
  treatment_type ENUM('vaccination','medication','checkup','surgery','deworming','other') NOT NULL COMMENT 'टीकाकरण/दवाई/जांच/सर्जरी',
  disease_name VARCHAR(200) COMMENT 'Disease / बीमारी का नाम',
  medicine_name VARCHAR(200) COMMENT 'Medicine / दवाई का नाम',
  dosage VARCHAR(100) COMMENT 'Dose / खुराक',
  doctor_name VARCHAR(200) COMMENT 'Vet doctor name (Legacy / Backup)',
  cost DECIMAL(15,2) DEFAULT 0 COMMENT 'Treatment cost / इलाज खर्च',
  treatment_date DATE,
  next_followup DATE COMMENT 'Next follow-up date / अगली तारीख',
  report_url TEXT COMMENT 'Medical report/scan photo',
  symptoms TEXT COMMENT 'Signs observed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_animal (animal_id),
  INDEX idx_type (type),
  INDEX idx_date (treatment_date),
  INDEX idx_doctor (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Doctors / Vets Master (पशु चिकित्सक मास्टर)
CREATE TABLE IF NOT EXISTS farming_doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  specialization VARCHAR(200) COMMENT 'Expert in Cow/Goat etc',
  contact_number VARCHAR(50) NOT NULL,
  address TEXT,
  clinic_name VARCHAR(200),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Disease Knowledge Base (बीमारी मास्टर)
CREATE TABLE IF NOT EXISTS farming_diseases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
  disease_name VARCHAR(200) NOT NULL,
  symptoms TEXT,
  treatment_info TEXT,
  danger_level ENUM('low','medium','high','critical') DEFAULT 'medium',
  is_contagious BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert User Provided Diseases
INSERT IGNORE INTO farming_diseases (type, disease_name, symptoms, danger_level, is_contagious) VALUES
('cow', 'Foot and Mouth Disease (FMD)', 'Muh aur pair me chhale, Bukhar, doodh kam ho jata hai', 'high', TRUE),
('cow', 'Mastitis', 'Thun (udder) me sujan, Doodh me infection', 'medium', FALSE),
('cow', 'Black Quarter (BQ)', 'Pair me sujan, chal nahi pata, Achanak death ho sakti hai', 'critical', FALSE),
('cow', 'Anthrax', 'Bahut dangerous, insaan me bhi fail sakti hai', 'critical', TRUE),
('cow', 'Milk Fever', 'Delivery ke baad hota hai, Gai khadi nahi ho pati', 'medium', FALSE),
('goat', 'Peste des Petits Ruminants (PPR)', 'Bukhar, dast, naak se paani, Bahut fast failta hai', 'critical', TRUE),
('goat', 'Goat Pox', 'Skin par daane aur ghaav', 'high', TRUE),
('goat', 'Enterotoxemia', 'Achanak death, Overfeeding se hota hai', 'critical', FALSE),
('goat', 'Foot Rot', 'Pair me infection, chalne me problem', 'medium', FALSE),
('goat', 'Internal Parasites', 'Pet ke keede, Weight loss', 'low', FALSE),
('chicken', 'Newcastle Disease (Ranikhet)', 'Sabse dangerous, Saans lene me dikkat', 'critical', TRUE),
('chicken', 'Avian Influenza', 'Sudden death, Bahut fast spread hota hai', 'critical', TRUE),
('chicken', 'Coccidiosis', 'Khooni dast, Chicks me common', 'high', FALSE),
('chicken', 'Fowl Pox', 'Skin par daane', 'medium', TRUE),
('chicken', 'Infectious Bursal Disease', 'Immunity weak ho jati hai', 'high', TRUE),
('fish', 'Ichthyophthiriasis (White Spot)', 'Body par chhote safed daane, Fish rub karti hai', 'medium', TRUE),
('fish', 'Fin Rot', 'Pankh (fins) galne lagte hain, Tail damage ho jata hai', 'medium', FALSE),
('fish', 'Dropsy', 'Body phool jati hai, Scales khade ho jate hain', 'high', FALSE),
('fish', 'Gill Rot', 'Saans lene me dikkat, Fish surface par aati hai', 'high', FALSE),
('fish', 'Columnaris', 'Skin par safed ya grey patch, Mouth aur gills affected', 'medium', TRUE),
('fish', 'Fish Lice', 'Body par chipakne wale parasite, Fish irritate hoti hai', 'low', TRUE),
('fish', 'Saprolegniasis', 'Cotton jaisa white fungus body par', 'medium', FALSE);

-- 9. Expenses (खर्चे)
CREATE TABLE IF NOT EXISTS farming_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('cow','goat','chicken','fish','honey','general') NOT NULL,
  category VARCHAR(150) COMMENT 'Expense category / खर्च श्रेणी',
  description TEXT COMMENT 'Description / विवरण',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Amount / राशि',
  vendor_name VARCHAR(200) COMMENT 'Vendor / दुकानदार',
  bill_no VARCHAR(100) COMMENT 'Bill number',
  expense_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_date (expense_date),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ✅ ALL 9 TABLES CREATED SUCCESSFULLY!
-- Tables: farming_categories, farming_animals, farming_batches,
--         farming_inward, farming_outward, farming_production,
--         farming_feed, farming_health, farming_expenses
-- ============================================================
