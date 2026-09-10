ALTER TABLE channels ADD COLUMN IF NOT EXISTS unit VARCHAR(120) NOT NULL DEFAULT '';

UPDATE channels SET unit = 'Фабрика', hint = 'Производство и отгрузки по ресторанам', is_open = FALSE WHERE name = 'Фабрика';

INSERT INTO channels (name, hint, position, is_open, created_by, kind, unit)
SELECT u.restaurant, 'Команда подразделения', 10, FALSE, '', 'channel', u.restaurant
FROM (SELECT DISTINCT restaurant FROM users WHERE active = TRUE AND restaurant <> '') u
WHERE NOT EXISTS (SELECT 1 FROM channels c WHERE c.unit = u.restaurant);

INSERT INTO channel_members (channel_id, user_login, active)
SELECT c.id, u.login, TRUE
FROM channels c
JOIN users u ON u.restaurant = c.unit AND u.active = TRUE
WHERE c.unit <> ''
ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE;
