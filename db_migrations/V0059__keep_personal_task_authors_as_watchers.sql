UPDATE tasks t
SET watchers = CASE WHEN COALESCE(t.watchers, '') = '' THEN u.name
                    ELSE t.watchers || '|' || u.name END
FROM users u
WHERE u.login = t.owner_login
  AND t.archived = FALSE
  AND t.owner_login <> ''
  AND POSITION(u.name IN COALESCE(t.assignee, '')) = 0
  AND POSITION(u.name IN COALESCE(t.watchers, '')) = 0;
