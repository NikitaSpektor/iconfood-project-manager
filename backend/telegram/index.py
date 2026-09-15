import json
import os
import random
import urllib.parse
import urllib.request

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


def tg_call(method: str, payload: dict) -> dict:
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not token:
        return {}
    url = 'https://api.telegram.org/bot' + token + '/' + method
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return {}


def tg_send(chat_id, text: str) -> None:
    if not chat_id:
        return
    tg_call('sendMessage', {'chat_id': chat_id, 'text': text[:3800]})


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


def visible_channels(cur, login):
    cur.execute(
        'SELECT c.id, c.name FROM channels c WHERE c.archived = FALSE AND '
        '(c.is_open = TRUE OR EXISTS (SELECT 1 FROM channel_members m WHERE m.channel_id = c.id '
        'AND m.active = TRUE AND m.user_login = ' + q(login) + ')) ORDER BY c.position, c.id'
    )
    return cur.fetchall()


def handle_update(cur, conn, update):
    """Принимает сообщение из Telegram: привязывает аккаунт или пишет в канал холдинга."""
    message = update.get('message') or update.get('edited_message') or {}
    chat = message.get('chat') or {}
    chat_id = chat.get('id')
    text = str(message.get('text') or '').strip()
    if not chat_id or not text:
        return

    cur.execute('SELECT login, name, tg_channel_id FROM users WHERE tg_chat_id = ' + q(chat_id))
    linked = cur.fetchone()

    if text.startswith('/start'):
        if linked:
            tg_send(chat_id, 'Telegram уже привязан к аккаунту ' + linked[1] + '.\n'
                    'Команды: /channels — список каналов, /use НОМЕР — выбрать канал для ответов.')
        else:
            tg_send(chat_id, 'Это бот рабочего пространства ICONFOOD.\n\n'
                    'Откройте на сайте раздел «Настройки» → «Telegram», получите код '
                    'и пришлите его сюда одним сообщением.')
        return

    if not linked:
        code = ''.join(ch for ch in text if ch.isdigit())
        if len(code) == 6:
            cur.execute('SELECT login, name FROM users WHERE tg_code = ' + q(code) + ' AND active = TRUE')
            found = cur.fetchone()
            if found:
                username = str((message.get('from') or {}).get('username') or '')[:80]
                cur.execute(
                    'UPDATE users SET tg_chat_id = ' + q(chat_id) + ", tg_code = '', tg_username = "
                    + q(username) + ' WHERE login = ' + q(found[0])
                )
                conn.commit()
                tg_send(chat_id, 'Готово, ' + found[1] + '. Сообщения из каналов холдинга будут приходить сюда.\n'
                        'Команды: /channels — список каналов, /use НОМЕР — выбрать канал для ответов.')
                return
        tg_send(chat_id, 'Код не подошёл. Возьмите свежий код на сайте: «Настройки» → «Telegram».')
        return

    login, name, channel_id = linked
    rows = visible_channels(cur, login)

    if text.startswith('/channels'):
        lines = ['Ваши каналы:']
        for i, (cid, cname) in enumerate(rows, 1):
            mark = ' ← выбран' if cid == channel_id else ''
            lines.append(str(i) + '. ' + cname + mark)
        lines.append('')
        lines.append('Выбрать: /use НОМЕР')
        tg_send(chat_id, '\n'.join(lines))
        return

    if text.startswith('/use'):
        digits = ''.join(ch for ch in text if ch.isdigit())
        idx = int(digits) if digits else 0
        if 1 <= idx <= len(rows):
            cur.execute(
                'UPDATE users SET tg_channel_id = ' + str(rows[idx - 1][0]) + ' WHERE login = ' + q(login)
            )
            conn.commit()
            tg_send(chat_id, 'Канал выбран: ' + rows[idx - 1][1] + '. Теперь пишите сюда — сообщения уйдут в этот канал.')
        else:
            tg_send(chat_id, 'Такого номера нет. Посмотрите список: /channels')
        return

    if text.startswith('/stop'):
        cur.execute("UPDATE users SET tg_chat_id = '', tg_channel_id = 0 WHERE login = " + q(login))
        conn.commit()
        tg_send(chat_id, 'Telegram отвязан. Сообщения приходить не будут.')
        return

    if not channel_id or not any(cid == channel_id for cid, _ in rows):
        tg_send(chat_id, 'Сначала выберите канал: /channels, затем /use НОМЕР.')
        return

    cur.execute(
        'INSERT INTO messages (channel_id, author, author_login, text, via) VALUES ('
        + str(channel_id) + ', ' + q(name) + ', ' + q(login) + ', ' + q(text[:2000]) + ", 'telegram')"
    )
    conn.commit()
    fanout(cur, channel_id, login, name, text, skip_chat=str(chat_id))
    tg_send(chat_id, 'Отправлено в канал.')


def fanout(cur, channel_id, author_login, author_name, text, skip_chat='') -> None:
    """Рассылает сообщение канала всем участникам, привязавшим Telegram."""
    cur.execute('SELECT name FROM channels WHERE id = ' + str(int(channel_id)))
    row = cur.fetchone()
    channel_name = row[0] if row else 'Канал'
    cur.execute(
        'SELECT u.tg_chat_id FROM channel_members m JOIN users u ON u.login = m.user_login '
        "WHERE m.channel_id = " + str(int(channel_id)) + " AND m.active = TRUE AND u.active = TRUE "
        "AND u.tg_chat_id <> '' AND u.login <> " + q(author_login)
    )
    targets = [r[0] for r in cur.fetchall()]
    cur.execute('SELECT is_open FROM channels WHERE id = ' + str(int(channel_id)))
    row = cur.fetchone()
    if row and row[0]:
        cur.execute(
            "SELECT tg_chat_id FROM users WHERE active = TRUE AND tg_chat_id <> '' AND login <> "
            + q(author_login)
        )
        targets = [r[0] for r in cur.fetchall()]
    body = channel_name + '\n' + author_name + ': ' + text
    for chat_id in set(targets):
        if chat_id and chat_id != skip_chat:
            tg_send(chat_id, body)


def handler(event: dict, context) -> dict:
    """Связывает мессенджер холдинга с Telegram: приём сообщений от бота и привязка аккаунтов."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if 'update_id' in body:
        handle_update(cur, conn, body)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    user = current_user(cur, event)
    if not user:
        cur.close()
        conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Требуется вход'})}

    action = body.get('action', '') if method == 'POST' else 'status'
    result = {}

    if action == 'code':
        code = str(random.randint(100000, 999999))
        cur.execute("UPDATE users SET tg_code = " + q(code) + ' WHERE login = ' + q(user['login']))
        conn.commit()
        info = tg_call('getMe', {})
        bot = (info.get('result') or {}).get('username', '')
        result = {'code': code, 'bot': bot}
    elif action == 'unlink':
        cur.execute(
            "UPDATE users SET tg_chat_id = '', tg_code = '', tg_username = '', tg_channel_id = 0 "
            'WHERE login = ' + q(user['login'])
        )
        conn.commit()
    elif action == 'setup':
        url = str(body.get('url', ''))
        if url:
            tg_call('setWebhook', {'url': url, 'allowed_updates': '["message"]'})

    cur.execute(
        'SELECT tg_chat_id, tg_username, tg_channel_id FROM users WHERE login = ' + q(user['login'])
    )
    row = cur.fetchone()
    info = tg_call('getMe', {})
    result.update({
        'linked': bool(row and row[0]),
        'username': (row[1] if row else '') or '',
        'channelId': str(row[2]) if row and row[2] else '',
        'bot': (info.get('result') or {}).get('username', ''),
    })
    cur.close()
    conn.close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(result)}
