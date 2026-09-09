CREATE TABLE IF NOT EXISTS channel_members (
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  user_login VARCHAR(80) NOT NULL,
  PRIMARY KEY (channel_id, user_login)
);

ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by VARCHAR(80) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_login);
