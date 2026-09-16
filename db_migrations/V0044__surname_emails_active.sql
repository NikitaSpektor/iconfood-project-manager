UPDATE t_p60921926_iconfood_project_man.users
SET email = split_part(login, '.', 2) || '@iconfood.ru'
WHERE active = TRUE
  AND position('.' in login) > 0
  AND login NOT IN ('nikita.spektor','anna.shuvalova','yan.tarasenko','tatiana.kamaeva','masha.shidlovskaya','marina.gavrilova');