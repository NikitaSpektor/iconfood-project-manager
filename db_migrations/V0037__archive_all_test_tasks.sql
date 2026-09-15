UPDATE t_p60921926_iconfood_project_man.subtasks SET archived = TRUE WHERE archived = FALSE;
UPDATE t_p60921926_iconfood_project_man.attachments SET archived = TRUE WHERE archived = FALSE;
UPDATE t_p60921926_iconfood_project_man.tasks SET archived = TRUE WHERE archived = FALSE;
UPDATE t_p60921926_iconfood_project_man.notifications SET is_read = TRUE WHERE is_read = FALSE;