UPDATE channel_members SET active = FALSE
WHERE user_login IN (SELECT login FROM users WHERE active = FALSE);

UPDATE sessions SET expires_at = NOW() - INTERVAL '1 day'
WHERE user_id IN (SELECT id FROM users WHERE active = FALSE);

UPDATE notifications SET is_read = TRUE
WHERE recipient_login IN (SELECT login FROM users WHERE active = FALSE);
