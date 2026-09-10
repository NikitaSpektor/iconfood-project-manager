UPDATE notifications SET is_read = TRUE WHERE task_title = 'Проверка письма по шаблону';
UPDATE tasks SET title = 'Закупки: пример задачи из шаблона', track = 'Задачи' WHERE title = 'Проверка письма по шаблону';
