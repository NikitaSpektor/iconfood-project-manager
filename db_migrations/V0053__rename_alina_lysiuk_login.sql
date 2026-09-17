UPDATE t_p60921926_iconfood_project_man.users
SET login = 'alina.lysiuk'
WHERE login = 'alina.lusyk';

UPDATE t_p60921926_iconfood_project_man.channel_members
SET user_login = 'alina.lysiuk'
WHERE user_login = 'alina.lusyk';

UPDATE t_p60921926_iconfood_project_man.messages
SET author_login = 'alina.lysiuk'
WHERE author_login = 'alina.lusyk';

UPDATE t_p60921926_iconfood_project_man.tasks
SET owner_login = 'alina.lysiuk'
WHERE owner_login = 'alina.lusyk';

UPDATE t_p60921926_iconfood_project_man.planner_entries
SET user_login = 'alina.lysiuk'
WHERE user_login = 'alina.lusyk';