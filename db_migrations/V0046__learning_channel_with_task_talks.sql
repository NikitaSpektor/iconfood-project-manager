-- Канал отдела обучения и развития персонала
INSERT INTO t_p60921926_iconfood_project_man.channels (name, hint, position, is_open, created_by, kind, unit)
SELECT 'Обучение и развитие', 'Тренинги, аттестации, наставничество', 5, TRUE, 'system', 'channel', ''
WHERE NOT EXISTS (
  SELECT 1 FROM t_p60921926_iconfood_project_man.channels
  WHERE name = 'Обучение и развитие' AND archived = FALSE
);

-- Участники: ответственные за обучение
INSERT INTO t_p60921926_iconfood_project_man.channel_members (channel_id, user_login, active)
SELECT c.id, u.login, TRUE
FROM t_p60921926_iconfood_project_man.channels c
CROSS JOIN t_p60921926_iconfood_project_man.users u
WHERE c.name = 'Обучение и развитие' AND c.archived = FALSE
  AND u.active = TRUE
  AND u.login IN ('nikita.spektor', 'anna.shuvalova', 'yan.tarasenko')
ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE;

-- Переносим обсуждения задач Управляющей компании как сообщения канала
INSERT INTO t_p60921926_iconfood_project_man.messages
  (channel_id, author, author_login, text, created_at, via)
SELECT c.id,
       cm.author,
       cm.author_login,
       'Задача «' || t.title || '»: ' || cm.text,
       cm.created_at,
       'task'
FROM t_p60921926_iconfood_project_man.comments cm
JOIN t_p60921926_iconfood_project_man.tasks t ON t.id = cm.task_id
CROSS JOIN t_p60921926_iconfood_project_man.channels c
WHERE c.name = 'Обучение и развитие' AND c.archived = FALSE
  AND t.restaurant = 'Управляющая компания'
  AND NOT EXISTS (
    SELECT 1 FROM t_p60921926_iconfood_project_man.messages m
    WHERE m.channel_id = c.id
      AND m.text = 'Задача «' || t.title || '»: ' || cm.text
      AND m.created_at = cm.created_at
  );