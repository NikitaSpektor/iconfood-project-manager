import json
import os
import re
import urllib.error
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
    'Ты — операционный директор сети ресторанов ICONFOOD. '
    'По названию задачи и её описанию составь чек-лист шагов именно для этой задачи. '
    'Если есть описание — оно важнее названия: учитывай указанные в нём детали и условия. '
    'Главное правило: шаги должны относиться к тому, что написано в задаче. '
    'Если задача про документ — шаги про работу с документом, если про видео — про съёмку, '
    'если про тест — про составление вопросов. Не подставляй шаги из других тем '
    '(не пиши про закупку, дегустацию или ремонт, если задача не об этом). '
    'От 4 до 7 пунктов, в логическом порядке: подготовка, выполнение, проверка, закрытие. '
    'Каждый пункт — одно конкретное действие, 3-9 слов, с глаголом в начале, '
    'на русском языке, без нумерации и лишних символов. '
    'Не придумывай факты, которых нет в названии задачи. '
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
        if len(clean) < 4 or clean.endswith(':'):
            continue
        if re.match(r'(?i)^(вот|конечно|список|чек-лист|шаги|ответ|пример)\b', clean):
            continue
        steps.append(clean)
    return steps[:8]


def ask_gpt(title: str, restaurant: str, priority: str, deadline: str, note: str = ''):
    api_key = os.environ.get('YANDEX_GPT_API_KEY')
    folder_id = os.environ.get('YANDEX_GPT_FOLDER_ID')
    if not api_key or not folder_id:
        return None, 'ИИ-помощник не подключён'

    user_text = 'Задача: ' + title
    if note:
        user_text += '\nОписание от постановщика: ' + note[:1500]
    if restaurant:
        user_text += '\nПодразделение: ' + restaurant
    if priority:
        user_text += '\nПриоритет: ' + priority
    if deadline:
        user_text += '\nСрок: ' + deadline
    if note:
        user_text += (
            '\nСоставь шаги по описанию: учти названные в нём детали, условия и пожелания. '
            'Если в описании есть готовые пункты — опирайся на них.'
        )
    else:
        user_text += '\nСоставь шаги строго по смыслу названия задачи.'

    payload = {
        'modelUri': 'gpt://' + folder_id + '/yandexgpt/latest',
        'completionOptions': {'stream': False, 'temperature': 0.2, 'maxTokens': 500},
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
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode('utf-8'))
        text = body['result']['alternatives'][0]['message']['text']
    except urllib.error.HTTPError as err:
        detail = err.read().decode('utf-8', 'replace')[:300]
        print('GPT HTTP ' + str(err.code) + ': ' + detail, flush=True)
        if err.code in (401, 403):
            return None, 'ИИ-помощник не авторизован — проверьте ключ доступа'
        return None, 'Ассистент сейчас недоступен'
    except Exception as err:
        print('GPT error ' + type(err).__name__ + ': ' + str(err)[:200], flush=True)
        return None, 'Ассистент сейчас недоступен'
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
        (data.get('note') or '').strip(),
    )
    if error:
        return {'statusCode': 503, 'headers': CORS, 'body': json.dumps({'error': error})}

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'steps': steps}, ensure_ascii=False),
    }