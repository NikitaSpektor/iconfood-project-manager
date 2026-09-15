CREATE TABLE IF NOT EXISTS t_p60921926_iconfood_project_man.app_settings (
  key VARCHAR(60) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);