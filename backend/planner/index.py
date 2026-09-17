import json
import os
from datetime import date, timedelta

import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

UNIT = 'Отдел обучения и развития персонала'


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
        'SELECT u.login, u.name, u.role, u.restaurant FROM sessions s '
        'JOIN users u ON u.id = s.user_id '
        'WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW() AND u.active = TRUE'
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'login': row[0], 'name': row[1], 'role': row[2], 'restaurant': row[3]}


def may_view(user) -> bool:
    return user['role'] == 'owner' or user['restaurant'] == UNIT


def week_bounds(day_str: str):
    try:
        parts = [int(p) for p in day_str.split('-')]
        anchor = date(parts[0], parts[1], parts[2])
    except (ValueError, IndexError):
        anchor = date.today()
    start = anchor - timedelta(days=anchor.weekday())
    return start, start + timedelta(days=6), anchor


def load_week(cur, start: date, end: date):
    cur.execute(
        'SELECT p.id, p.user_login, u.name, p.day, p.start_min, p.end_min, p.title, '
        'p.note, p.kind, p.place, p.task_id '
        'FROM planner_entries p LEFT JOIN users u ON u.login = p.user_login '
        'WHERE p.archived = FALSE AND p.day >= ' + q(start.isoformat())
        + ' AND p.day <= ' + q(end.isoformat())
        + ' ORDER BY p.day, p.start_min, p.id'
    )
    entries = []
    for row in cur.fetchall():
        entries.append({
            'id': str(row[0]),
            'login': row[1],
            'author': row[2] or row[1],
            'day': row[3].isoformat(),
            'start': row[4],
            'end': row[5],
            'title': row[6],
            'note': row[7],
            'kind': row[8],
            'place': row[9],
            'taskId': str(row[10]) if row[10] else '',
        })
    return entries


def load_people(cur):
    cur.execute(
        'SELECT login, name, position FROM users '
        'WHERE active = TRUE AND restaurant = ' + q(UNIT) + ' ORDER BY name'
    )
    return [{'login': r[0], 'name': r[1], 'position': r[2] or ''} for r in cur.fetchall()]


def payload(cur, user, day_str: str):
    start, end, anchor = week_bounds(day_str)
    return {
        'entries': load_week(cur, start, end),
        'people': load_people(cur),
        'weekStart': start.isoformat(),
        'day': anchor.isoformat(),
        'me': {'login': user['login'], 'name': user['name'], 'role': user['role']},
        'canEdit': user['restaurant'] == UNIT,
    }


def clamp(value, low, high, fallback):
    try:
        num = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(low, min(high, num))


def handler(event: dict, context) -> dict:
    """Планировщик дня отдела обучения: расписание сотрудников по часам."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            user = current_user(cur, event)
            if not user:
                return {
                    'statusCode': 401,
                    'headers': CORS,
                    'body': json.dumps({'error': 'Нужно войти в систему'}),
                }
            if not may_view(user):
                return {
                    'statusCode': 403,
                    'headers': CORS,
                    'body': json.dumps({'error': 'Планировщик доступен отделу обучения'}),
                }

            if method == 'GET':
                params = event.get('queryStringParameters') or {}
                data = payload(cur, user, params.get('day') or '')
                return {
                    'statusCode': 200,
                    'headers': CORS,
                    'body': json.dumps(data, ensure_ascii=False),
                }

            if method != 'POST':
                return {
                    'statusCode': 405,
                    'headers': CORS,
                    'body': json.dumps({'error': 'Метод не поддерживается'}),
                }

            body = json.loads(event.get('body') or '{}')
            action = body.get('action') or ''
            day_str = str(body.get('day') or '')

            if action == 'create':
                title = str(body.get('title') or '').strip()[:400]
                if len(title) < 2:
                    return {
                        'statusCode': 400,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Впишите, чем заняты'}),
                    }
                start = clamp(body.get('start'), 0, 1439, 540)
                end = clamp(body.get('end'), start + 15, 1440, start + 60)
                cur.execute(
                    'INSERT INTO planner_entries (user_login, day, start_min, end_min, title, '
                    'note, kind, place, task_id) VALUES ('
                    + q(user['login']) + ', ' + q(day_str) + ', ' + str(start) + ', '
                    + str(end) + ', ' + q(title) + ', '
                    + q(str(body.get('note') or '')[:1000]) + ', '
                    + q(str(body.get('kind') or 'work')[:30]) + ', '
                    + q(str(body.get('place') or '')[:160]) + ', '
                    + (str(int(body['taskId'])) if str(body.get('taskId') or '').isdigit() else 'NULL')
                    + ')'
                )

            elif action == 'update':
                entry_id = int(body.get('entryId') or 0)
                cur.execute(
                    'SELECT user_login, day FROM planner_entries WHERE id = ' + str(entry_id)
                )
                row = cur.fetchone()
                if not row:
                    return {
                        'statusCode': 404,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Запись не найдена'}),
                    }
                if row[0] != user['login']:
                    return {
                        'statusCode': 403,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Редактировать можно только свой день'}),
                    }
                day_str = day_str or row[1].isoformat()
                sets = []
                if 'title' in body:
                    sets.append('title = ' + q(str(body['title']).strip()[:400]))
                if 'note' in body:
                    sets.append('note = ' + q(str(body['note'])[:1000]))
                if 'kind' in body:
                    sets.append('kind = ' + q(str(body['kind'])[:30]))
                if 'place' in body:
                    sets.append('place = ' + q(str(body['place'])[:160]))
                if 'start' in body:
                    sets.append('start_min = ' + str(clamp(body['start'], 0, 1439, 540)))
                if 'end' in body:
                    sets.append('end_min = ' + str(clamp(body['end'], 15, 1440, 600)))
                if 'day' in body:
                    sets.append('day = ' + q(day_str))
                if sets:
                    cur.execute(
                        'UPDATE planner_entries SET ' + ', '.join(sets)
                        + ', updated_at = NOW() WHERE id = ' + str(entry_id)
                    )

            elif action == 'delete':
                entry_id = int(body.get('entryId') or 0)
                cur.execute(
                    'SELECT user_login, day FROM planner_entries WHERE id = ' + str(entry_id)
                )
                row = cur.fetchone()
                if not row:
                    return {
                        'statusCode': 404,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Запись не найдена'}),
                    }
                if row[0] != user['login']:
                    return {
                        'statusCode': 403,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Удалять можно только свои записи'}),
                    }
                day_str = day_str or row[1].isoformat()
                cur.execute(
                    'UPDATE planner_entries SET archived = TRUE WHERE id = ' + str(entry_id)
                )

            else:
                return {
                    'statusCode': 400,
                    'headers': CORS,
                    'body': json.dumps({'error': 'Неизвестное действие'}),
                }

            data = payload(cur, user, day_str)
            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps(data, ensure_ascii=False),
            }
    finally:
        conn.close()
