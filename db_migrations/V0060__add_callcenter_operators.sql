INSERT INTO users (name, login, email, password_hash, role, restaurant, position) VALUES
('Александр Колосов', 'kolosov', 'udc-dostavka@iconfood.ru', 'a276c091b73cf9e5df8f9368aae77e82de4b4f6f93e9b829e871032ad83420bb', 'staff', 'Колл-центр', 'Оператор'),
('Наталья Гончарова', 'goncharova', 'udc-dostavka@iconfood.ru', '06a53e472811ad363cf153dca0273a9b55abaa0c8c7690bc4827fb4a44767625', 'staff', 'Колл-центр', 'Оператор'),
('Петр Михеев', 'p.miheev', 'udc-dostavka@iconfood.ru', '5b08d654e703d2b0d42c69952f3e694bec9b2bd44e0eb518f5ec87be17cfe34c', 'staff', 'Колл-центр', 'Оператор'),
('Эмилия Михеева', 'e.miheeva', 'udc-dostavka@iconfood.ru', 'a9dc7190d02725ce47c8adfa032d764f4638198790bcf8208056f7288e58fee7', 'staff', 'Колл-центр', 'Оператор'),
('Ирина Кокорева', 'kokoreva', 'udc-dostavka@iconfood.ru', '168faeb3527e9f93ab60f994e36a62db2e6359b904e0e6227273c19003666fb5', 'staff', 'Колл-центр', 'Оператор'),
('Руслана Хасанова', 'hasanova', 'udc-dostavka@iconfood.ru', '9a11b41d4e49c524b33bdd8db9ff1b916149e075e25b653bd07141676d76b4c1', 'staff', 'Колл-центр', 'Оператор')
ON CONFLICT (login) DO NOTHING;
