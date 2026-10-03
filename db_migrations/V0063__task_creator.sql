ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by VARCHAR(120) NOT NULL DEFAULT '';
UPDATE tasks t SET created_by = t.owner_login WHERE t.created_by = '' AND t.owner_login <> '' AND t.owner_login IS NOT NULL;
UPDATE tasks t SET created_by = sub.login FROM (
  SELECT DISTINCT ON (n.task_id) n.task_id, u.login
  FROM notifications n JOIN users u ON u.name = n.actor
  WHERE n.kind = 'task'
  ORDER BY n.task_id, n.id
) sub
WHERE t.created_by = '' AND sub.task_id = t.id;
