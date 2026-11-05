-- So'rovnomaga savol (question) ustunini qo'shish va bitta postga bir nechta poll bog'lashga ruxsat berish

ALTER TABLE `Poll` ADD COLUMN `question` VARCHAR(255) NULL AFTER `post_id`;
ALTER TABLE `Poll` DROP INDEX `uq_poll_post_id`, ADD INDEX `idx_poll_post_id` (`post_id`);

