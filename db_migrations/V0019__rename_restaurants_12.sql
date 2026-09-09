UPDATE users SET restaurant = 'Авиапарк' WHERE restaurant = 'Никольская';
UPDATE users SET restaurant = 'Метрополис' WHERE restaurant = 'Патриаршие';
UPDATE users SET restaurant = 'Кунцево Плаза' WHERE restaurant = 'Смоленка';
UPDATE users SET restaurant = 'Каширская Плаза' WHERE restaurant = 'Хлебный';

WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users
), spots AS (
  SELECT unnest(ARRAY['Авиапарк','Метрополис','Кунцево Плаза','Каширская Плаза','Мега Химки','Мега Теплый Стан','Саларис','Океания','Павелецкая','Проспект Мира','Блэк Маркет','Афимолл']) AS name,
         generate_series(1, 12) AS pos
)
UPDATE users u SET restaurant = s.name
FROM numbered n, spots s
WHERE u.id = n.id AND s.pos = ((n.rn - 1) % 12) + 1;

UPDATE tasks SET restaurant = 'Авиапарк' WHERE restaurant = 'Никольская';
UPDATE tasks SET restaurant = 'Метрополис' WHERE restaurant = 'Патриаршие';
UPDATE tasks SET restaurant = 'Кунцево Плаза' WHERE restaurant = 'Смоленка';
UPDATE tasks SET restaurant = 'Каширская Плаза' WHERE restaurant = 'Хлебный';
