UPDATE t_p60921926_iconfood_project_man.planner_entries
SET archived = FALSE,
    title = 'Тренинг на Павелецкой',
    updated_at = NOW()
WHERE id = 10;

UPDATE t_p60921926_iconfood_project_man.planner_entries
SET archived = TRUE
WHERE id = 12;