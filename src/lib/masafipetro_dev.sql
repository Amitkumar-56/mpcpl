-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 28, 2025 at 11:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `masafipetro_dev`
--

-- --------------------------------------------------------

--
-- Table structure for table `agents`
--

CREATE TABLE `agents` (
  `id` int(11) NOT NULL,
  `agent_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `aadhar_number` varchar(20) NOT NULL,
  `pan_number` varchar(20) NOT NULL,
  `kyc_verified` tinyint(1) DEFAULT 0,
  `bank_name` varchar(255) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(20) NOT NULL,
  `bank_verified` tinyint(1) DEFAULT 0,
  `password` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agents`
--

INSERT INTO `agents` (`id`, `agent_id`, `first_name`, `last_name`, `email`, `phone`, `address`, `aadhar_number`, `pan_number`, `kyc_verified`, `bank_name`, `account_number`, `ifsc_code`, `bank_verified`, `password`, `status`, `created_at`, `updated_at`) VALUES
(1, '', 'Amit', 'AmitKumar', 'mykittu96@gmail.com', '09648065956', 'VILL-PALI UPARHAR\nPOST-KAUSHAMBI\nTHANA-KAUSHAMBI', '12345678901', 'ipjp213m', 0, 'bob', '12345678901', '121121', 0, '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 1, '2025-10-04 04:55:50', '2025-10-04 04:55:50'),
(9, 'AGT1759562138868', 'rahul', 'AmitKumar', 'rahul@gmail.com', '09648065956', 'VILL-PALI UPARHAR\nPOST-KAUSHAMBI\nTHANA-KAUSHAMBI', '12345678902', 'ipjp713m', 0, 'bob', '12345678902', '121121', 0, '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 1, '2025-10-04 07:15:38', '2025-10-04 07:15:38');

-- --------------------------------------------------------

--
-- Table structure for table `agent_customers`
--

CREATE TABLE `agent_customers` (
  `id` int(11) NOT NULL,
  `agent_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(11) NOT NULL,
  `allocated_by` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `allocated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `agent_history`
--

CREATE TABLE `agent_history` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `performed_by` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_balance`
--

CREATE TABLE `cash_balance` (
  `id` int(11) NOT NULL DEFAULT 1,
  `balance` decimal(15,2) DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cash_balance`
--

INSERT INTO `cash_balance` (`id`, `balance`, `updated_at`) VALUES
(1, 100000.00, '2025-10-23 09:50:48');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `auth_token` varchar(400) DEFAULT NULL,
  `address` varchar(700) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `region` varchar(200) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `postbox` varchar(20) DEFAULT NULL,
  `email` varchar(60) DEFAULT NULL,
  `password` varchar(600) DEFAULT NULL,
  `picture` varchar(100) NOT NULL DEFAULT 'example.png',
  `gid` int(11) NOT NULL DEFAULT 1,
  `billing_type` int(11) DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `taxid` varchar(100) DEFAULT NULL,
  `name_s` varchar(100) DEFAULT NULL,
  `phone_s` varchar(100) DEFAULT NULL,
  `email_s` varchar(100) DEFAULT NULL,
  `address_s` varchar(100) DEFAULT NULL,
  `city_s` varchar(100) DEFAULT NULL,
  `region_s` varchar(100) DEFAULT NULL,
  `country_s` varchar(100) DEFAULT NULL,
  `postbox_s` varchar(100) DEFAULT NULL,
  `balance` float(16,2) NOT NULL DEFAULT 0.00,
  `hold_balance` float(16,2) NOT NULL DEFAULT 0.00,
  `amtlimit` float(16,2) NOT NULL DEFAULT 0.00,
  `roleid` int(11) DEFAULT NULL,
  `sp_id` int(11) DEFAULT NULL,
  `com_id` int(11) DEFAULT NULL,
  `subcom_id` int(11) DEFAULT NULL,
  `gst_name` varchar(255) DEFAULT NULL,
  `gst_number` varchar(255) DEFAULT NULL,
  `deal_price` text DEFAULT NULL,
  `deal_price1` text DEFAULT NULL,
  `deal_price_urea` text DEFAULT NULL,
  `doc1` varchar(255) DEFAULT NULL,
  `doc2` varchar(255) DEFAULT NULL,
  `doc3` varchar(255) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `product` varchar(255) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `blocklocation` varchar(255) DEFAULT NULL,
  `device_token` text DEFAULT NULL,
  `credit_days` int(11) DEFAULT 7
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `auth_token`, `address`, `city`, `region`, `country`, `postbox`, `email`, `password`, `picture`, `gid`, `billing_type`, `company`, `taxid`, `name_s`, `phone_s`, `email_s`, `address_s`, `city_s`, `region_s`, `country_s`, `postbox_s`, `balance`, `hold_balance`, `amtlimit`, `roleid`, `sp_id`, `com_id`, `subcom_id`, `gst_name`, `gst_number`, `deal_price`, `deal_price1`, `deal_price_urea`, `doc1`, `doc2`, `doc3`, `status`, `product`, `location_id`, `blocklocation`, `device_token`, `credit_days`) VALUES
(1, 'ravendra', '98872', NULL, 'lucknow', 'lucknow', 'uttar_pradesh', 'India', '1212', 'amit12@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'example.png', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 1, NULL, NULL, NULL, '', '', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, '4,7', NULL, 1),
(2, 'Tayyab ansari', '1234567890', NULL, 'This is the address test', 'city name test', 'uttar_pradesh', 'India', '11111', 'tayyab.kmj@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'example.png', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 3, NULL, NULL, NULL, 'gst name', 'gstin', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, 7),
(4, 'Test client Amit', '09648065956', NULL, 'VILL-PALI UPARHAR\r\nPOST-KAUSHAMBI\r\nTHANA-KAUSHAMBI', 'kaushambi', 'uttar_pradesh', 'India', '212214', 'test@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'example.png', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 1, NULL, NULL, NULL, '', '', NULL, NULL, NULL, NULL, NULL, NULL, 1, '5,8', NULL, '10,7,4,6', NULL, 1),
(5, 'Amit Kumar', '9648065956', NULL, NULL, NULL, NULL, NULL, NULL, 'rahual@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'example.png', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 2, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, 7),
(6, 'jiyhh', '09648065958', NULL, NULL, NULL, NULL, NULL, NULL, 'mykitt96@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'example.png', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 2, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '5,4', NULL, '10,7,4', NULL, 7),
(7, 'rahul', '12121', NULL, NULL, NULL, NULL, NULL, NULL, 'r1@gmail.com', '6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918', 'example.png', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 2, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '5,4', NULL, '10,7,4', NULL, 7);

-- --------------------------------------------------------

--
-- Table structure for table `customer_balances`
--

CREATE TABLE `customer_balances` (
  `id` int(10) UNSIGNED NOT NULL,
  `balance` decimal(16,2) NOT NULL DEFAULT 0.00,
  `hold_balance` decimal(16,2) NOT NULL DEFAULT 0.00,
  `amtlimit` decimal(16,2) NOT NULL DEFAULT 0.00,
  `cst_limit` decimal(16,2) NOT NULL DEFAULT 0.00,
  `com_id` int(11) DEFAULT NULL,
  `last_reset_date` datetime DEFAULT current_timestamp(),
  `limit_expiry` date DEFAULT NULL,
  `validity_days` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_permissions`
--

CREATE TABLE `customer_permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `customer_permissions`
--

INSERT INTO `customer_permissions` (`id`, `customer_id`, `module_name`, `can_view`, `can_edit`, `can_delete`) VALUES
(1, 1, 'Dashboard', 1, 0, 0),
(2, 1, 'Filling Requests', 1, 1, 0),
(3, 1, 'Loading Station', 1, 0, 0),
(4, 1, 'Loading History', 1, 0, 0),
(5, 2, 'Dashboard', 1, 1, 0),
(6, 2, 'Filling Requests', 0, 0, 0),
(7, 2, 'Loading Station', 0, 0, 0),
(8, 2, 'Loading History', 0, 0, 0),
(13, 4, 'Dashboard', 1, 0, 0),
(14, 4, 'Filling Requests', 1, 1, 0),
(15, 4, 'Loading Station', 1, 0, 0),
(16, 4, 'Loading History', 1, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `deal_price`
--

CREATE TABLE `deal_price` (
  `id` int(11) NOT NULL,
  `com_id` int(11) NOT NULL,
  `station_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `sub_product_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `Schedule_Date` date DEFAULT NULL,
  `Schedule_Time` time DEFAULT NULL,
  `updated_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `status` enum('scheduled','active','expired') DEFAULT 'scheduled',
  `applied_at` datetime DEFAULT NULL,
  `is_applied` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `deal_price`
--

INSERT INTO `deal_price` (`id`, `com_id`, `station_id`, `product_id`, `sub_product_id`, `price`, `Schedule_Date`, `Schedule_Time`, `updated_date`, `is_active`, `status`, `applied_at`, `is_applied`) VALUES
(1, 4, 6, 2, 1, 12.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(2, 4, 6, 2, 2, 20.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(3, 4, 6, 3, 3, 80.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(4, 4, 6, 3, 4, 97.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(5, 4, 6, 4, 5, 56.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(6, 4, 6, 4, 6, 60.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(7, 4, 6, 5, 7, 70.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(8, 4, 6, 5, 8, 75.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(9, 4, 3, 2, 1, 90.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(10, 4, 3, 2, 2, 70.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(11, 4, 3, 3, 3, 65.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(12, 4, 3, 3, 4, 69.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(13, 4, 3, 4, 5, 67.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(14, 4, 3, 4, 6, 68.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(15, 4, 3, 5, 7, 87.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1),
(16, 4, 3, 5, 8, 54.00, '2025-10-24', '12:28:00', '2025-10-24', 1, 'scheduled', '2025-10-24 18:52:08', 1);

-- --------------------------------------------------------

--
-- Table structure for table `employee_profile`
--

CREATE TABLE `employee_profile` (
  `id` int(11) NOT NULL,
  `emp_code` varchar(20) DEFAULT NULL,
  `email` varchar(60) NOT NULL,
  `password` varchar(400) NOT NULL,
  `role` int(11) NOT NULL COMMENT '1-Staff,2-Incharge,3-Team Leader,4-Accountant,5-Admin,6-Driver',
  `salary` int(11) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `address` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `postbox` varchar(20) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `phonealt` varchar(15) DEFAULT NULL,
  `picture` varchar(100) NOT NULL DEFAULT 'default.png',
  `sign` varchar(255) DEFAULT NULL,
  `fl_id` int(11) DEFAULT NULL,
  `fs_id` int(11) DEFAULT NULL,
  `station` varchar(100) DEFAULT NULL,
  `client` varchar(100) DEFAULT NULL,
  `status` int(11) DEFAULT 0,
  `device_token` varchar(255) DEFAULT NULL,
  `account_details` text DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_profile`
--

INSERT INTO `employee_profile` (`id`, `emp_code`, `email`, `password`, `role`, `salary`, `name`, `address`, `city`, `region`, `country`, `postbox`, `phone`, `phonealt`, `picture`, `sign`, `fl_id`, `fs_id`, `station`, `client`, `status`, `device_token`, `account_details`, `qr_code`, `created_at`, `updated_at`) VALUES
(1, 'EMP001', 'amit@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 5, 50000, 'Admin User', 'HQ Address', 'Noida', 'UP', 'India', '201301', '9876543210', '9123456789', 'default.png', NULL, NULL, NULL, NULL, NULL, 1, NULL, 'Admin Account', NULL, '2025-09-20 14:54:06', '2025-09-20 14:57:10'),
(5, '121', 'rahul@gmail.com', '$2b$10$/lT7J0I9FGehZQdrcUpEX.l/R.yWOcVoRB1MQqeeH4Jui8/MuJx.i', 2, 11, 'rtat', '', '', '', '', '', '11111111', '', 'default.png', NULL, NULL, NULL, NULL, NULL, 1, NULL, '', NULL, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(6, 'EMP122', 'ravendra@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 4, 200000, 'ravendra', 'VILL-PALI UPARHAR', 'kaushambi', 'Uttar Pradesh', 'India', '', '1234567', '09648065956', 'default.png', NULL, NULL, NULL, NULL, NULL, 1, NULL, '', NULL, '2025-09-20 16:55:57', '2025-09-20 16:55:57');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `title` varchar(50) NOT NULL,
  `details` varchar(300) DEFAULT NULL,
  `paid_to` varchar(50) NOT NULL,
  `reason` varchar(400) NOT NULL,
  `amount` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `filling_history`
--

CREATE TABLE `filling_history` (
  `id` int(11) NOT NULL,
  `rid` varchar(30) DEFAULT NULL,
  `fs_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `sub_product_id` int(11) DEFAULT NULL,
  `trans_type` varchar(30) NOT NULL,
  `current_stock` varchar(50) DEFAULT NULL,
  `filling_qty` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `credit` int(11) DEFAULT NULL,
  `in_amount` decimal(15,2) DEFAULT 0.00,
  `d_amount` decimal(15,2) DEFAULT 0.00,
  `limit_type` enum('Increase','Decrease') DEFAULT NULL,
  `credit_date` date DEFAULT NULL,
  `available_stock` varchar(50) DEFAULT NULL,
  `old_amount` decimal(10,2) DEFAULT NULL,
  `new_amount` decimal(10,2) DEFAULT NULL,
  `remaining_limit` decimal(10,2) DEFAULT NULL,
  `filling_date` date DEFAULT NULL,
  `cl_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `validity_days` int(11) DEFAULT 0,
  `expiry_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `filling_logs`
--

CREATE TABLE `filling_logs` (
  `id` int(11) NOT NULL,
  `request_id` varchar(15) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `processed_date` datetime DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `cancelled_date` datetime DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_date` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `filling_logs`
--

INSERT INTO `filling_logs` (`id`, `request_id`, `created_by`, `processed_by`, `completed_by`, `cancelled_by`, `created_date`, `processed_date`, `completed_date`, `cancelled_date`, `updated_by`, `updated_date`) VALUES
(1, 'MP000001', 1, NULL, NULL, NULL, '2025-10-28 10:18:01', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `filling_requests`
--

CREATE TABLE `filling_requests` (
  `id` int(11) NOT NULL,
  `rid` varchar(255) DEFAULT NULL,
  `fl_id` int(11) DEFAULT NULL,
  `fs_id` int(11) DEFAULT NULL,
  `com_id` int(11) DEFAULT NULL,
  `subcom_id` int(11) DEFAULT NULL,
  `fa_id` int(11) DEFAULT NULL,
  `vehicle_number` varchar(255) DEFAULT NULL,
  `vehicle_type` varchar(255) DEFAULT NULL,
  `driver_number` varchar(255) DEFAULT NULL,
  `rtype` varchar(255) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `aqty` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `otp` int(11) DEFAULT NULL,
  `cid` int(11) DEFAULT NULL,
  `status` enum('Pending','Processing','Completed','Cancelled') NOT NULL,
  `pdate` datetime DEFAULT NULL,
  `pcid` int(11) DEFAULT NULL,
  `cdate` datetime DEFAULT NULL,
  `ccid` int(11) DEFAULT NULL,
  `cadate` datetime DEFAULT NULL,
  `cacid` int(11) DEFAULT NULL,
  `doc1` varchar(255) DEFAULT NULL,
  `doc2` varchar(255) DEFAULT NULL,
  `doc3` varchar(255) DEFAULT NULL,
  `price` varchar(255) DEFAULT NULL,
  `totalamt` float(16,2) DEFAULT NULL,
  `invoice_status` varchar(255) NOT NULL DEFAULT 'Unpaid',
  `remark` text DEFAULT NULL,
  `cancel_remark` text DEFAULT NULL,
  `product` int(11) NOT NULL DEFAULT 1,
  `sub_product_id` int(11) DEFAULT NULL,
  `subcom_price` varchar(255) DEFAULT NULL,
  `subcom_total` float(16,2) DEFAULT NULL,
  `status_updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `filling_stations`
--

CREATE TABLE `filling_stations` (
  `id` int(11) NOT NULL,
  `fl_id` int(11) NOT NULL,
  `fa_id` int(11) NOT NULL,
  `station_name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `gst_name` varchar(255) NOT NULL,
  `gst_number` varchar(255) NOT NULL,
  `map_link` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `manager` varchar(255) NOT NULL,
  `created` datetime NOT NULL,
  `stock` float(16,2) NOT NULL DEFAULT 0.00,
  `stock1` float(16,2) NOT NULL,
  `stock_urea` float(16,2) NOT NULL DEFAULT 0.00,
  `status` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `filling_stations`
--

INSERT INTO `filling_stations` (`id`, `fl_id`, `fa_id`, `station_name`, `address`, `gst_name`, `gst_number`, `map_link`, `email`, `phone`, `manager`, `created`, `stock`, `stock1`, `stock_urea`, `status`) VALUES
(2, 6, 2, 'Nellore', 'Survey No. 247, 248, Manubol Mandalam, Gudur Registration District Ilaka, Sri Potti Sriramulu, Nellore, Andhra Pradesh - 524405', 'Gyanti Multiservices Pvt Ltd', '34AAGCG6220R1Z4', 'https://maps.app.goo.gl/yv5FmpDdeqFUvERv5', 'gyantimultiservices@gmail.com', '6304332650', 'Ranjan Kumar', '2022-02-25 02:31:15', 21162.00, 30218.00, 0.00, 1),
(3, 3, 2, 'Agra', 'Agra', 'Gyanti Multiservices Pvt Ltd', '90AAGCG6220R1Z3', 'https://maps.app.goo.gl/EVRhpNC3yieMuWa48', 'gyantimultiservices@gmail.com', '9077665858', 'Sujeet Sahi', '2022-02-22 18:24:20', 14632.00, 18826.00, 7624.00, 1),
(4, 3, 2, 'Kanpur', 'Purwameer', 'Gyanti Multiservices Pvt Ltd', '09AAGCG6220R1Z3', 'https://maps.app.goo.gl/sRukPQzkYEPPzqoT8', 'Gmknp@gmail.com', ' 8840762539 ', 'Nandkishore', '2022-02-22 18:25:47', 18168.00, 17766.00, 8750.00, 1),
(6, 5, 2, 'Krishnagiri', 'H. A. O. 70.85, SY NO 7/3A1B, Asst 240, Kurubapalli, Krishnagiri, Tamil Nadu - 635121', 'Gyanti Multiservices Pvt Ltd', '33aagcg6220r1zc', 'https://maps.app.goo.gl/Ss29bRNreRe4QJZy7', 'gyantimultiservices@gmail.com', '8870527222', 'Jay Prakash', '2022-02-25 02:31:33', 37327.00, 3506.00, 11600.00, 1),
(7, 4, 2, 'Baharagora', 'Plot No 2801 and 2802, Baharagora, East Singhbhumi, Jharkhand - 832101', 'Gyanti Multiservices Pvt Ltd', '20AAGCG6220R1ZJ', 'https://maps.app.goo.gl/2DkZnjjtKaMVqDCd9', 'gyantimultiservices@gmail.com', '7739714933', 'Ravi Kumar', '2022-02-25 02:32:00', 0.00, 52480.00, 4780.00, 1),
(8, 7, 2, 'Gurgaon', 'SCO33, Second Floor, Sector 10A, Gurugram 122001', 'Gyanti Multiservices Pvt Ltd ', '06', NULL, 'Gyantimultiservices@gmail.com', '7311112659', 'Staff', '2022-02-25 02:34:02', 0.00, 0.00, 0.00, 1),
(10, 3, 2, 'Kushinagar', 'Sukrauli', 'GYANTI MULTISERVICES PVT LTD ', '09AAGCG6220R1Z3', 'https://maps.app.goo.gl/YTZV6DLDynBVLjnq5', 'Kushinagar@gmail.com', '8292922719', 'Akela', '2023-05-13 00:28:38', 4386.00, 234.00, 1800.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `filling_station_stocks`
--

CREATE TABLE `filling_station_stocks` (
  `id` int(11) NOT NULL,
  `fs_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `stock` decimal(10,2) NOT NULL,
  `msg` text DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `product` int(11) NOT NULL DEFAULT 1,
  `sub_product_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `filling_station_stocks`
--

INSERT INTO `filling_station_stocks` (`id`, `fs_id`, `created_at`, `stock`, `msg`, `remark`, `product`, `sub_product_id`) VALUES
(1, 3, '2025-10-24 11:30:23', 8821.00, 'New purchase - Invoice: 0822', 'Tanker: UP53LT4044', 2, NULL),
(2, 3, '2025-10-24 18:56:19', 5000.00, 'New purchase - Invoice: 1212', 'Tanker: 21wqmkd1', 3, NULL),
(3, 3, '2025-10-24 18:57:14', 4000.00, 'New purchase - Invoice: 0822', 'Tanker: UP53LT4044', 5, NULL),
(4, 3, '2025-10-24 18:58:08', 2121.00, 'New purchase - Invoice: 221', 'Tanker: 3', 4, NULL),
(5, 3, '2025-10-25 12:41:28', 8821.00, 'Auto-initialized', 'Stock allocated from total product stock', 2, 1),
(6, 3, '2025-10-25 12:41:28', 8821.00, 'Auto-initialized', 'Stock allocated from total product stock', 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `filling_status_history`
--

CREATE TABLE `filling_status_history` (
  `id` int(11) NOT NULL,
  `filling_request_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `changed_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  `paid_amount` decimal(15,2) DEFAULT 0.00,
  `remaining_amount` decimal(15,2) DEFAULT 0.00,
  `due_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `created_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `limit_history`
--

CREATE TABLE `limit_history` (
  `id` int(11) NOT NULL,
  `com_id` int(11) NOT NULL,
  `old_limit` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL,
  `new_limit` decimal(10,2) DEFAULT NULL,
  `changed_by` varchar(50) DEFAULT NULL,
  `change_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `limit_history`
--

INSERT INTO `limit_history` (`id`, `com_id`, `old_limit`, `change_amount`, `new_limit`, `changed_by`, `change_date`) VALUES
(0, 4, 372.86, 2223.00, 372.86, '1', '2025-10-14 14:46:21'),
(0, 4, 2595.86, 1000.00, 2595.86, '1', '2025-10-14 14:49:33'),
(0, 4, 3595.86, 1200.00, 3595.86, '1', '2025-10-14 14:57:11'),
(0, 4, 6795.86, 2000.00, 8795.86, '1', '2025-10-14 21:17:09'),
(0, 4, 8795.86, 122.00, 8917.86, '1', '2025-10-14 21:51:30'),
(0, 4, -227.14, 7000.00, 6772.86, '1', '2025-10-17 15:13:16');

-- --------------------------------------------------------

--
-- Table structure for table `nb_expense`
--

CREATE TABLE `nb_expense` (
  `id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `reason` text DEFAULT NULL,
  `paid_to` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `station_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `non_billing_stocks`
--

CREATE TABLE `non_billing_stocks` (
  `id` int(11) NOT NULL,
  `station_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `sub_product_id` int(11) DEFAULT NULL,
  `stock` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `pname` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `pname`) VALUES
(2, 'Industrial Oil 40 '),
(3, 'Industrial Oil 60'),
(4, 'DEF Lose'),
(5, 'DEF Bucket');

-- --------------------------------------------------------

--
-- Table structure for table `product_codes`
--

CREATE TABLE `product_codes` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `pcode` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_codes`
--

INSERT INTO `product_codes` (`id`, `product_id`, `pcode`) VALUES
(1, 2, 'Industrial Oil 40 (R) - IO40R'),
(2, 2, 'Industrial Oil 40 (B) - IO40B'),
(3, 3, 'Industrial Oil 60 (R) - IO60R\n'),
(4, 3, 'Industrial Oil 60 (B) - IO60B'),
(5, 4, 'DEF Lose (R) - DEFLR'),
(6, 4, 'DEF Lose (B) -DEFLB'),
(7, 5, 'DEF Bucket (R) - DEFBR'),
(8, 5, 'DEF Bucket (B) - DEFBB');

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `station_id` int(11) DEFAULT NULL,
  `invoice_number` varchar(255) NOT NULL,
  `invoice_date` date NOT NULL,
  `invoice_amount` decimal(12,2) NOT NULL,
  `eway_bill_number` varchar(255) DEFAULT NULL,
  `eway_bill_expiry_date` date DEFAULT NULL,
  `density` decimal(8,3) DEFAULT NULL,
  `quantity_in_kg` decimal(10,3) DEFAULT NULL,
  `quantity_in_ltr` decimal(10,3) DEFAULT NULL,
  `tanker_number` varchar(100) DEFAULT NULL,
  `driver_number` varchar(20) DEFAULT NULL,
  `lr_no` varchar(255) DEFAULT NULL,
  `debit_note` decimal(10,2) DEFAULT 0.00,
  `credit_note` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'on_the_way',
  `quantity_changed` tinyint(1) DEFAULT 0,
  `quantity_change_reason` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_for_use`
--

CREATE TABLE `purchase_for_use` (
  `id` int(11) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `invoice_date` date NOT NULL,
  `fs_id` int(11) NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `purchase_for_use`
--

INSERT INTO `purchase_for_use` (`id`, `supplier_name`, `product_name`, `amount`, `quantity`, `invoice_date`, `fs_id`, `invoice_number`, `created_by`, `created_at`) VALUES
(1, 'amit', 'gm50', 6789.00, 121.99, '2025-10-16', 0, NULL, NULL, '2025-10-16 09:10:09');

-- --------------------------------------------------------

--
-- Table structure for table `recharge_requests`
--

CREATE TABLE `recharge_requests` (
  `id` int(11) NOT NULL,
  `created` datetime NOT NULL,
  `cid` int(11) NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `payment_type` varchar(255) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `account` int(11) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `utr_no` varchar(255) NOT NULL,
  `comments` text DEFAULT NULL,
  `subcom_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recharge_wallets`
--

CREATE TABLE `recharge_wallets` (
  `id` int(11) NOT NULL,
  `com_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_type` enum('Cash','RTGS','NEFT','UPI','CHEQUE') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `utr_no` varchar(255) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `retailers`
--

CREATE TABLE `retailers` (
  `id` int(10) UNSIGNED NOT NULL,
  `retailer_name` varchar(150) NOT NULL,
  `role` tinyint(4) NOT NULL DEFAULT 1,
  `phone` varchar(15) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `retailer_type` tinyint(4) NOT NULL DEFAULT 1,
  `credit_limit` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `retailer_permissions`
--

CREATE TABLE `retailer_permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `retailer_id` int(10) UNSIGNED DEFAULT NULL,
  `module_name` varchar(100) DEFAULT NULL,
  `can_view` tinyint(1) DEFAULT 0,
  `can_edit` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `employee_id`, `module_name`, `can_view`, `can_edit`, `can_delete`, `created_at`, `updated_at`) VALUES
(1, 1, 'dashboard', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(2, 1, 'users', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(3, 1, 'reports', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(4, 1, 'customers', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(5, 1, 'filling_requests', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(6, 1, 'loading_stations', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(7, 1, 'vehicles', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(8, 1, 'lr_management', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(9, 1, 'history', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(10, 1, 'tanker_history', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(11, 1, 'deepo_history', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(12, 1, 'products', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(13, 1, 'employees', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(14, 1, 'suppliers', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(15, 1, 'transporters', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(16, 1, 'nb_management', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(17, 1, 'nb_expenses', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(18, 1, 'nb_stock', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(19, 1, 'vouchers', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(20, 1, 'stock', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(21, 1, 'remarks', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(22, 1, 'settings', 1, 1, 1, '2025-09-20 14:54:50', '2025-09-20 14:54:50'),
(23, 5, 'Dashboard', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(24, 5, 'Filling Requests', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(25, 5, 'Loading Station', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(26, 5, 'Customer', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(27, 5, 'Vehicle', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(28, 5, 'LR Management', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(29, 5, 'Loading History', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(30, 5, 'Tanker History', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(31, 5, 'Deepo History', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(32, 5, 'Items & Products', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(33, 5, 'Employees', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(34, 5, 'Suppliers', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(35, 5, 'Transporters', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(36, 5, 'NB Accounts', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(37, 5, 'NB Expenses', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(38, 5, 'NB Stock', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(39, 5, 'Voucher', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(40, 5, 'Stock Transfer', 0, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(41, 5, 'Remarks', 1, 0, 0, '2025-09-20 16:40:21', '2025-09-20 16:40:21'),
(42, 6, 'Dashboard', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(43, 6, 'Filling Requests', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-25 10:57:36'),
(44, 6, 'Loading Station', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(45, 6, 'Customer', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(46, 6, 'Vehicle', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(47, 6, 'LR Management', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(48, 6, 'Loading History', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(49, 6, 'Tanker History', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(50, 6, 'Deepo History', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(51, 6, 'Items & Products', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(52, 6, 'Employees', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(53, 6, 'Suppliers', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(54, 6, 'Transporters', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(55, 6, 'NB Accounts', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(56, 6, 'NB Expenses', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(57, 6, 'NB Stock', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(58, 6, 'Voucher', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(59, 6, 'Stock Transfer', 0, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57'),
(60, 6, 'Remarks', 1, 0, 0, '2025-09-20 16:55:57', '2025-09-20 16:55:57');

-- --------------------------------------------------------

--
-- Table structure for table `shipment`
--

CREATE TABLE `shipment` (
  `id` int(11) NOT NULL,
  `lr_id` varchar(20) DEFAULT NULL,
  `mobile` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL,
  `pan` varchar(20) NOT NULL,
  `gst` varchar(20) NOT NULL,
  `lr_date` date DEFAULT NULL,
  `consigner` varchar(100) DEFAULT NULL,
  `address_1` varchar(400) DEFAULT NULL,
  `consignee` varchar(100) DEFAULT NULL,
  `address_2` varchar(300) DEFAULT NULL,
  `from_location` varchar(100) DEFAULT NULL,
  `to_location` varchar(100) DEFAULT NULL,
  `tanker_no` varchar(20) DEFAULT NULL,
  `gst_no` varchar(20) DEFAULT NULL,
  `products` varchar(100) DEFAULT NULL,
  `boe_no` varchar(20) DEFAULT NULL,
  `wt_type` varchar(50) DEFAULT NULL,
  `gross_wt` varchar(10) DEFAULT NULL,
  `vessel` varchar(100) DEFAULT NULL,
  `tare_wt` varchar(10) DEFAULT NULL,
  `invoice_no` varchar(20) DEFAULT NULL,
  `net_wt` varchar(10) DEFAULT NULL,
  `gp_no` varchar(20) DEFAULT NULL,
  `remarks` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock`
--

CREATE TABLE `stock` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `fs_id` int(11) NOT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `invoice_date` date NOT NULL,
  `eway_bill_number` varchar(100) DEFAULT NULL,
  `eway_bill_expiry_date` date DEFAULT NULL,
  `density` decimal(10,2) DEFAULT NULL,
  `kg` decimal(10,2) DEFAULT NULL,
  `ltr` decimal(10,2) DEFAULT NULL,
  `tanker_no` varchar(50) DEFAULT NULL,
  `driver_no` varchar(50) DEFAULT NULL,
  `lr_no` varchar(50) DEFAULT NULL,
  `v_invoice_value` decimal(10,2) NOT NULL,
  `dncn` decimal(10,2) DEFAULT 0.00,
  `t_dncn` decimal(10,2) DEFAULT 0.00,
  `payable` decimal(10,2) DEFAULT 0.00,
  `t_payable` decimal(10,2) DEFAULT 0.00,
  `payment` decimal(10,2) DEFAULT 0.00,
  `t_payment` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'on_the_way',
  `weight_type` varchar(50) DEFAULT 'normal',
  `quantity_change_reason` text DEFAULT NULL,
  `quantity_changed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock`
--

INSERT INTO `stock` (`id`, `supplier_id`, `product_id`, `fs_id`, `invoice_number`, `invoice_date`, `eway_bill_number`, `eway_bill_expiry_date`, `density`, `kg`, `ltr`, `tanker_no`, `driver_no`, `lr_no`, `v_invoice_value`, `dncn`, `t_dncn`, `payable`, `t_payable`, `payment`, `t_payment`, `status`, `weight_type`, `quantity_change_reason`, `quantity_changed`, `created_at`) VALUES
(1, 2, 2, 3, '0822', '2025-10-24', '12313121', '2025-10-24', 0.82, 0.00, 5000.00, 'UP53LT4044', '7821878389', '566', 80000.00, 0.00, 0.00, 80000.00, 0.00, 0.00, 0.00, 'on_the_way', 'normal', NULL, 0, '2025-10-24 06:00:23'),
(2, 2, 3, 3, '1212', '2025-10-24', '12313121', '2025-10-24', 0.00, 0.00, 5000.00, '21wqmkd1', NULL, '121', 3000.00, 0.00, 0.00, 3000.00, 0.00, 0.00, 0.00, 'on_the_way', 'normal', NULL, 0, '2025-10-24 13:26:19'),
(3, 2, 5, 3, '0822', '2025-10-24', '12313121', '2025-10-24', 0.20, 0.00, 4000.00, 'UP53LT4044', NULL, '212', 3002.00, 0.00, 0.00, 3002.00, 0.00, 0.00, 0.00, 'on_the_way', 'normal', NULL, 0, '2025-10-24 13:27:14'),
(4, 2, 4, 3, '221', '2025-10-24', '000855', '2025-10-24', 0.20, 0.00, 2121.00, '3', NULL, '221', 455.00, 0.00, 0.00, 455.00, 0.00, 0.00, 0.00, 'on_the_way', 'normal', NULL, 0, '2025-10-24 13:28:08');

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfers`
--

CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL,
  `station_from` int(11) NOT NULL,
  `station_to` int(11) NOT NULL,
  `driver_id` varchar(100) NOT NULL,
  `vehicle_id` varchar(100) NOT NULL,
  `transfer_quantity` int(11) NOT NULL,
  `status` int(11) NOT NULL,
  `slip` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `product` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `postbox` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `picture` varchar(100) DEFAULT 'default.png',
  `gstin` varchar(50) DEFAULT NULL,
  `pan` varchar(50) NOT NULL,
  `supplier_type` int(11) NOT NULL,
  `credit_days` int(11) DEFAULT 0,
  `join_date` date DEFAULT curdate(),
  `total_orders` int(11) DEFAULT 0,
  `total_spent` decimal(15,2) DEFAULT 0.00,
  `outstanding_balance` decimal(15,2) DEFAULT 0.00,
  `status` int(11) NOT NULL DEFAULT 1,
  `password` varchar(400) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `phone`, `address`, `postbox`, `email`, `picture`, `gstin`, `pan`, `supplier_type`, `credit_days`, `join_date`, `total_orders`, `total_spent`, `outstanding_balance`, `status`, `password`, `created_at`, `updated_at`) VALUES
(1, 'Supplier Test', '9876543210', 'Noida, UP', '110001', 'test@supplier.com', 'default.png', 'GST9999', 'PAN9999', 1, 0, '2025-10-05', 0, 0.00, 0.00, 1, '6e659deaa85842cdabb5c6305fcc40033ba43772ec00d45c2a3c921741a5e377', '2025-10-05 09:49:39', '2025-10-05 09:49:39'),
(2, 'AmitKumar', '09648065956', 'VILL-PALI UPARHAR\nPOST-KAUSHAMBI\nTHANA-KAUSHAMBI', '2110103', 'mykittu96@gmail.com', 'default.png', '797967ruguggur76', 'AAGCG6220R', 0, 0, '2025-10-05', 0, 0.00, 0.00, 0, 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', '2025-10-05 09:50:58', '2025-10-05 09:50:58');

-- --------------------------------------------------------

--
-- Table structure for table `tanker_history`
--

CREATE TABLE `tanker_history` (
  `id` int(11) NOT NULL,
  `licence_plate` varchar(50) NOT NULL,
  `first_driver` varchar(100) NOT NULL,
  `first_mobile` varchar(15) NOT NULL,
  `first_start_date` date NOT NULL,
  `opening_meter` int(11) NOT NULL,
  `closing_meter` int(11) DEFAULT NULL,
  `diesel_ltr` decimal(10,2) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` varchar(20) DEFAULT 'pending',
  `pdf_path` text DEFAULT NULL,
  `opening_station` varchar(255) DEFAULT NULL,
  `closing_station` varchar(255) DEFAULT NULL,
  `closing_date` date DEFAULT NULL,
  `chunk_index` int(11) DEFAULT 0,
  `total_chunks` int(11) DEFAULT 1,
  `pdf_chunk_path` varchar(255) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tanker_items`
--

CREATE TABLE `tanker_items` (
  `id` int(11) NOT NULL,
  `vehicle_no` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `pcs` int(11) DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `opening_status` varchar(3) DEFAULT NULL,
  `closing_status` varchar(3) DEFAULT NULL,
  `opening_driver_sign` varchar(100) DEFAULT NULL,
  `opening_checker_sign` varchar(100) DEFAULT NULL,
  `closing_driver_sign` varchar(100) DEFAULT NULL,
  `closing_checker_sign` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `created` datetime NOT NULL,
  `cid` int(11) NOT NULL,
  `status` enum('Solved','Processing','Waiting') NOT NULL,
  `section` varchar(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets_th`
--

CREATE TABLE `tickets_th` (
  `id` int(11) NOT NULL,
  `tid` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `cid` int(11) NOT NULL,
  `eid` int(11) NOT NULL,
  `cdate` datetime NOT NULL,
  `attach` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'completed',
  `created_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transporters`
--

CREATE TABLE `transporters` (
  `id` int(11) NOT NULL,
  `transporter_name` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(30) DEFAULT NULL,
  `address` varchar(200) NOT NULL,
  `adhar_front` varchar(300) DEFAULT NULL,
  `adhar_back` varchar(300) DEFAULT NULL,
  `status` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `transporters`
--

INSERT INTO `transporters` (`id`, `transporter_name`, `phone`, `email`, `address`, `adhar_front`, `adhar_back`, `status`) VALUES
(0, 'Shreenath Logistics	', '09648065956', 'mykittu96@gmail.com', 'VILL-PALI UPARHAR\nPOST-KAUSHAMBI\nTHANA-KAUSHAMBI', NULL, NULL, NULL),
(0, 'Gyanti Multiservices', '1234561234', 'Accounts@gyanti.in', 'hariyana', NULL, NULL, NULL),
(0, 'T. B. S Roadlines', '9374948488', 'tbsroadlines2001@gmail.com', 'Roadlines', NULL, NULL, NULL),
(0, 'H. K. Roadlines	', '9869008870', 'hkroadlines009@gmail.com', 'Roadlines	', NULL, NULL, NULL),
(0, 'Jhalak International', '9537797777', 'firesonu@gmail.com', 'International', NULL, NULL, NULL),
(0, 'Shree Rama Roadlines	', '9724840347', 'singhpravesh231@gmail.com', 'Rama ', NULL, NULL, NULL),
(0, 'Shree Harsiddhi Enterprise	', '9099682887', 'nilesh.dangar28@gmail.com', 'Enterprise	', NULL, NULL, NULL),
(0, 'Anjali Roadlines	', '9004126870', 'anjaliroadlines00@gmail.com', 'Roadlines	', NULL, NULL, NULL),
(0, 'devTransport', '1212121212', 'devt@gmail.com', 'devTransport', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `update_invoice`
--

CREATE TABLE `update_invoice` (
  `id` int(11) NOT NULL,
  `supply_id` int(11) NOT NULL,
  `v_invoice` varchar(100) NOT NULL,
  `payment` int(11) NOT NULL,
  `date` date NOT NULL,
  `remarks` varchar(255) NOT NULL,
  `type` int(11) DEFAULT 1 COMMENT '1-stock,2-transport',
  `payment_mode` varchar(50) DEFAULT NULL,
  `edited_by` varchar(100) DEFAULT NULL,
  `edit_time` datetime DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `com_id` int(11) NOT NULL,
  `vehicle_name` varchar(30) NOT NULL,
  `licence_plate` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `status` varchar(10) DEFAULT NULL,
  `driver_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `com_id`, `vehicle_name`, `licence_plate`, `phone`, `status`, `driver_id`) VALUES
(1, 0, 'Tanker22KL3689', 'UP53JT3689', '+917311112659', 'Active', 94),
(2, 0, 'Tanker28KL9224', 'UP53JT9224', '+917311112659', 'Active', 99),
(3, 0, 'Tanker28KL4712', 'UP53KT4712', '+917311112659', 'Active', 100),
(4, 0, 'Tanker28KL4768', 'HR55AV4768', '+917311112659', 'Active', 101),
(5, 0, 'Tanker14KL8666', 'HR55AR8666', '+917311112659', 'Active', 102),
(6, 0, 'Tanker40KL4711', 'UP53KT4711', '+917311112659', 'Active', 103),
(7, 0, 'Tanker40KL4014', 'HR55AV4014', '+917311112659', 'Active', 104),
(8, 0, 'Tanker28KL3786', 'HR55AV3786', '+917311112659', 'Active', 105),
(9, 0, 'Tanker28KL9438', 'HR55AV9438', '+917311112659', 'Active', 98),
(10, 0, 'Tanker14KL0744', 'HR55AV0744', '+917311112659', 'Active', 104),
(11, 0, 'Tanker28KL7201', 'HR55AV7201', '+917311112659', 'Active', 107),
(12, 0, 'Tanker14KL5052', 'HR55AP5052', '+917311112659', 'Active', 110),
(13, 0, 'Tanker14KL3441', 'UP80JT3441', '+917311112659', 'Active', 111),
(14, 0, 'Tanker22KL3652', 'UP80JT3652', '+917311112659', 'Active', 94),
(15, 0, 'Tanker28KL0603', 'HR55AV0603', '+917311112659', 'Active', 112),
(16, 0, 'TRUCK4060', 'UP53KT4060', '+917311112659', 'Active', 86),
(17, 0, 'AGRADE1111', 'SONU KUMAR', '8077665858', 'Active', 118),
(18, 0, 'AGRA DEPO', 'AGRADE1111', '+918077665858', 'Active', 117),
(19, 0, 'KANPUR DEPO', 'KANPUR2222', '+919555197907', 'Active', 93),
(20, 0, 'KUSHINAGAR DEPO', 'KUSHINAGARDE3333', '+918292922719', 'Active', 141),
(21, 0, 'Tanker39KL4219', 'UP53LT4219', '+917505528670', 'Active', 143),
(22, 0, 'Tanker14KL4462', 'UP53LT4462', '+918439827953', 'Active', 144),
(23, 0, 'Tanker39KL4042', 'UP53LT4042', '+919097972301', 'Active', 147),
(24, 0, 'Tanker39KL4302', 'UP53LT4302', '+917311112659', 'Active', 148),
(25, 0, 'Tanker39KL4043', 'UP53LT4043', '+917311112659', 'Active', 112),
(26, 0, 'BAHARAGORA DEPO', 'BAHARAGORA4444', '+917311112659', 'Active', 96),
(27, 0, 'NELLORE DEPO', 'NELLORE5555', '+917311112659', 'Active', 97),
(28, 0, 'Tanker39KL4324', 'UP53LT4324', '+917311112659', 'Active', 150),
(29, 0, 'Tanker39KL4218', 'UP53LT4218', '+917311112659', 'Active', 151),
(30, 0, 'Tanker39KL4299', 'UP53LT4299', '+917311112659', 'Active', 85),
(31, 0, 'Tanker39KL4325', 'UP53LT4325', '+917311112659', 'Active', 57),
(32, 0, 'Tanker39KL4326', 'UP53LT4326', '+917311112659', 'Active', 85),
(33, 0, 'Tanker39KL4463', 'UP53LT4463', '+917311112659', 'Active', 85),
(34, 0, 'Tanker28KL4464', 'UP53LT4464', '+917311112659', 'Active', 85),
(35, 0, 'Tanker14KL4380', 'UP53LT4380', '+917311112659', 'Active', 85),
(36, 0, 'Tanker14KL4155', 'UP53LT4155', '+917311112659', 'Active', 85),
(37, 0, 'Tanker14KL4327', 'UP53LT4327', '+917311112659', 'Active', 85),
(38, 0, 'Tanker14KL4301', 'UP53LT4301', '+917311112659', 'Active', 85),
(39, 0, 'PICKUP6122', 'UP32KN6122', '+917311112659', 'Active', 85),
(40, 0, 'Tanker20KL4599', 'WB11B4599', '+917311112659', 'Active', 85),
(41, 0, 'KRISHNAGIRI DEPO', 'KRISHNAGIRI6666', '+917311112659', 'Active', 85),
(42, 0, 'GURUGRAM OFFICE', 'GGNOFFICE7777', '+917311112659', 'Active', 85);

-- --------------------------------------------------------

--
-- Table structure for table `vouchers_items`
--

CREATE TABLE `vouchers_items` (
  `item_id` int(11) NOT NULL,
  `voucher_id` int(11) DEFAULT NULL,
  `item_details` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_history`
--

CREATE TABLE `voucher_history` (
  `id` int(11) NOT NULL,
  `row_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `amount` varchar(100) DEFAULT NULL,
  `type` int(11) DEFAULT NULL COMMENT '1-voucher',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `wallet_history`
--

CREATE TABLE `wallet_history` (
  `id` int(11) NOT NULL,
  `cl_id` int(11) DEFAULT NULL,
  `rid` varchar(40) DEFAULT NULL,
  `old_balance` decimal(10,2) DEFAULT NULL,
  `deducted` decimal(10,2) DEFAULT NULL,
  `added` decimal(10,2) DEFAULT NULL,
  `c_balance` decimal(10,2) DEFAULT NULL,
  `d_date` date DEFAULT NULL,
  `type` int(11) DEFAULT NULL COMMENT '1 = opening balance, 2 = credit limit, 3 = remaining limit, 4 = filling request',
  `created_at` datetime DEFAULT current_timestamp(),
  `old_limit` decimal(10,2) DEFAULT NULL,
  `new_limit` decimal(10,2) DEFAULT NULL,
  `admin_user_id` int(11) DEFAULT NULL,
  `old_amtlimit` decimal(10,2) DEFAULT NULL,
  `new_amtlimit` decimal(10,2) DEFAULT NULL,
  `change_reason` text DEFAULT NULL,
  `in_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `d_amount` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `agents`
--
ALTER TABLE `agents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `agent_id` (`agent_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `aadhar_number` (`aadhar_number`),
  ADD UNIQUE KEY `pan_number` (`pan_number`),
  ADD UNIQUE KEY `account_number` (`account_number`);

--
-- Indexes for table `agent_customers`
--
ALTER TABLE `agent_customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_agent_customer` (`agent_id`,`customer_id`);

--
-- Indexes for table `agent_history`
--
ALTER TABLE `agent_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_id` (`agent_id`);

--
-- Indexes for table `cash_balance`
--
ALTER TABLE `cash_balance`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customer_balances`
--
ALTER TABLE `customer_balances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customer_permissions`
--
ALTER TABLE `customer_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_customer_permissions_customer` (`customer_id`);

--
-- Indexes for table `deal_price`
--
ALTER TABLE `deal_price`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employee_profile`
--
ALTER TABLE `employee_profile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `filling_history`
--
ALTER TABLE `filling_history`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `filling_logs`
--
ALTER TABLE `filling_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `filling_requests`
--
ALTER TABLE `filling_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `filling_stations`
--
ALTER TABLE `filling_stations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `filling_station_stocks`
--
ALTER TABLE `filling_station_stocks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fss_product_subproduct` (`fs_id`,`product`,`sub_product_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_invoice_number` (`invoice_number`);

--
-- Indexes for table `non_billing_stocks`
--
ALTER TABLE `non_billing_stocks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_codes`
--
ALTER TABLE `product_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`);

--
-- Indexes for table `purchase_for_use`
--
ALTER TABLE `purchase_for_use`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `recharge_requests`
--
ALTER TABLE `recharge_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `recharge_wallets`
--
ALTER TABLE `recharge_wallets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `retailers`
--
ALTER TABLE `retailers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `retailer_permissions`
--
ALTER TABLE `retailer_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `retailer_id` (`retailer_id`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee` (`employee_id`);

--
-- Indexes for table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`);

--
-- Indexes for table `wallet_history`
--
ALTER TABLE `wallet_history`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `agents`
--
ALTER TABLE `agents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `agent_customers`
--
ALTER TABLE `agent_customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `agent_history`
--
ALTER TABLE `agent_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `customer_balances`
--
ALTER TABLE `customer_balances`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_permissions`
--
ALTER TABLE `customer_permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `deal_price`
--
ALTER TABLE `deal_price`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `employee_profile`
--
ALTER TABLE `employee_profile`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `filling_history`
--
ALTER TABLE `filling_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `filling_logs`
--
ALTER TABLE `filling_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `filling_requests`
--
ALTER TABLE `filling_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `filling_stations`
--
ALTER TABLE `filling_stations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `filling_station_stocks`
--
ALTER TABLE `filling_station_stocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `non_billing_stocks`
--
ALTER TABLE `non_billing_stocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `product_codes`
--
ALTER TABLE `product_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_for_use`
--
ALTER TABLE `purchase_for_use`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `recharge_requests`
--
ALTER TABLE `recharge_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recharge_wallets`
--
ALTER TABLE `recharge_wallets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `retailers`
--
ALTER TABLE `retailers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `retailer_permissions`
--
ALTER TABLE `retailer_permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- AUTO_INCREMENT for table `stock`
--
ALTER TABLE `stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wallet_history`
--
ALTER TABLE `wallet_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agent_history`
--
ALTER TABLE `agent_history`
  ADD CONSTRAINT `agent_history_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_permissions`
--
ALTER TABLE `customer_permissions`
  ADD CONSTRAINT `fk_customer_permissions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_codes`
--
ALTER TABLE `product_codes`
  ADD CONSTRAINT `product_codes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `retailer_permissions`
--
ALTER TABLE `retailer_permissions`
  ADD CONSTRAINT `retailer_permissions_ibfk_1` FOREIGN KEY (`retailer_id`) REFERENCES `retailers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_profile` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
