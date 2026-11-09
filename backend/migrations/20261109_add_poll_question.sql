-- Poll.question for databases created before the question column.
-- Safe to run more than once. Run 20261028_add_poll_tables.sql first.

SET @poll_question_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Poll'
      AND COLUMN_NAME = 'question'
);

SET @poll_question_sql := IF(
    @poll_question_exists = 0,
    'ALTER TABLE `Poll` ADD COLUMN `question` varchar(500) NOT NULL DEFAULT '''' AFTER `post_id`',
    'SELECT 1'
);

PREPARE poll_question_stmt FROM @poll_question_sql;
EXECUTE poll_question_stmt;
DEALLOCATE PREPARE poll_question_stmt;
