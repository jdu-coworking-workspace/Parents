-- FAQ entries managed from the admin panel, separated per school and per app
-- (parents app / students app). Safe to run on existing MySQL 8+ databases.
-- New installs already have this table via database.sql.

CREATE TABLE IF NOT EXISTS `Faq` (
    `id` int NOT NULL AUTO_INCREMENT,
    `question` varchar(500) NOT NULL,
    `answer` text NOT NULL,
    `audience` enum ('parents', 'students') NOT NULL,
    `sort_order` int NOT NULL DEFAULT '0',
    `school_id` int NOT NULL,
    `admin_id` int DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `edited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_faq_school_audience_order` (`school_id`, `audience`, `sort_order`),
    KEY `idx_faq_admin_id` (`admin_id`),
    CONSTRAINT `Faq_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `School` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `Faq_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `Admin` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
