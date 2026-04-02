-- Create employee_sessions table for chat requests
CREATE TABLE IF NOT EXISTS `employee_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requester_id` int(11) NOT NULL COMMENT 'Employee who initiated the chat request',
  `responder_id` int(11) DEFAULT NULL COMMENT 'Employee who accepted the chat',
  `status` enum('pending','active','rejected','ended') NOT NULL DEFAULT 'pending',
  `request_message` text DEFAULT NULL COMMENT 'Initial message when requesting chat',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ended_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_requester_id` (`requester_id`),
  KEY `idx_responder_id` (`responder_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create chat_messages table for employee-to-employee messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `message_type` enum('text','file','image') NOT NULL DEFAULT 'text',
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('sent','delivered','read') NOT NULL DEFAULT 'sent',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_receiver_id` (`receiver_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`session_id`) REFERENCES `employee_sessions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `employee_profile` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `employee_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create employee_chat_settings table for chat preferences
CREATE TABLE IF NOT EXISTS `employee_chat_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `auto_accept` tinyint(1) NOT NULL DEFAULT 0,
  `notification_sound` tinyint(1) NOT NULL DEFAULT 1,
  `notification_desktop` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee` (`employee_id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employee_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default chat settings for all existing employees
INSERT IGNORE INTO employee_chat_settings (employee_id)
SELECT id FROM employee_profile WHERE status = 0;
