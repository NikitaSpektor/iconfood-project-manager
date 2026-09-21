ALTER TABLE t_p60921926_iconfood_project_man.comments
ADD COLUMN IF NOT EXISTS subtask_id INTEGER DEFAULT NULL;

ALTER TABLE t_p60921926_iconfood_project_man.attachments
ADD COLUMN IF NOT EXISTS subtask_id INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_subtask
ON t_p60921926_iconfood_project_man.comments (subtask_id);

CREATE INDEX IF NOT EXISTS idx_attachments_subtask
ON t_p60921926_iconfood_project_man.attachments (subtask_id);