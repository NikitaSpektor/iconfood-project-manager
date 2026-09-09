UPDATE users SET name = 'Алина Лысюк' WHERE login = 'alina.lusyk';
UPDATE users SET name = 'Диана Аюпова' WHERE login = 'diana.aypova';

INSERT INTO users (name, login, email, password_hash, role, restaurant, position, active) VALUES
('Владимир Ануфриев', 'vladimir.anufriev', 'vladimir.anufriev@iconfood.ru', 'a17ff82493e89f5356b5a5c52a9221a8522116a650361f60e5f4951207a61b91', 'chef', 'Управляющая компания', 'Бренд-шеф-бармен', TRUE),
('Кирилл Генкин', 'kirill.genkin', 'kirill.genkin@iconfood.ru', 'bc43481b4b537efc2dcbda5a136fc7748d40435395ba20ae304b1d9a07861955', 'chef', 'Управляющая компания', 'Шеф-бариста', TRUE),
('Антон Чернышов', 'anton.chernishov', 'anton.chernishov@iconfood.ru', '5426de8579b23981c1ac87a8e8eecd4d84cbe9ea35173e385a258f5a463c1679', 'chef', 'Управляющая компания', 'Бренд-бармен', TRUE),
('Сергей Буланов', 'sergey.bulanov', 'sergey.bulanov@iconfood.ru', '12445f4bccb3474c229c0909989d12e702c0ee185fb86f9f4ffcab11f356dba0', 'chef', 'Авиапарк', 'Шеф-повар', TRUE),
('Ирина Савельева', 'irina.savelieva', 'irina.savelieva@iconfood.ru', 'f8e17ad43e84d66a52f1ffff5505b24d0092012dcef53296b08a7c43ea5be859', 'chef', 'Метрополис', 'Шеф-повар', TRUE),
('Денис Котов', 'denis.kotov', 'denis.kotov@iconfood.ru', '1a8e71b8007474ad6a03940217bb258281582387bf7a0db1399515aa0cef4ac1', 'chef', 'Кунцево Плаза', 'Шеф-повар', TRUE),
('Алексей Журов', 'alexey.zhurov', 'alexey.zhurov@iconfood.ru', 'da518a5e20b2c2ed7b75c2b120dd6728ca38d280c128948f18c523ae58c0a22c', 'chef', 'Каширская Плаза', 'Шеф-повар', TRUE),
('Екатерина Силина', 'ekaterina.silina', 'ekaterina.silina@iconfood.ru', '502d1954eced97712b4448d767f87f8558101ea840dd2b41c8328828884592b2', 'chef', 'Мега Химки', 'Шеф-повар', TRUE),
('Михаил Доронин', 'mihail.doronin', 'mihail.doronin@iconfood.ru', '5ec126102d8097d45df50a001a44bb033c903b5cc7a44f25dd9f98119eef45bf', 'chef', 'Мега Теплый Стан', 'Шеф-повар', TRUE),
('Артур Сафин', 'artur.safin', 'artur.safin@iconfood.ru', '79522ec338e93ba5797f38a82088f5a89a88e31b4bb49f16bfc8945f5ebc0411', 'chef', 'Саларис', 'Шеф-повар', TRUE),
('Лидия Кротова', 'lidiya.krotova', 'lidiya.krotova@iconfood.ru', '92c45014ea5a23d531fe4f71a24ca72d359c2a98018514c4f72267af42c81ee3', 'chef', 'Океания', 'Шеф-повар', TRUE),
('Игорь Пашков', 'igor.pashkov', 'igor.pashkov@iconfood.ru', 'e412815a55903ddd15e58946486c0a446ce1a258874666324b9f43a41ee421f1', 'chef', 'Павелецкая', 'Шеф-повар', TRUE),
('Наталья Рыбина', 'nataliya.rybina', 'nataliya.rybina@iconfood.ru', 'd72275be7ae8cb158ae0dd9dd9c18a008e6d65740823bdca52eff1df52253335', 'chef', 'Проспект Мира', 'Шеф-повар', TRUE),
('Степан Моисеев', 'stepan.moiseev', 'stepan.moiseev@iconfood.ru', '963491838937bd6b05f390e2a7b7952101f2036ee25bb08fa3986cff53c82739', 'chef', 'Блэк Маркет', 'Шеф-повар', TRUE),
('Галина Орехова', 'galina.orehova', 'galina.orehova@iconfood.ru', 'ebc95856efed612f12d63a768cfa1a5371d64caec21194592023a895ff7ed769', 'chef', 'Афимолл', 'Шеф-повар', TRUE),
('Оксана Демидова', 'oksana.demidova', 'oksana.demidova@iconfood.ru', '61c027f58158b4a52c9425cbe866125f0c7347e00328de9f603090a1d15a6630', 'staff', 'Авиапарк', 'Менеджер зала', TRUE),
('Григорий Панов', 'grigoriy.panov', 'grigoriy.panov@iconfood.ru', '6ef9b45b2a05db3b791565efc473ac29b72e272d5d2e21d8c0a36343b4d8bd9a', 'staff', 'Метрополис', 'Менеджер зала', TRUE),
('Светлана Ильина', 'svetlana.ilina', 'svetlana.ilina@iconfood.ru', '7448867869b876487be26cb18f613c30f115b15d111cafa5c297d3ccd4025f0a', 'staff', 'Саларис', 'Бариста', TRUE),
('Рустам Валеев', 'rustam.valeev', 'rustam.valeev@iconfood.ru', 'fb2ada1bd9b10cefafddbfed26036fdb845ed65c37ca98dc46599b8d7bd463ee', 'staff', 'Афимолл', 'Бармен', TRUE),
('Евгения Мишина', 'evgeniya.mishina', 'evgeniya.mishina@iconfood.ru', '2565aced9e685ac7eac4ec30c322927544329de7231f956bbba8a8055398e545', 'staff', 'Океания', 'Су-шеф', TRUE),
('Борис Терентьев', 'boris.terentiev', 'boris.terentiev@iconfood.ru', '4369c26843309aebd55f371a4f77145cbdf3a32daf96e65ec169a40f3302ca50', 'staff', 'Мега Химки', 'Су-шеф', TRUE)
ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position,
  restaurant = EXCLUDED.restaurant, role = EXCLUDED.role, active = TRUE;
