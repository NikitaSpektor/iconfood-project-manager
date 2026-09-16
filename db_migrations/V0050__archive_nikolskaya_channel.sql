UPDATE t_p60921926_iconfood_project_man.channels
SET archived = TRUE
WHERE id = 1;

UPDATE t_p60921926_iconfood_project_man.channel_members
SET active = FALSE
WHERE channel_id = 1;