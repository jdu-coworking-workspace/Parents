-- Poll (so'rovnoma) qo'llab-quvvatlashi. MySQL 8+.

CREATE TABLE IF NOT EXISTS `Poll` (
    `id` int NOT NULL AUTO_INCREMENT,
    `post_id` int NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_poll_post_id` (`post_id`),
    CONSTRAINT `Poll_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PollOption` (
    `id` int NOT NULL AUTO_INCREMENT,
    `poll_id` int NOT NULL,
    `option_text` varchar(255) NOT NULL,
    `position` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_polloption_poll_id` (`poll_id`),
    CONSTRAINT `PollOption_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `Poll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PollVote` (
    `id` int NOT NULL AUTO_INCREMENT,
    `poll_id` int NOT NULL,
    `option_id` int NOT NULL,
    `voter_type` enum ('parent', 'student') NOT NULL,
    `voter_id` int NOT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pollvote_voter` (`poll_id`, `voter_type`, `voter_id`),
    KEY `idx_pollvote_option_id` (`option_id`),
    CONSTRAINT `PollVote_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `Poll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `PollVote_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `PollOption` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;