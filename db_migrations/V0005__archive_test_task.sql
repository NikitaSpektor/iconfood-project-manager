UPDATE subtasks SET archived = TRUE WHERE task_id IN (SELECT id FROM tasks WHERE title = 'Проверка сохранения');
UPDATE tasks SET archived = TRUE WHERE title = 'Проверка сохранения';
