import json
import os
import hashlib
import secrets
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
            cur.execute('SELECT id, name, login, email, role, restaurant, position FROM users WHERE active = TRUE ORDER BY id')
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

    if action == 'invite':
        name = str(body.get('name', '')).strip()
        email = str(body.get('email', '')).strip().lower()
        role = str(body.get('role', 'staff'))
        restaurant = str(body.get('restaurant', ''))
        if not name or '@' not in email:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите имя и корректную почту'})}
        login = email.split('@')[0]
        password = secrets.token_hex(4)
        cur.execute(
            'INSERT INTO users (name, login, email, password_hash, role, restaurant) VALUES ('
            + q(name) + ', ' + q(login) + ', ' + q(email) + ', ' + q(hash_password(login, password)) + ', '
            + q(role) + ', ' + q(restaurant) + ') ON CONFLICT (login) DO NOTHING RETURNING id'
        )
        created = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not created:
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Такой сотрудник уже есть'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'login': login, 'password': password})}

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
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close()
    conn.close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown action'})}
