import json
import os
import re
import urllib.request

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
    'Ты — операционный директор сети ресторанов. По названию задачи и ресторану '
    'составь короткий чек-лист конкретных шагов для сотрудника. '
    'От 4 до 7 пунктов. Каждый пункт — одно действие, 3-9 слов, с глаголом в начале, '
    'на русском языке, без нумерации и лишних символов. '
    'Ответ верни строго как JSON-массив строк, без пояснений.'
)


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


def parse_steps(text: str):
    match = re.search(r'\[.*\]', text, re.S)
    if match:
        try:
            data = json.loads(match.group(0))
            steps = [str(s).strip() for s in data if str(s).strip()]
            if steps:
                return steps[:8]
        except json.JSONDecodeError:
            pass
    steps = []
    for line in text.splitlines():
        clean = re.sub(r'^[\s\-\*\d\.\)\"\u2022]+', '', line).strip().strip('",')
        if len(clean) > 3:
            steps.append(clean)
    return steps[:8]


def ask_gpt(title: str, restaurant: str, priority: str, deadline: str):
    api_key = os.environ.get('YANDEX_GPT_API_KEY')
    folder_id = os.environ.get('YANDEX_GPT_FOLDER_ID')
    if not api_key or not folder_id:
        return None, 'ИИ-помощник не подключён'

    user_text = 'Задача: ' + title + '\nРесторан: ' + restaurant
    if priority:
        user_text += '\nПриоритет: ' + priority
    if deadline:
        user_text += '\nСрок: ' + deadline

    payload = {
        'modelUri': 'gpt://' + folder_id + '/yandexgpt-lite/latest',
        'completionOptions': {'stream': False, 'temperature': 0.4, 'maxTokens': 500},
        'messages': [
            {'role': 'system', 'text': SYSTEM_PROMPT},
            {'role': 'user', 'text': user_text},
        ],
    }
    req = urllib.request.Request(
        GPT_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': 'Api-Key ' + api_key,
            'x-folder-id': folder_id,
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        body = json.loads(resp.read().decode('utf-8'))
    text = body['result']['alternatives'][0]['message']['text']
    steps = parse_steps(text)
    if not steps:
        return None, 'Ассистент не смог составить список, попробуйте уточнить название'
    return steps, None


def handler(event: dict, context) -> dict:
    """Составляет список подзадач по названию задачи и ресторану через YandexGPT."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': CORS,
            'body': json.dumps({'error': 'Метод не поддерживается'}),
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            user = current_user(cur, event)
    finally:
        conn.close()

    if not user:
        return {
            'statusCode': 401,
            'headers': CORS,
            'body': json.dumps({'error': 'Нужно войти в систему'}),
        }

    data = json.loads(event.get('body') or '{}')
    title = (data.get('title') or '').strip()
    if len(title) < 4:
        return {
            'statusCode': 400,
            'headers': CORS,
            'body': json.dumps({'error': 'Сначала укажите название задачи'}),
        }

    steps, error = ask_gpt(
        title,
        (data.get('restaurant') or '').strip(),
        (data.get('priority') or '').strip(),
        (data.get('deadline') or '').strip(),
    )
    if error:
        return {'statusCode': 503, 'headers': CORS, 'body': json.dumps({'error': error})}

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'steps': steps}, ensure_ascii=False),
    }
