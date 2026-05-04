-- Add location columns to tenants table
ALTER TABLE `tenants`
ADD COLUMN `latitude` decimal(10,8) DEFAULT NULL,
ADD COLUMN `longitude` decimal(11,8) DEFAULT NULL,
ADD COLUMN `location_radius` int(11) DEFAULT 100,
ADD COLUMN `location_name` varchar(255) DEFAULT NULL;