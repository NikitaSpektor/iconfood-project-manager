import json
import os
import urllib.error
import urllib.request
from datetime import date

import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

GPT_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'

SYSTEM_PROMPT = (
    'Ты — операционный аналитик сети ресторанов ICONFOOD. '
    'Тебе дают СРЕЗ ЖИВЫХ ДАННЫХ с рабочих досок холдинга: активные задачи, их статусы, '
    'ответственные, сроки, подзадачи. Архивные и удалённые задачи в срез не попадают — '
    'их не существует, не упоминай их. '
    'Отвечай ТОЛЬКО по этим данным. Никогда не выдумывай задачи, имена, рестораны и цифры: '
    'если чего-то нет в срезе — так и скажи. '
    'Ответ должен быть точным и развёрнутым: сначала прямой вывод одной фразой, '
    'затем разбор с конкретикой — названия задач, фамилии ответственных, даты, числа. '
    'Заверши коротким блоком «Что сделать» из 2-4 конкретных действий. '
    'Пиши по-русски, деловым языком, без воды и без markdown-разметки. '
    'Объём — 6-14 строк. Обычный текст, списки оформляй тире с новой строки.'
)

MONTHS = {
    'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
    'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
}

COLUMN_LABELS = {'new': 'Новые', 'progress': 'В работе', 'done': 'Готово'}
PRIORITY_LABELS = {
    'critical': 'Критично', 'high': 'Высокий', 'normal': 'Обычный', 'low': 'Низкий',
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
        'SELECT u.login, u.name, u.role, u.restaurant FROM sessions s '
        'JOIN users u ON u.id = s.user_id '
        'WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW() AND u.active = TRUE'
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'login': row[0], 'name': row[1], 'role': row[2], 'restaurant': row[3]}


def days_left(deadline: str, today: date):
    if not deadline:
        return None
    parts = str(deadline).strip().split()
    if len(parts) < 2 or parts[0].isdigit() is False:
        return None
    month = MONTHS.get(parts[1].lower())
    if not month:
        return None
    try:
        target = date(today.year, month, int(parts[0]))
    except ValueError:
        return None
    return (target - today).days


def board_snapshot(cur):
    today = date.today()
    cur.execute(
        'SELECT id, title, restaurant, column_id, priority, deadline, assignee, note '
        'FROM tasks WHERE archived = FALSE ORDER BY id DESC'
    )
    rows = cur.fetchall()
    ids = [r[0] for r in rows]
    subs = {}
    if ids:
        cur.execute(
            'SELECT task_id, title, done FROM subtasks WHERE archived = FALSE '
            'AND task_id IN (' + ','.join(str(i) for i in ids) + ') ORDER BY position, id'
        )
        for task_id, title, done in cur.fetchall():
            subs.setdefault(task_id, []).append((title, done))

    lines = []
    stats = {'new': 0, 'progress': 0, 'done': 0}
    overdue = 0
    by_person = {}
    by_place = {}

    for r in rows:
        task_id, title, place, column, priority, deadline, assignee, note = r
        stats[column] = stats.get(column, 0) + 1
        people = [p for p in (assignee or '').split('|') if p]
        left = days_left(deadline, today)
        late = column != 'done' and left is not None and left < 0
        if late:
            overdue += 1
        if column != 'done':
            for p in people:
                by_person[p] = by_person.get(p, 0) + 1
            by_place[place] = by_place.get(place, 0) + 1

        steps = subs.get(task_id, [])
        done_steps = sum(1 for _, d in steps if d)
        chunk = (
            '- «' + title + '» | ' + (place or 'без подразделения')
            + ' | статус: ' + COLUMN_LABELS.get(column, column)
            + ' | приоритет: ' + PRIORITY_LABELS.get(priority, priority)
            + ' | срок: ' + (deadline or 'не задан')
        )
        if left is not None and column != 'done':
            chunk += ' (' + ('просрочено на ' + str(-left) + ' дн.' if left < 0
                             else 'осталось ' + str(left) + ' дн.') + ')'
        chunk += ' | ответственные: ' + (', '.join(people) or 'не назначены')
        if steps:
            chunk += ' | шаги: ' + str(done_steps) + ' из ' + str(len(steps))
            open_steps = [t for t, d in steps if not d][:3]
            if open_steps:
                chunk += ' (не сделано: ' + '; '.join(open_steps) + ')'
        if note:
            chunk += ' | описание: ' + str(note)[:200]
        lines.append(chunk)

    total = len(rows)
    active = total - stats.get('done', 0)
    load = sorted(by_person.items(), key=lambda x: -x[1])[:6]
    places = sorted(by_place.items(), key=lambda x: -x[1])[:6]

    header = (
        'Сегодня: ' + today.strftime('%d.%m.%Y') + '\n'
        'Активных досок холдинга — задач всего: ' + str(total)
        + ' (новые: ' + str(stats.get('new', 0))
        + ', в работе: ' + str(stats.get('progress', 0))
        + ', готово: ' + str(stats.get('done', 0)) + ')\n'
        'Незакрытых задач: ' + str(active) + ', из них просрочено: ' + str(overdue) + '\n'
        'Загрузка людей (незакрытые): '
        + (', '.join(n + ' — ' + str(c) for n, c in load) or 'нет назначений') + '\n'
        'Подразделения (незакрытые): '
        + (', '.join(n + ' — ' + str(c) for n, c in places) or 'нет данных') + '\n'
    )
    return header + '\nСписок активных задач:\n' + '\n'.join(lines[:120]), total


def ask_gpt(question: str, snapshot: str, user: dict):
    api_key = os.environ.get('YANDEX_GPT_API_KEY')
    folder_id = os.environ.get('YANDEX_GPT_FOLDER_ID')
    if not api_key or not folder_id:
        return None, 'ИИ-помощник не подключён'

    user_text = (
        'Данные досок (только активные задачи, архив исключён):\n'
        + snapshot
        + '\n\nСпрашивает: ' + user['name'] + ' (' + user['restaurant'] + ')'
        + '\nВопрос: ' + question
        + '\n\nОтветь точно по данным выше, с конкретными названиями, фамилиями и датами.'
    )

    payload = {
        'modelUri': 'gpt://' + folder_id + '/yandexgpt/latest',
        'completionOptions': {'stream': False, 'temperature': 0.3, 'maxTokens': 1600},
        'messages': [
            {'role': 'system', 'text': SYSTEM_PROMPT},
            {'role': 'user', 'text': user_text},
        ],
    }
    req = urllib.request.Request(
        GPT_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': 'Api-Key ' + api_key},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=50) as resp:
            body = json.loads(resp.read().decode('utf-8'))
        return body['result']['alternatives'][0]['message']['text'].strip(), ''
    except urllib.error.HTTPError as err:
        detail = err.read().decode('utf-8', 'replace')[:300]
        print('analyst HTTP ' + str(err.code) + ': ' + detail, flush=True)
        return None, 'Ассистент сейчас недоступен'
    except Exception as err:
        print('analyst error ' + type(err).__name__ + ': ' + str(err)[:200], flush=True)
        return None, 'Ассистент сейчас недоступен'


def handler(event: dict, context) -> dict:
    """Ассистент ICONFOOD: разбор активных задач досок холдинга без архива."""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': CORS,
            'body': json.dumps({'error': 'Метод не поддерживается'}),
        }

    body = json.loads(event.get('body') or '{}')
    question = str(body.get('question') or '').strip()
    if len(question) < 3:
        return {
            'statusCode': 400,
            'headers': CORS,
            'body': json.dumps({'error': 'Напишите вопрос'}),
        }

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
            snapshot, total = board_snapshot(cur)
    finally:
        conn.close()

    if total == 0:
        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps(
                {'answer': 'На досках холдинга сейчас нет активных задач — разбирать нечего.',
                 'tasks': 0},
                ensure_ascii=False,
            ),
        }

    answer, error = ask_gpt(question, snapshot, user)
    if not answer:
        return {
            'statusCode': 503,
            'headers': CORS,
            'body': json.dumps({'error': error}, ensure_ascii=False),
        }

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'answer': answer, 'tasks': total}, ensure_ascii=False),
    }
