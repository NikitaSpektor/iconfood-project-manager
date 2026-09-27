INSERT INTO channel_members (channel_id, user_login, active)
SELECT 22, u.login, TRUE FROM users u
WHERE u.login IN ('kolosov','goncharova','p.miheev','e.miheeva','kokoreva','hasanova')
ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE;
