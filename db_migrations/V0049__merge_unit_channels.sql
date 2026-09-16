-- Переносим переписку из созданного ранее канала обучения в канал подразделения
UPDATE t_p60921926_iconfood_project_man.messages
SET channel_id = 26
WHERE channel_id = 25;

UPDATE t_p60921926_iconfood_project_man.channels
SET archived = TRUE
WHERE id = 25;

UPDATE t_p60921926_iconfood_project_man.channel_members
SET active = FALSE
WHERE channel_id = 25;

-- Уточняем описание каналов подразделений
UPDATE t_p60921926_iconfood_project_man.channels
SET hint = 'Тренинги, аттестации, наставничество'
WHERE id = 26;

UPDATE t_p60921926_iconfood_project_man.channels
SET hint = 'Промо, съёмки, соцсети'
WHERE id = 28;

UPDATE t_p60921926_iconfood_project_man.channels
SET hint = 'Бюджеты, отчётность, фудкост'
WHERE id = 27;

-- Старый общий канал маркетинга уступает место департаменту
UPDATE t_p60921926_iconfood_project_man.messages
SET channel_id = 28
WHERE channel_id = 3;

UPDATE t_p60921926_iconfood_project_man.channels
SET archived = TRUE
WHERE id = 3;