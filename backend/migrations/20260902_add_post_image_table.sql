-- Store multiple images per post. Safe to run on existing MySQL 8+ databases.
-- New installs already have this table via database.sql.

CREATE TABLE IF NOT EXISTS `PostImage` (
    `id` int NOT NULL AUTO_INCREMENT,
    `post_id` int NOT NULL,
    `image_url` varchar(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_postimage_post_id` (`post_id`),
    CONSTRAINT `PostImage_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
