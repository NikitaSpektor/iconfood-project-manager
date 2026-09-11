INSERT INTO t_p60921926_iconfood_project_man.channels (name, hint, position, is_open, kind, unit)
VALUES ('Колл-центр', 'Команда подразделения', 10, FALSE, 'channel', 'Колл-центр');

INSERT INTO t_p60921926_iconfood_project_man.channel_members (channel_id, user_login, active)
SELECT c.id, u.login, TRUE
FROM t_p60921926_iconfood_project_man.channels c
JOIN t_p60921926_iconfood_project_man.users u ON u.restaurant = 'Колл-центр' AND u.active = TRUE
WHERE c.unit = 'Колл-центр' AND c.kind = 'channel'
ON CONFLICT (channel_id, user_login) DO NOTHING;