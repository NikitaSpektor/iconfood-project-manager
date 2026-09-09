ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(120) NOT NULL DEFAULT '';

UPDATE users SET login = 'regina.bozhkova', name = 'Регина Божкова', email = 'regina.bozhkova@iconfood.ru',
  password_hash = '7a38d1b1b8592178a15c9473d328dae428438d9e2132b9f7fbfba62ba28a8dd2'
WHERE login = 'regina.akramova';

UPDATE users SET position = 'Руководитель отдела обучения' WHERE login = 'nikita.spektor';
UPDATE users SET position = 'Операционный директор' WHERE login = 'marina.gavrilova';
UPDATE users SET position = 'Генеральный директор' WHERE login = 'elena.metla';
UPDATE users SET position = 'Бренд-директор' WHERE login = 'margo.filina';
UPDATE users SET position = 'Руководитель доставки' WHERE login = 'tatiana.kamaeva';
UPDATE users SET position = 'Директор по развитию' WHERE login = 'vlad.terlikov';
UPDATE users SET position = 'Директор по эстетике' WHERE login = 'olga.lubina';
UPDATE users SET position = 'Дизайнер' WHERE login = 'diana.aypova';
UPDATE users SET position = 'Специалист отдела маркетинга' WHERE login = 'veronika.zambalova';
UPDATE users SET position = 'Специалист отдела маркетинга' WHERE login = 'alina.lusyk';
UPDATE users SET position = 'Тренинг-менеджер' WHERE login = 'anna.shuvalova';
UPDATE users SET position = 'Тренинг-менеджер' WHERE login = 'yan.tarasenko';
UPDATE users SET position = 'Дизайнер' WHERE login = 'dasha.radionova';
UPDATE users SET position = 'Технический директор' WHERE login = 'andrej.viller';
UPDATE users SET position = 'Технолог' WHERE login = 'victor.demin';
UPDATE users SET position = 'Бренд-шеф-кондитер' WHERE login = 'victor.aleksandrov';
UPDATE users SET position = 'Бренд-шеф' WHERE login = 'pavel.larionov';
UPDATE users SET position = 'Директор фабрики' WHERE login = 'alla.zavarnicina';

UPDATE users SET position = 'Управляющий', restaurant = 'Саларис' WHERE login = 'nikita.sidanov';
UPDATE users SET position = 'Управляющая', restaurant = 'Океания' WHERE login = 'dasha.volkova';
UPDATE users SET position = 'Управляющий', restaurant = 'Афимолл' WHERE login = 'kirill.lipatov';
UPDATE users SET position = 'Управляющий', restaurant = 'Мега Химки' WHERE login = 'pavel.kashnikov';
UPDATE users SET position = 'Управляющая', restaurant = 'Метрополис' WHERE login = 'anastasiya.garaeva';
UPDATE users SET position = 'Управляющая', restaurant = 'Каширская Плаза' WHERE login = 'regina.chernishova';
UPDATE users SET position = 'Управляющая', restaurant = 'Кунцево Плаза' WHERE login = 'regina.bozhkova';
UPDATE users SET position = 'Управляющая', restaurant = 'Авиапарк' WHERE login = 'juliya.panina';
UPDATE users SET position = 'Управляющая', restaurant = 'Проспект Мира' WHERE login = 'tanya.maslova';
UPDATE users SET position = 'Управляющий', restaurant = 'Павелецкая' WHERE login = 'alexsander.lusenko';
UPDATE users SET position = 'Управляющий', restaurant = 'Блэк Маркет' WHERE login = 'vasilij.dvoeglazov';

UPDATE users SET role = 'manager' WHERE position ILIKE 'Управляющ%';
UPDATE users SET role = 'owner' WHERE login IN ('elena.metla', 'marina.gavrilova');
UPDATE users SET role = 'chef' WHERE login IN ('pavel.larionov', 'victor.aleksandrov', 'victor.demin');

UPDATE users SET restaurant = 'Управляющая компания'
WHERE position <> '' AND position NOT ILIKE 'Управляющ%';
