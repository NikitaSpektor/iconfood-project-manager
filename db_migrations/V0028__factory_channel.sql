INSERT INTO channels (name, hint, position, is_open, created_by, kind)
SELECT 'Фабрика', 'Производство и отгрузки по ресторанам', 5, TRUE, '', 'channel'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Фабрика');

INSERT INTO messages (channel_id, author, author_login, text, created_at)
SELECT id, 'Алла Заварницина', 'alla.zavarnicina', 'Открыла канал фабрики. Сюда пишем заявки на производство, вопросы по отгрузкам и качеству партий.', NOW() - INTERVAL '2 hours'
FROM channels WHERE name = 'Фабрика';

INSERT INTO messages (channel_id, author, author_login, text, created_at)
SELECT id, 'Алла Заварницина', 'alla.zavarnicina', 'Заявки на следующую неделю принимаю до четверга включительно — так успеваем спланировать смены и сырьё.', NOW() - INTERVAL '90 minutes'
FROM channels WHERE name = 'Фабрика';

INSERT INTO messages (channel_id, author, author_login, text, created_at)
SELECT id, 'Павел Ларионов', 'pavel.larionov', 'Принял. По соусам для осенней карты объём поднимаем, пришлю расчёт завтра.', NOW() - INTERVAL '55 minutes'
FROM channels WHERE name = 'Фабрика';
