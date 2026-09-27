ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS created_by VARCHAR(120) NOT NULL DEFAULT '';
UPDATE planner_entries SET created_by = user_login WHERE created_by = '';
