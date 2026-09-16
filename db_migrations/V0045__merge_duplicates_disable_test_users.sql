-- Объединяем дубли: рабочими остаются yan.tarasenko и anna.shuvalova
UPDATE t_p60921926_iconfood_project_man.tasks SET assignee = replace(assignee, 'Тарасенко Ян', 'Ян Тарасенко') WHERE assignee LIKE '%Тарасенко Ян%';
UPDATE t_p60921926_iconfood_project_man.tasks SET assignee = replace(assignee, 'Шувалова Анна', 'Анна Шувалова') WHERE assignee LIKE '%Шувалова Анна%';
UPDATE t_p60921926_iconfood_project_man.tasks SET watchers = replace(watchers, 'Тарасенко Ян', 'Ян Тарасенко') WHERE watchers LIKE '%Тарасенко Ян%';
UPDATE t_p60921926_iconfood_project_man.tasks SET watchers = replace(watchers, 'Шувалова Анна', 'Анна Шувалова') WHERE watchers LIKE '%Шувалова Анна%';
UPDATE t_p60921926_iconfood_project_man.tasks SET owner_login = 'yan.tarasenko' WHERE owner_login = 'tarasenko';
UPDATE t_p60921926_iconfood_project_man.tasks SET owner_login = 'anna.shuvalova' WHERE owner_login = 'shuvalova';
UPDATE t_p60921926_iconfood_project_man.messages SET author_login = 'yan.tarasenko', author = 'Ян Тарасенко' WHERE author_login = 'tarasenko';
UPDATE t_p60921926_iconfood_project_man.messages SET author_login = 'anna.shuvalova', author = 'Анна Шувалова' WHERE author_login = 'shuvalova';
UPDATE t_p60921926_iconfood_project_man.comments SET author_login = 'yan.tarasenko', author = 'Ян Тарасенко' WHERE author_login = 'tarasenko';
UPDATE t_p60921926_iconfood_project_man.comments SET author_login = 'anna.shuvalova', author = 'Анна Шувалова' WHERE author_login = 'shuvalova';
UPDATE t_p60921926_iconfood_project_man.attachments SET author = 'Ян Тарасенко' WHERE author = 'Тарасенко Ян';
UPDATE t_p60921926_iconfood_project_man.attachments SET author = 'Анна Шувалова' WHERE author = 'Шувалова Анна';
UPDATE t_p60921926_iconfood_project_man.notifications SET recipient_login = 'yan.tarasenko' WHERE recipient_login = 'tarasenko';
UPDATE t_p60921926_iconfood_project_man.notifications SET recipient_login = 'anna.shuvalova' WHERE recipient_login = 'shuvalova';

-- Переносим участие в каналах, где действующей карточки там ещё нет
UPDATE t_p60921926_iconfood_project_man.channel_members m SET user_login = 'yan.tarasenko'
WHERE m.user_login = 'tarasenko' AND NOT EXISTS (
  SELECT 1 FROM t_p60921926_iconfood_project_man.channel_members x
  WHERE x.channel_id = m.channel_id AND x.user_login = 'yan.tarasenko');
UPDATE t_p60921926_iconfood_project_man.channel_members m SET user_login = 'anna.shuvalova'
WHERE m.user_login = 'shuvalova' AND NOT EXISTS (
  SELECT 1 FROM t_p60921926_iconfood_project_man.channel_members x
  WHERE x.channel_id = m.channel_id AND x.user_login = 'anna.shuvalova');

-- Отключаем всё, что осталось от дублей и тестовых сотрудников
UPDATE t_p60921926_iconfood_project_man.channel_members SET active = FALSE
WHERE user_login IN ('tarasenko', 'shuvalova')
   OR user_login IN (SELECT login FROM t_p60921926_iconfood_project_man.users WHERE active = FALSE);

UPDATE t_p60921926_iconfood_project_man.users
SET active = FALSE, email = '', login = login || '.merged'
WHERE login IN ('tarasenko', 'shuvalova');

UPDATE t_p60921926_iconfood_project_man.users SET email = '' WHERE active = FALSE;