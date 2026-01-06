-- Create attendance table for employee attendance tracking
-- Run this SQL in your MySQL database

CREATE TABLE IF NOT EXISTS attendance (
  id INT(11) NOT NULL AUTO_INCREMENT,
  employee_id INT(11) NOT NULL,
  station_id INT(11) NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIME DEFAULT NULL,
  check_out_time TIME DEFAULT NULL,
  status ENUM('Present', 'Absent', 'Half Day', 'Leave') DEFAULT 'Present',
  remarks TEXT DEFAULT NULL,
  marked_by INT(11) DEFAULT NULL COMMENT 'Employee ID who marked this attendance',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_employee_date_station (employee_id, attendance_date, station_id),
  KEY idx_employee_id (employee_id),
  KEY idx_station_id (station_id),
  KEY idx_attendance_date (attendance_date),
  KEY idx_marked_by (marked_by),
  FOREIGN KEY (employee_id) REFERENCES employee_profile(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES filling_stations(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES employee_profile(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

