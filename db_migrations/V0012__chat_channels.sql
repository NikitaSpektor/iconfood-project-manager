CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  hint VARCHAR(160) NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  author VARCHAR(120) NOT NULL,
  author_login VARCHAR(80) NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_reads (
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  user_login VARCHAR(80) NOT NULL,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel_id, user_login)
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, id);

INSERT INTO channels (name, hint, position) VALUES
('Открытие Никольской', 'Проектный канал', 1),
('Шефы холдинга', 'Кухня всех ресторанов', 2),
('Маркетинг', 'Промо, съёмки, соцсети', 3),
('Общий чат холдинга', 'Все сотрудники', 4);

INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Дмитрий Соколов', 'dmitriy.sokolov', 'Алина, по закупке рыбы решили? Держит весь запуск.', NOW() - INTERVAL '3 hours' FROM channels WHERE name = 'Открытие Никольской';
INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Алина Ветрова', 'alina.vetrova', 'Два прайса на руках, третий обещали к обеду. Пересчёт сегодня.', NOW() - INTERVAL '2 hours 50 minutes' FROM channels WHERE name = 'Открытие Никольской';
INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Пётр Лазарев', 'petr.lazarev', 'Фудкост по осенней карте свёл, разница 3,4% в плюс.', NOW() - INTERVAL '2 hours' FROM channels WHERE name = 'Открытие Никольской';
INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Марина Ким', 'marina.kim', 'График официантов на открытие закину вечером в задачу.', NOW() - INTERVAL '1 hour' FROM channels WHERE name = 'Открытие Никольской';

INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Пётр Лазарев', 'petr.lazarev', 'Сезонные корнеплоды берём у того же фермера?', NOW() - INTERVAL '5 hours' FROM channels WHERE name = 'Шефы холдинга';
INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Артём Гурьев', 'artem.gurev', 'Да, но объём поднимаем на 20% — Хлебный открывается.', NOW() - INTERVAL '4 hours' FROM channels WHERE name = 'Шефы холдинга';

INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Егор Тимофеев', 'egor.timofeev', 'Студию на съёмку блюд забронировал на 13-е.', NOW() - INTERVAL '6 hours' FROM channels WHERE name = 'Маркетинг';
INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Ксения Родина', 'kseniya.rodina', 'Реквизит подберу, нужен список позиций.', NOW() - INTERVAL '5 hours' FROM channels WHERE name = 'Маркетинг';

INSERT INTO messages (channel_id, author, author_login, text, created_at) SELECT id, 'Дмитрий Соколов', 'dmitriy.sokolov', 'Коллеги, отчёт по неделе собираем к пятнице.', NOW() - INTERVAL '7 hours' FROM channels WHERE name = 'Общий чат холдинга';
