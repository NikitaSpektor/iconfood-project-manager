import json
import os
import hashlib
import secrets
import smtplib
from email.header import Header
from email.mime.text import MIMEText
from datetime import datetime, timedelta

import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def q(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def hash_password(login: str, password: str) -> str:
    return hashlib.sha256(f'{login}:{password}'.encode()).hexdigest()


def send_mail(to_email: str, subject: str, html: str) -> bool:
    """Отправляет письмо через почтовый сервер холдинга."""
    host = os.environ.get('SMTP_HOST', '')
    user = os.environ.get('SMTP_USER', '')
    secret = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not secret or '@' not in (to_email or ''):
        return False
    msg = MIMEText(html, 'html', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    sender = os.environ.get('SMTP_FROM', user)
    msg['From'] = sender
    msg['To'] = to_email
    port = int(os.environ.get('SMTP_PORT', '465'))
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=8)
        else:
            server = smtplib.SMTP(host, port, timeout=8)
            server.starttls()
        server.login(user, secret)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        print('mail ok -> ' + to_email + ' | ' + subject, flush=True)
        return True
    except Exception as err:
        print('mail FAIL -> ' + to_email + ' | ' + type(err).__name__ + ': ' + str(err)[:200], flush=True)
        return False


def mail_card(name: str, lead: str, rows, footer: str) -> str:
    cells = ''.join(
        '<p style="margin:4px 0;font-size:14px;color:#444">' + k + ': <b>' + v + '</b></p>' for k, v in rows
    )
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">'
        '<p style="font-size:15px;color:#111">Здравствуйте' + (', ' + name if name else '') + '!</p>'
        '<p style="font-size:14px;color:#333">' + lead + '</p>'
        '<div style="border:1px solid #e5e5e5;border-radius:14px;padding:16px 18px;margin:16px 0">'
        + cells + '</div>'
        '<p style="font-size:13px;color:#888">' + footer + '</p>'
        '</div>'
    )


def send_access_email(to_email: str, name: str, login: str, password: str) -> bool:
    """Отправляет сотруднику логин и новый пароль от рабочего пространства."""
    return send_mail(to_email, 'Доступ в ICONFOOD', mail_card(
        (name or '').strip(),
        'Ваш доступ в рабочее пространство ICONFOOD обновлён.',
        [('Логин', login), ('Пароль', password)],
        'После входа пароль можно сменить в настройках профиля. '
        'Если вы не запрашивали доступ — сообщите руководителю.',
    ))


def find_for_reset(cur, ident: str):
    """Ищет активного сотрудника по логину или по личной почте (общий ящик не подходит)."""
    ident = (ident or '').strip().lower()
    if not ident:
        return None
    cur.execute('SELECT login, name, email FROM users WHERE active = TRUE AND login = ' + q(ident))
    row = cur.fetchone()
    if row:
        return row
    if '@' in ident:
        cur.execute('SELECT login, name, email FROM users WHERE active = TRUE AND lower(email) = ' + q(ident))
        rows = cur.fetchall()
        if len(rows) == 1:
            return rows[0]
    return None


def code_hash(login: str, code: str) -> str:
    return hashlib.sha256(('reset:' + login + ':' + code).encode()).hexdigest()


def sync_unit_channel(cur, login: str, unit: str) -> None:
    """Переводит сотрудника в канал своего подразделения и убирает из чужих."""
    if not unit:
        return
    cur.execute('SELECT id FROM channels WHERE unit = ' + q(unit) + ' AND archived = FALSE')
    row = cur.fetchone()
    if row:
        channel_id = row[0]
    else:
        cur.execute(
            'INSERT INTO channels (name, hint, position, is_open, created_by, kind, unit) VALUES ('
            + q(unit) + ", 'Команда подразделения', 10, FALSE, '', 'channel', " + q(unit) + ') RETURNING id'
        )
        channel_id = cur.fetchone()[0]
    cur.execute(
        'UPDATE channel_members SET active = FALSE WHERE user_login = ' + q(login)
        + ' AND channel_id IN (SELECT id FROM channels WHERE unit <> \'\' AND id <> ' + str(channel_id) + ')'
    )
    cur.execute(
        'INSERT INTO channel_members (channel_id, user_login, active) VALUES ('
        + str(channel_id) + ', ' + q(login) + ', TRUE) '
        'ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE'
    )


def current_user(cur, event):
    """Возвращает сотрудника по токену сессии или None."""
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token', '')
    if not token:
        return None
    cur.execute(
        'SELECT u.name, u.login, u.role FROM sessions s JOIN users u ON u.id = s.user_id '
        'WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW()'
    )
    row = cur.fetchone()
    return {'name': row[0], 'login': row[1], 'role': row[2]} if row else None


def rename_everywhere(cur, old_name: str, new_name: str) -> None:
    """Переносит имя сотрудника во все задачи, комментарии и файлы."""
    if not old_name or old_name == new_name:
        return
    cur.execute('UPDATE tasks SET assignee = replace(assignee, ' + q(old_name) + ', ' + q(new_name)
                + ') WHERE assignee LIKE ' + q('%' + old_name + '%'))
    cur.execute('UPDATE tasks SET watchers = replace(watchers, ' + q(old_name) + ', ' + q(new_name)
                + ') WHERE watchers LIKE ' + q('%' + old_name + '%'))
    cur.execute('UPDATE comments SET author = ' + q(new_name) + ' WHERE author = ' + q(old_name))
    cur.execute('UPDATE messages SET author = ' + q(new_name) + ' WHERE author = ' + q(old_name))
    cur.execute('UPDATE attachments SET author = ' + q(new_name) + ' WHERE author = ' + q(old_name))


def handler(event: dict, context) -> dict:
    """Вход сотрудников ICONFOOD по логину и паролю, выдача и проверка токена сессии."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if method == 'GET':
        action = (event.get('queryStringParameters') or {}).get('action', 'me')
        if action == 'members':
            only = (event.get('queryStringParameters') or {}).get('scope', 'active')
            where = 'active = FALSE' if only == 'dismissed' else 'active = TRUE'
            cur.execute('SELECT id, name, login, email, role, restaurant, position FROM users WHERE '
                        + where + " AND login NOT LIKE '%.merged' ORDER BY id")
            members = [
                {'id': str(r[0]), 'name': r[1], 'login': r[2], 'email': r[3], 'role': r[4],
                 'restaurant': r[5], 'position': r[6], 'online': r[0] % 3 != 2}
                for r in cur.fetchall()
            ]
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'members': members})}

        token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token', '')
        if not token:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'no token'})}
        cur.execute(
            'SELECT u.name, u.login, u.role, u.restaurant, u.email, u.position FROM sessions s '
            'JOIN users u ON u.id = s.user_id WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW()'
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'expired'})}
        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps({'user': {'name': row[0], 'login': row[1], 'role': row[2], 'restaurant': row[3], 'email': row[4], 'position': row[5]}}),
        }

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'login')

    if action == 'login':
        login = str(body.get('login', '')).strip().lower()
        password = str(body.get('password', ''))
        if not login or not password:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Введите логин и пароль'})}
        cur.execute('SELECT id, name, login, role, restaurant, email, password_hash, position FROM users WHERE active = TRUE AND login = ' + q(login))
        row = cur.fetchone()
        if not row or row[6] != hash_password(login, password):
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
        token = secrets.token_hex(24)
        expires = (datetime.utcnow() + timedelta(days=14)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            'INSERT INTO sessions (token, user_id, expires_at) VALUES (' + q(token) + ', ' + str(row[0]) + ', ' + q(expires) + ')'
        )
        conn.commit()
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps({'token': token, 'user': {'name': row[1], 'login': row[2], 'role': row[3], 'restaurant': row[4], 'email': row[5], 'position': row[7]}}),
        }

    if action == 'logout':
        token = (event.get('headers') or {}).get('X-Auth-Token', '')
        if token:
            cur.execute('UPDATE sessions SET expires_at = NOW() WHERE token = ' + q(token))
            conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    if action == 'forgot':
        ident = str(body.get('login', '')).strip().lower()
        neutral = {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'ok': True,
            'message': 'Если такой сотрудник есть, код уже отправлен на его рабочую почту'
        }, ensure_ascii=False)}
        target = find_for_reset(cur, ident)
        if not target or '@' not in (target[2] or ''):
            if ident and '@' in ident:
                cur.execute('SELECT COUNT(*) FROM users WHERE active = TRUE AND lower(email) = ' + q(ident))
                if cur.fetchone()[0] > 1:
                    cur.close()
                    conn.close()
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                        'error': 'Эта почта общая для нескольких сотрудников — введите свой логин'
                    }, ensure_ascii=False)}
            cur.close()
            conn.close()
            return neutral
        login, name, email = target
        cur.execute("SELECT COUNT(*) FROM password_resets WHERE user_login = " + q(login)
                    + " AND created_at > NOW() - INTERVAL '15 minutes'")
        if cur.fetchone()[0] >= 3:
            cur.close()
            conn.close()
            return {'statusCode': 429, 'headers': CORS, 'body': json.dumps({
                'error': 'Код уже отправляли несколько раз. Проверьте почту или попробуйте через 15 минут'
            }, ensure_ascii=False)}
        code = str(secrets.randbelow(900000) + 100000)
        cur.execute("UPDATE password_resets SET used = TRUE WHERE user_login = " + q(login) + " AND used = FALSE")
        cur.execute(
            "INSERT INTO password_resets (user_login, code_hash, expires_at) VALUES ("
            + q(login) + ', ' + q(code_hash(login, code)) + ", NOW() + INTERVAL '15 minutes')"
        )
        conn.commit()
        cur.close()
        conn.close()
        send_mail(email, 'Код для смены пароля ICONFOOD', mail_card(
            (name or '').strip(),
            'Вы запросили смену пароля в рабочем пространстве ICONFOOD. Введите этот код на странице входа.',
            [('Логин', login), ('Код', code)],
            'Код действует 15 минут. Если вы ничего не запрашивали — просто удалите письмо, пароль останется прежним.',
        ))
        return neutral

    if action == 'reset_confirm':
        ident = str(body.get('login', '')).strip().lower()
        code = str(body.get('code', '')).strip()
        fresh = str(body.get('password', ''))
        if len(fresh) < 6:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps(
                {'error': 'Новый пароль — минимум 6 символов'}, ensure_ascii=False)}
        target = find_for_reset(cur, ident)
        bad = {'statusCode': 400, 'headers': CORS, 'body': json.dumps(
            {'error': 'Код неверный или устарел — запросите новый'}, ensure_ascii=False)}
        if not target:
            cur.close()
            conn.close()
            return bad
        login = target[0]
        cur.execute(
            'SELECT id, code_hash, attempts FROM password_resets WHERE user_login = ' + q(login)
            + ' AND used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1'
        )
        row = cur.fetchone()
        if not row or row[2] >= 5:
            cur.close()
            conn.close()
            return bad
        if row[1] != code_hash(login, code):
            cur.execute('UPDATE password_resets SET attempts = attempts + 1'
                        + (', used = TRUE' if row[2] + 1 >= 5 else '') + ' WHERE id = ' + str(row[0]))
            conn.commit()
            cur.close()
            conn.close()
            left = 4 - row[2]
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': ('Код неверный. Осталось попыток: ' + str(left)) if left > 0
                else 'Попытки закончились — запросите новый код'
            }, ensure_ascii=False)}
        cur.execute('UPDATE password_resets SET used = TRUE WHERE id = ' + str(row[0]))
        cur.execute('UPDATE users SET password_hash = ' + q(hash_password(login, fresh))
                    + ' WHERE login = ' + q(login))
        cur.execute('UPDATE sessions SET expires_at = NOW() WHERE user_id IN '
                    '(SELECT id FROM users WHERE login = ' + q(login) + ')')
        cur.execute('SELECT id, name, login, role, restaurant, email, position FROM users WHERE login = ' + q(login))
        u = cur.fetchone()
        token = secrets.token_hex(24)
        expires = (datetime.utcnow() + timedelta(days=14)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute('INSERT INTO sessions (token, user_id, expires_at) VALUES ('
                    + q(token) + ', ' + str(u[0]) + ', ' + q(expires) + ')')
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'token': token,
            'user': {'name': u[1], 'login': u[2], 'role': u[3], 'restaurant': u[4], 'email': u[5], 'position': u[6]},
        })}

    if action == 'invite':
        name = str(body.get('name', '')).strip()
        email = str(body.get('email', '')).strip().lower()
        role = str(body.get('role', 'staff'))
        restaurant = str(body.get('restaurant', ''))
        me = current_user(cur, event)
        if not me or me['role'] not in ('owner', 'manager'):
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Добавлять сотрудников может руководитель'})}
        if not name or '@' not in email:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите имя и корректную почту'})}
        cur.execute('SELECT active FROM users WHERE email = ' + q(email))
        same = cur.fetchone()
        if same:
            cur.close()
            conn.close()
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({
                'error': 'Сотрудник с такой почтой уже в системе'
                         if same[0] else 'Такой сотрудник был отключён — восстановите его карточку'})}
        login = email.split('@')[0]
        password = secrets.token_hex(4)
        cur.execute(
            'INSERT INTO users (name, login, email, password_hash, role, restaurant, position) VALUES ('
            + q(name) + ', ' + q(login) + ', ' + q(email) + ', ' + q(hash_password(login, password)) + ', '
            + q(role) + ', ' + q(restaurant) + ', ' + q(str(body.get('position', ''))[:120])
            + ') ON CONFLICT (login) DO NOTHING RETURNING id'
        )
        created = cur.fetchone()
        if created:
            sync_unit_channel(cur, login, restaurant)
        conn.commit()
        cur.close()
        conn.close()
        if not created:
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Такой сотрудник уже есть'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'login': login, 'password': password})}

    if action == 'change_password':
        me = current_user(cur, event)
        if not me:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Требуется вход'})}

        current = str(body.get('current', ''))
        fresh = str(body.get('password', ''))

        if len(fresh) < 6:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Новый пароль — минимум 6 символов'})}

        if fresh == current:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Новый пароль совпадает со старым'})}

        login = me['login']
        cur.execute('SELECT password_hash FROM users WHERE login = ' + q(login))
        row = cur.fetchone()
        if not row or row[0] != hash_password(login, current):
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Текущий пароль указан неверно'})}

        token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token', '')
        cur.execute('UPDATE users SET password_hash = ' + q(hash_password(login, fresh))
                    + ' WHERE login = ' + q(login))
        cur.execute('UPDATE sessions SET expires_at = NOW() WHERE token <> ' + q(token)
                    + ' AND user_id IN (SELECT id FROM users WHERE login = ' + q(login) + ')')
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    if action in ('update', 'dismiss', 'restore', 'reset_password'):
        me = current_user(cur, event)
        if not me:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Требуется вход'})}
        if me['role'] not in ('owner', 'manager'):
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Недостаточно прав'})}
        login = str(body.get('login', '')).strip().lower()
        cur.execute('SELECT name, role, email FROM users WHERE login = ' + q(login))
        target = cur.fetchone()
        if not target:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Сотрудник не найден'})}

        if action == 'dismiss':
            if login == me['login']:
                cur.close()
                conn.close()
                return {'statusCode': 400, 'headers': CORS,
                        'body': json.dumps({'error': 'Нельзя отключить самого себя'})}
            cur.execute('UPDATE users SET active = FALSE WHERE login = ' + q(login))
            cur.execute('UPDATE channel_members SET active = FALSE WHERE user_login = ' + q(login))
            cur.execute('UPDATE sessions SET expires_at = NOW() WHERE user_id IN '
                        '(SELECT id FROM users WHERE login = ' + q(login) + ')')
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'reset_password':
            password = secrets.token_hex(4)
            cur.execute('UPDATE users SET password_hash = ' + q(hash_password(login, password))
                        + ' WHERE login = ' + q(login))
            cur.execute('UPDATE sessions SET expires_at = NOW() WHERE user_id IN '
                        '(SELECT id FROM users WHERE login = ' + q(login) + ')')
            conn.commit()
            cur.close()
            conn.close()
            mailed = send_access_email(target[2], target[0], login, password)
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'ok': True, 'login': login, 'password': password,
                                        'mailed': mailed, 'email': target[2] or ''})}

        if action == 'restore':
            cur.execute('UPDATE users SET active = TRUE WHERE login = ' + q(login))
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        name = str(body.get('name', '')).strip()[:120]
        email = str(body.get('email', '')).strip().lower()[:160]
        if not name or len(name) < 3:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Имя — минимум 3 символа'})}
        if '@' not in email or '.' not in email.split('@')[-1]:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Укажите корректную почту'})}
        cur.execute('SELECT 1 FROM users WHERE email = ' + q(email) + ' AND login <> ' + q(login))
        if cur.fetchone():
            cur.close()
            conn.close()
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'Эта почта уже занята'})}
        sets = 'name = ' + q(name) + ', email = ' + q(email)
        if 'position' in body:
            sets += ', position = ' + q(str(body.get('position', ''))[:120])
        if body.get('role'):
            sets += ', role = ' + q(str(body.get('role')))
        restaurant = str(body.get('restaurant', '')).strip()
        if restaurant:
            sets += ', restaurant = ' + q(restaurant)
        cur.execute('UPDATE users SET ' + sets + ' WHERE login = ' + q(login))
        rename_everywhere(cur, target[0], name)
        if restaurant:
            sync_unit_channel(cur, login, restaurant)
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    if action == 'role':
        login = str(body.get('login', '')).strip().lower()
        role = str(body.get('role', 'staff'))
        restaurant = str(body.get('restaurant', '')).strip()
        sets = 'role = ' + q(role)
        if restaurant:
            sets += ', restaurant = ' + q(restaurant)
        if 'position' in body:
            sets += ', position = ' + q(str(body.get('position', ''))[:120])
        cur.execute('UPDATE users SET ' + sets + ' WHERE login = ' + q(login))
        if restaurant:
            sync_unit_channel(cur, login, restaurant)
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close()
    conn.close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown action'})}