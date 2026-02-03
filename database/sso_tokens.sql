-- Create SSO Tokens table for cross-site authentication
CREATE TABLE IF NOT EXISTS sso_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  is_used BOOLEAN DEFAULT FALSE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES employee_profile(id) ON DELETE CASCADE
);
