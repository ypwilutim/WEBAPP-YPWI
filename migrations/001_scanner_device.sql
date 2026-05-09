-- Migration: Scanner Device Attendance System
-- Created: 2026-05-07
-- Purpose: Support offline QR-based attendance for remote areas

-- Table: scanner_devices
-- Stores registered scanner devices (tablets/phones) installed at each school
CREATE TABLE IF NOT EXISTS `scanner_devices` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `device_id` VARCHAR(100) NOT NULL UNIQUE,
  `tenant_id` VARCHAR(20) NOT NULL,
  `school_name` VARCHAR(100) NOT NULL,
  `secret_key` VARCHAR(255) NOT NULL,
  `status` ENUM('active','inactive','maintenance') DEFAULT 'active',
  `last_sync` DATETIME DEFAULT NULL,
  `device_name` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: qr_attendance_logs
-- Stores raw QR scan logs (offline queue + audit trail)
CREATE TABLE IF NOT EXISTS `qr_attendance_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `scan_id` VARCHAR(20) NOT NULL,
  `teacher_id` INT(11) DEFAULT NULL,
  `device_id` VARCHAR(100) NOT NULL,
  `tenant_id` VARCHAR(20) NOT NULL,
  `waktu_scan` DATETIME NOT NULL,
  `jenis` ENUM('masuk','pulang') NOT NULL,
  `signature` VARCHAR(255) NOT NULL,
  `sync_status` ENUM('pending','synced','failed','rejected') DEFAULT 'pending',
  `error_message` TEXT DEFAULT NULL,
  `offline_validated` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `synced_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_scan_id` (`scan_id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_sync_status` (`sync_status`),
  KEY `idx_waktu_scan` (`waktu_scan`),
  CONSTRAINT `qr_attendance_logs_ibfk_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE SET NULL,
  CONSTRAINT `qr_attendance_logs_ibfk_device` FOREIGN KEY (`device_id`) REFERENCES `scanner_devices`(`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: tenant_id in qr_attendance_logs is denormalized (copied from scanner_devices)
-- This ensures data integrity even if school assignment changes later

-- End of migration
