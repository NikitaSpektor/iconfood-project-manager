import json
import os

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
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'tasks': tasks})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'move':
        cur.execute('UPDATE tasks SET column_id = ' + q(body.get('column')) + ' WHERE id = ' + str(int(body.get('taskId'))))
        conn.commit()
    elif action == 'toggle':
        cur.execute('UPDATE subtasks SET done = NOT done WHERE id = ' + str(int(body.get('subtaskId'))))
        conn.commit()
    elif action == 'comment':
        text = str(body.get('text', '')).strip()
        if text:
            cur.execute(
                'INSERT INTO comments (task_id, author, author_login, text) VALUES ('
                + str(int(body.get('taskId'))) + ', ' + q(user['name']) + ', ' + q(user['login']) + ', ' + q(text) + ')'
            )
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
    cur.close()
    conn.close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'tasks': tasks})}