CREATE TABLE IF NOT EXISTS t_p60921926_iconfood_project_man.planner_entries (
  id SERIAL PRIMARY KEY,
  user_login VARCHAR(120) NOT NULL DEFAULT '',
  day DATE NOT NULL,
  start_min INTEGER NOT NULL DEFAULT 540,
  end_min INTEGER NOT NULL DEFAULT 600,
  title VARCHAR(400) NOT NULL DEFAULT '',
  note VARCHAR(1000) NOT NULL DEFAULT '',
  kind VARCHAR(30) NOT NULL DEFAULT 'work',
  place VARCHAR(160) NOT NULL DEFAULT '',
  task_id INTEGER,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS planner_entries_day_idx
  ON t_p60921926_iconfood_project_man.planner_entries (day, user_login);