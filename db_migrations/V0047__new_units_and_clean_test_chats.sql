-- Новые подразделения: переводим сотрудников
UPDATE t_p60921926_iconfood_project_man.users
SET restaurant = 'Отдел обучения и развития персонала'
WHERE login IN ('nikita.spektor', 'anna.shuvalova', 'yan.tarasenko');

UPDATE t_p60921926_iconfood_project_man.users
SET restaurant = 'Департамент маркетинга'
WHERE login IN ('margo.filina', 'veronika.zambalova', 'alina.lusyk', 'dasha.radionova', 'diana.aypova');

UPDATE t_p60921926_iconfood_project_man.users
SET restaurant = 'Финансовый департамент'
WHERE login IN ('marina.glushkova', 'nadezhda.petrenko');

-- Каналы подразделений
INSERT INTO t_p60921926_iconfood_project_man.channels (name, hint, position, is_open, created_by, kind, unit)
SELECT u.unit, 'Команда подразделения', 10, FALSE, '', 'channel', u.unit
FROM (VALUES
  ('Отдел обучения и развития персонала'),
  ('Департамент маркетинга'),
  ('Финансовый департамент')
) AS u(unit)
WHERE NOT EXISTS (
  SELECT 1 FROM t_p60921926_iconfood_project_man.channels c
  WHERE c.unit = u.unit AND c.archived = FALSE
);

-- Переводим сотрудников в канал своего подразделения
UPDATE t_p60921926_iconfood_project_man.channel_members m
SET active = FALSE
FROM t_p60921926_iconfood_project_man.users usr,
     t_p60921926_iconfood_project_man.channels ch
WHERE m.user_login = usr.login
  AND m.channel_id = ch.id
  AND ch.unit <> ''
  AND ch.unit <> usr.restaurant
  AND usr.restaurant IN ('Отдел обучения и развития персонала', 'Департамент маркетинга', 'Финансовый департамент');

INSERT INTO t_p60921926_iconfood_project_man.channel_members (channel_id, user_login, active)
SELECT ch.id, usr.login, TRUE
FROM t_p60921926_iconfood_project_man.users usr
JOIN t_p60921926_iconfood_project_man.channels ch
  ON ch.unit = usr.restaurant AND ch.archived = FALSE
WHERE usr.active = TRUE
  AND usr.restaurant IN ('Отдел обучения и развития персонала', 'Департамент маркетинга', 'Финансовый департамент')
ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE;

-- Тестовые переписки: прячем проверочные сообщения и пустые личные чаты
UPDATE t_p60921926_iconfood_project_man.messages
SET text = '[сообщение удалено]', file_url = '', file_name = '', file_mime = '', file_size = 0
WHERE id IN (19, 20, 26, 28, 29, 30, 32);

UPDATE t_p60921926_iconfood_project_man.channels
SET archived = TRUE
WHERE kind = 'direct'
  AND id IN (23, 24)
  AND NOT EXISTS (
    SELECT 1 FROM t_p60921926_iconfood_project_man.messages m
    WHERE m.channel_id = channels.id AND m.text <> '[сообщение удалено]'
  );