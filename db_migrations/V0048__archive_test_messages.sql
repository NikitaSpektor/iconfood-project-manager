ALTER TABLE t_p60921926_iconfood_project_man.messages
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE t_p60921926_iconfood_project_man.messages
SET archived = TRUE
WHERE text = '[сообщение удалено]';