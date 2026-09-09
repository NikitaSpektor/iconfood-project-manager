import base64
import json
import os
import re
import uuid

import boto3
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def q(value) -> str:
    if value is None:
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"


def current_user(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(
        'SELECT u.login, u.name FROM sessions s JOIN users u ON u.id = s.user_id '
        'WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW()'
    )
    row = cur.fetchone()
    return {'login': row[0], 'name': row[1]} if row else None


def notify_assignee(cur, task_id, actor, kind, text):
    cur.execute('SELECT title, assignee FROM tasks WHERE id = ' + str(task_id))
    row = cur.fetchone()
    if not row:
        return
    title, assignee = row
    if not assignee or assignee == actor:
        return
    cur.execute('SELECT login FROM users WHERE name = ' + q(assignee))
    target = cur.fetchone()
    if not target:
        return
    cur.execute(
        'INSERT INTO notifications (recipient_login, task_id, task_title, kind, actor, text) VALUES ('
        + q(target[0]) + ', ' + str(task_id) + ', ' + q(title) + ', ' + q(kind) + ', ' + q(actor) + ', ' + q(text[:300]) + ')'
    )


def load_notifications(cur, login):
    cur.execute(
        'SELECT id, task_id, task_title, kind, actor, text, is_read, created_at FROM notifications '
        'WHERE recipient_login = ' + q(login) + ' ORDER BY id DESC LIMIT 30'
    )
    return [
        {
            'id': str(r[0]),
            'taskId': str(r[1]),
            'taskTitle': r[2],
            'kind': r[3],
            'actor': r[4],
            'text': r[5],
            'read': r[6],
            'createdAt': r[7].isoformat(),
        }
        for r in cur.fetchall()
    ]


def load_channels(cur, user):
    cur.execute('SELECT id, name, hint FROM channels WHERE archived = FALSE ORDER BY position, id')
    rows = cur.fetchall()

    cur.execute('SELECT channel_id, id, author, author_login, text, created_at FROM messages ORDER BY id')
    grouped = {}
    for channel_id, mid, author, author_login, text, created in cur.fetchall():
        grouped.setdefault(channel_id, []).append({
            'id': str(mid),
            'author': author,
            'text': text,
            'time': created.strftime('%H:%M'),
            'createdAt': created.isoformat(),
            'own': author_login == user['login'],
        })

    cur.execute('SELECT channel_id, last_read_id FROM channel_reads WHERE user_login = ' + q(user['login']))
    reads = {r[0]: r[1] for r in cur.fetchall()}

    channels = []
    for cid, name, hint in rows:
        msgs = grouped.get(cid, [])
        last_read = reads.get(cid, 0)
        channels.append({
            'id': str(cid),
            'name': name,
            'hint': hint,
            'unread': sum(1 for m in msgs if int(m['id']) > last_read and not m['own']),
            'messages': msgs,
        })
    return channels


def load_tasks(cur, login):
    cur.execute(
        'SELECT id, title, restaurant, column_id, priority, cover, deadline, assignee, watchers, '
        'template, note, track, gantt_start, gantt_span, owner_login FROM tasks WHERE archived = FALSE ORDER BY id DESC'
    )
    rows = cur.fetchall()
    cur.execute('SELECT task_id, id, title, done FROM subtasks WHERE archived = FALSE ORDER BY position, id')
    subs = {}
    for task_id, sid, title, done in cur.fetchall():
        subs.setdefault(task_id, []).append({'id': str(sid), 'title': title, 'done': done})

    cur.execute(
        'SELECT task_id, id, name, url, mime, size_bytes, author, created_at FROM attachments '
        'WHERE archived = FALSE ORDER BY id'
    )
    files = {}
    for task_id, fid, name, url, mime, size, author, created in cur.fetchall():
        files.setdefault(task_id, []).append({
            'id': str(fid),
            'name': name,
            'url': url,
            'mime': mime,
            'size': size,
            'author': author,
            'createdAt': created.isoformat(),
        })

    cur.execute('SELECT task_id, id, author, text, created_at FROM comments ORDER BY id')
    comments = {}
    for task_id, cid, author, text, created in cur.fetchall():
        comments.setdefault(task_id, []).append({
            'id': str(cid),
            'author': author,
            'text': text,
            'createdAt': created.isoformat(),
        })
    tasks = []
    for r in rows:
        tasks.append({
            'id': str(r[0]),
            'title': r[1],
            'restaurant': r[2],
            'column': r[3],
            'priority': r[4],
            'cover': r[5],
            'deadline': r[6],
            'assignee': r[7],
            'watchers': [w for w in (r[8] or '').split('|') if w],
            'template': r[9],
            'note': r[10],
            'track': r[11],
            'ganttStart': r[12],
            'ganttSpan': r[13],
            'personal': bool(r[14]) and r[14] == login,
            'subtasks': subs.get(r[0], []),
            'comments': comments.get(r[0], []),
            'attachments': files.get(r[0], []),
        })
    return tasks


def handler(event: dict, context) -> dict:
    """Задачи, подзадачи и доски холдинга ICONFOOD: чтение, создание, перенос между колонками."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    user = current_user(cur, event)
    if not user:
        cur.close()
        conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Требуется вход'})}

    if method == 'GET':
        tasks = load_tasks(cur, user['login'])
        notifications = load_notifications(cur, user['login'])
        channels = load_channels(cur, user)
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps({'tasks': tasks, 'notifications': notifications, 'channels': channels}),
        }

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'send_message':
        text = str(body.get('text', '')).strip()
        if text:
            cur.execute(
                'INSERT INTO messages (channel_id, author, author_login, text) VALUES ('
                + str(int(body.get('channelId'))) + ', ' + q(user['name']) + ', '
                + q(user['login']) + ', ' + q(text[:2000]) + ')'
            )
            conn.commit()
    elif action == 'read_channel':
        channel_id = int(body.get('channelId'))
        cur.execute('SELECT COALESCE(MAX(id), 0) FROM messages WHERE channel_id = ' + str(channel_id))
        last_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO channel_reads (channel_id, user_login, last_read_id) VALUES ('
            + str(channel_id) + ', ' + q(user['login']) + ', ' + str(last_id) + ') '
            'ON CONFLICT (channel_id, user_login) DO UPDATE SET last_read_id = ' + str(last_id)
        )
        conn.commit()
    elif action == 'read_notifications':
        cur.execute('UPDATE notifications SET is_read = TRUE WHERE recipient_login = ' + q(user['login']))
        conn.commit()
    elif action == 'move':
        cur.execute('UPDATE tasks SET column_id = ' + q(body.get('column')) + ' WHERE id = ' + str(int(body.get('taskId'))))
        conn.commit()
    elif action == 'toggle':
        cur.execute('UPDATE subtasks SET done = NOT done WHERE id = ' + str(int(body.get('subtaskId'))))
        conn.commit()
    elif action == 'attach':
        name = str(body.get('name', 'file'))[:200]
        mime = str(body.get('mime', 'application/octet-stream'))[:120]
        raw = str(body.get('data', ''))
        if ',' in raw and raw.strip().startswith('data:'):
            raw = raw.split(',', 1)[1]
        content = base64.b64decode(raw)
        safe = re.sub(r'[^A-Za-z0-9._-]', '_', name) or 'file'
        key = f"tasks/{int(body.get('taskId'))}/{uuid.uuid4().hex[:10]}_{safe}"
        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )
        s3.put_object(Bucket='files', Key=key, Body=content, ContentType=mime)
        url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        cur.execute(
            'INSERT INTO attachments (task_id, name, url, mime, size_bytes, author) VALUES ('
            + str(int(body.get('taskId'))) + ', ' + q(name) + ', ' + q(url) + ', ' + q(mime) + ', '
            + str(len(content)) + ', ' + q(user['name']) + ')'
        )
        notify_assignee(cur, int(body.get('taskId')), user['name'], 'file', name)
        conn.commit()
    elif action == 'detach':
        cur.execute('UPDATE attachments SET archived = TRUE WHERE id = ' + str(int(body.get('fileId'))))
        conn.commit()
    elif action == 'comment':
        text = str(body.get('text', '')).strip()
        if text:
            cur.execute(
                'INSERT INTO comments (task_id, author, author_login, text) VALUES ('
                + str(int(body.get('taskId'))) + ', ' + q(user['name']) + ', ' + q(user['login']) + ', ' + q(text) + ')'
            )
            notify_assignee(cur, int(body.get('taskId')), user['name'], 'comment', text)
            conn.commit()
    elif action == 'create':
        owner = user['login'] if body.get('personal') else ''
        cur.execute(
            'INSERT INTO tasks (title, restaurant, column_id, priority, cover, deadline, assignee, watchers, '
            'template, note, track, gantt_start, gantt_span, owner_login) VALUES ('
            + q(body.get('title')) + ', ' + q(body.get('restaurant', '')) + ', ' + q(body.get('column', 'new')) + ', '
            + q(body.get('priority', 'normal')) + ', ' + q(body.get('cover', 'none')) + ', ' + q(body.get('deadline', '')) + ', '
            + q(body.get('assignee', '')) + ', ' + q('|'.join(body.get('watchers') or [])) + ', '
            + q(body.get('template')) + ', ' + q(body.get('note')) + ', ' + q(body.get('track', 'Задачи')) + ', '
            + str(int(body.get('ganttStart', 10))) + ', ' + str(int(body.get('ganttSpan', 30))) + ', ' + q(owner) + ') RETURNING id'
        )
        new_id = cur.fetchone()[0]
        for i, s in enumerate(body.get('subtasks') or []):
            cur.execute(
                'INSERT INTO subtasks (task_id, title, done, position) VALUES ('
                + str(new_id) + ', ' + q(s.get('title')) + ', false, ' + str(i) + ')'
            )
        conn.commit()

    tasks = load_tasks(cur, user['login'])
    notifications = load_notifications(cur, user['login'])
    channels = load_channels(cur, user)
    cur.close()
    conn.close()
    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'tasks': tasks, 'notifications': notifications, 'channels': channels}),
    }