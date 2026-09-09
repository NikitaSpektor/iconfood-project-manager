ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE tasks SET assignee = 'Марина Гаврилова', owner_login = 'marina.gavrilova' WHERE assignee = 'Алина Ветрова';
UPDATE tasks SET assignee = 'Елена Метла', owner_login = 'elena.metla' WHERE assignee = 'Дмитрий Соколов';
UPDATE tasks SET assignee = 'Павел Ларионов', owner_login = 'pavel.larionov' WHERE assignee = 'Пётр Лазарев';
UPDATE tasks SET assignee = 'Никита Спектор', owner_login = 'nikita.spektor' WHERE assignee = 'Марина Ким';
UPDATE tasks SET assignee = 'Марго Филина', owner_login = 'margo.filina' WHERE assignee = 'Егор Тимофеев';
UPDATE tasks SET assignee = 'Татьяна Камаева', owner_login = 'tatiana.kamaeva' WHERE assignee = 'Ольга Панина';

UPDATE tasks SET watchers = replace(watchers, 'Алина Ветрова', 'Марина Гаврилова');
UPDATE tasks SET watchers = replace(watchers, 'Дмитрий Соколов', 'Елена Метла');
UPDATE tasks SET watchers = replace(watchers, 'Пётр Лазарев', 'Павел Ларионов');
UPDATE tasks SET watchers = replace(watchers, 'Марина Ким', 'Никита Спектор');
UPDATE tasks SET watchers = replace(watchers, 'Егор Тимофеев', 'Марго Филина');
UPDATE tasks SET watchers = replace(watchers, 'Ольга Панина', 'Татьяна Камаева');

UPDATE messages SET author = 'Марина Гаврилова', author_login = 'marina.gavrilova' WHERE author_login = 'alina.vetrova';
UPDATE messages SET author = 'Елена Метла', author_login = 'elena.metla' WHERE author_login = 'dmitriy.sokolov';
UPDATE messages SET author = 'Павел Ларионов', author_login = 'pavel.larionov' WHERE author_login = 'petr.lazarev';
UPDATE messages SET author = 'Никита Спектор', author_login = 'nikita.spektor' WHERE author_login = 'marina.kim';
UPDATE messages SET author = 'Марго Филина', author_login = 'margo.filina' WHERE author_login = 'egor.timofeev';
UPDATE messages SET author = 'Диана Айпова', author_login = 'diana.aypova' WHERE author_login = 'kseniya.rodina';
UPDATE messages SET author = 'Виктор Дёмин', author_login = 'victor.demin' WHERE author_login = 'artem.gurev';

UPDATE comments SET author = 'Марина Гаврилова', author_login = 'marina.gavrilova' WHERE author_login = 'alina.vetrova';
UPDATE comments SET author = 'Елена Метла', author_login = 'elena.metla' WHERE author_login = 'dmitriy.sokolov';
UPDATE comments SET author = 'Павел Ларионов', author_login = 'pavel.larionov' WHERE author_login = 'petr.lazarev';

UPDATE users SET active = FALSE WHERE position = '';
