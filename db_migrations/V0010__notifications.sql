CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_login VARCHAR(80) NOT NULL,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  task_title VARCHAR(300) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'comment',
  actor VARCHAR(120) NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_login, is_read);
