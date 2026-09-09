INSERT INTO users (name, login, email, password_hash, role, restaurant, position, active) VALUES
('Надежда Петренко', 'nadezhda.petrenko', 'nadezhda.petrenko@iconfood.ru', '5527fe4f253ebf516cd9f0efd5e56ddc3f56dc5be4c4f4c509b83e020962791e', 'manager', 'Управляющая компания', 'Ведущий специалист по закупкам', TRUE),
('Марина Глушкова', 'marina.glushkova', 'marina.glushkova@iconfood.ru', '6956046c4d316e284aa4ec6b2dc09b182697be0c9d9d17c33bac7ab2f1720204', 'owner', 'Управляющая компания', 'Коммерческий директор', TRUE)
ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position,
  restaurant = EXCLUDED.restaurant, role = EXCLUDED.role, active = TRUE;
