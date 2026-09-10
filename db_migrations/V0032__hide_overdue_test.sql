UPDATE tasks SET column_id = 'done', title = 'Проверка контроля сроков' WHERE title = 'Тест просрочки';
UPDATE messages SET text = 'Проверили контроль сроков — уведомления о просрочке работают.' WHERE text LIKE '%Тест просрочки%';
