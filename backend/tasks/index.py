import base64
import json
import os
import re
import smtplib
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timedelta
from email.header import Header
from email.mime.text import MIMEText

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
        'SELECT u.login, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id '
        'WHERE s.token = ' + q(token) + ' AND s.expires_at > NOW()'
    )
    row = cur.fetchone()
    return {'login': row[0], 'name': row[1], 'role': row[2]} if row else None


def can_manage(cur, user, task_id=None) -> bool:
    """Править и удалять задачи могут владельцы, управляющие и хозяин личной задачи."""
    if user.get('role') in ('owner', 'manager'):
        return True
    if task_id:
        cur.execute('SELECT owner_login FROM tasks WHERE id = ' + str(int(task_id)))
        row = cur.fetchone()
        if row and row[0] and row[0] == user['login']:
            return True
    return False


DENIED = {'statusCode': 403, 'headers': CORS,
          'body': json.dumps({'error': 'Изменять задачи могут владелец и управляющий'})}


def tg_send(chat_id: str, text: str) -> None:
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not token or not chat_id:
        return
    base = os.environ.get('TELEGRAM_API_BASE', '').strip().rstrip('/') or 'https://api.telegram.org'
    url = base + '/bot' + token + '/sendMessage'
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': text[:3800]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=1.5)
    except Exception:
        return


def tg_personal(cur, login, text) -> None:
    """Шлёт личное уведомление сотруднику в Telegram, если он привязал аккаунт."""
    if not os.environ.get('TELEGRAM_BOT_TOKEN') or not login:
        return
    cur.execute("SELECT tg_chat_id FROM users WHERE login = " + q(login) + " AND tg_chat_id <> ''")
    row = cur.fetchone()
    if row:
        tg_send(row[0], text)


def tg_fanout(cur, channel_id, author_login, author_name, text) -> None:
    """Дублирует сообщение канала в Telegram участникам, привязавшим аккаунт."""
    if not os.environ.get('TELEGRAM_BOT_TOKEN'):
        return
    cur.execute('SELECT name, is_open FROM channels WHERE id = ' + str(int(channel_id)))
    row = cur.fetchone()
    if not row:
        return
    channel_name, is_open = row
    if is_open:
        cur.execute(
            "SELECT tg_chat_id FROM users WHERE active = TRUE AND tg_chat_id <> '' "
            'AND login <> ' + q(author_login)
        )
    else:
        cur.execute(
            'SELECT u.tg_chat_id FROM channel_members m JOIN users u ON u.login = m.user_login '
            'WHERE m.channel_id = ' + str(int(channel_id)) + ' AND m.active = TRUE AND u.active = TRUE '
            "AND u.tg_chat_id <> '' AND u.login <> " + q(author_login)
        )
    body = channel_name + '\n' + author_name + ': ' + text
    for (chat_id,) in cur.fetchall():
        tg_send(chat_id, body)


def send_email(to_email: str, subject: str, html: str) -> None:
    host = os.environ.get('SMTP_HOST', '')
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password or not to_email:
        return
    sender = os.environ.get('SMTP_FROM', user)
    port = int(os.environ.get('SMTP_PORT', '465'))
    msg = MIMEText(html, 'html', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = sender
    msg['To'] = to_email
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=8)
        else:
            server = smtplib.SMTP(host, port, timeout=8)
            server.starttls()
        server.login(user, password)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
    except Exception:
        return


def send_email_bulk(letters) -> None:
    """Отправляет пачку писем одним подключением к почтовому серверу."""
    host = os.environ.get('SMTP_HOST', '')
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    if not host or not user or not password or not letters:
        return
    sender = os.environ.get('SMTP_FROM', user)
    port = int(os.environ.get('SMTP_PORT', '465'))
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.starttls()
        server.login(user, password)
        for to_email, subject, html in letters:
            if not to_email:
                continue
            msg = MIMEText(html, 'html', 'utf-8')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = sender
            msg['To'] = to_email
            try:
                server.sendmail(sender, [to_email], msg.as_string())
            except Exception:
                continue
        server.quit()
    except Exception:
        return


def mail_layout(greeting: str, lead: str, title: str, rows, footer: str, extra: str = '') -> str:
    """Собирает письмо в фирменном оформлении холдинга."""
    cells = ''.join(
        '<p style="margin:4px 0;font-size:14px;color:#444">' + label + ': <b>' + str(value) + '</b></p>'
        for label, value in rows if value
    )
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">'
        '<p style="font-size:15px;color:#111">' + greeting + '</p>'
        '<p style="font-size:14px;color:#333">' + lead + '</p>'
        '<div style="border:1px solid #e5e5e5;border-radius:14px;padding:16px 18px;margin:16px 0">'
        '<p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#111">' + title + '</p>'
        + cells + extra +
        '</div>'
        '<p style="font-size:13px;color:#888">' + footer + '</p>'
        '</div>'
    )


def email_of(cur, login):
    cur.execute('SELECT email, name FROM users WHERE login = ' + q(login))
    row = cur.fetchone()
    return (row[0], row[1]) if row else ('', '')


def people_list(value) -> list:
    """Разбирает поле ответственных: несколько имён хранятся через «|»."""
    if isinstance(value, list):
        names = value
    else:
        names = str(value or '').split('|')
    out = []
    for name in names:
        name = name.strip()
        if name and name not in out:
            out.append(name)
    return out


def notify_new_task(cur, task_id, actor, title, restaurant, deadline, template, assignee, subtasks):
    for name in people_list(assignee):
        notify_one_assignee(cur, task_id, actor, title, restaurant, deadline, template, name, subtasks)


def notify_one_assignee(cur, task_id, actor, title, restaurant, deadline, template, assignee, subtasks):
    if not assignee or assignee == actor:
        return
    cur.execute('SELECT login, email FROM users WHERE name = ' + q(assignee))
    target = cur.fetchone()
    if not target:
        return
    head = template or 'Новая задача'
    cur.execute(
        'INSERT INTO notifications (recipient_login, task_id, task_title, kind, actor, text) VALUES ('
        + q(target[0]) + ', ' + str(task_id) + ', ' + q(title) + ', ' + q('task') + ', '
        + q(actor) + ', ' + q(head[:300]) + ')'
    )
    steps = ''.join(
        '<li style="margin:4px 0;color:#333">' + str(s.get('title', ''))[:200] + '</li>'
        for s in (subtasks or [])
    )
    steps_block = (
        '<p style="margin:18px 0 6px;font-weight:600;color:#111">Подзадачи</p>'
        '<ol style="margin:0;padding-left:20px;font-size:14px">' + steps + '</ol>'
        if steps else ''
    )
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">'
        '<p style="font-size:15px;color:#111">Здравствуйте, ' + assignee.split(' ')[0] + '!</p>'
        '<p style="font-size:14px;color:#333">' + actor + ' назначил вас ответственным по задаче.</p>'
        '<div style="border:1px solid #e5e5e5;border-radius:14px;padding:16px 18px;margin:16px 0">'
        '<p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#111">' + title + '</p>'
        '<p style="margin:4px 0;font-size:14px;color:#444">Ресторан: <b>' + (restaurant or '—') + '</b></p>'
        '<p style="margin:4px 0;font-size:14px;color:#444">Дедлайн: <b>' + (deadline or '—') + '</b></p>'
        + ('<p style="margin:4px 0;font-size:14px;color:#444">Шаблон: <b>' + template + '</b></p>' if template else '')
        + steps_block +
        '</div>'
        '<p style="font-size:13px;color:#888">Задача уже на доске ICONFOOD — откройте рабочее пространство, чтобы начать.</p>'
        '</div>'
    )
    send_email(target[1], 'Новая задача: ' + title, html)
    lines = ['Новая задача на вас', title]
    if restaurant:
        lines.append('Подразделение: ' + restaurant)
    if deadline:
        lines.append('Дедлайн: ' + deadline)
    lines.append('Поставил: ' + actor)
    if subtasks:
        lines.append('Шагов: ' + str(len(subtasks)))
    tg_personal(cur, target[0], '\n'.join(lines))


def announce_task(cur, actor, title, restaurant, deadline, assignee, template, steps):
    """Публикует новую задачу сообщением в канал подразделения."""
    if not restaurant:
        return
    cur.execute('SELECT id FROM channels WHERE unit = ' + q(restaurant) + ' AND archived = FALSE')
    row = cur.fetchone()
    if not row:
        return
    lines = ['Новая задача: ' + title]
    if deadline:
        lines.append('Дедлайн: ' + deadline)
    named = people_list(assignee)
    if named:
        label = 'Ответственные: ' if len(named) > 1 else 'Ответственный: '
        lines.append(label + ', '.join(named))
    if template:
        lines.append('Шаблон: ' + template)
    if steps:
        lines.append('Шагов: ' + str(steps))
    cur.execute(
        'INSERT INTO messages (channel_id, author, author_login, text) VALUES ('
        + str(row[0]) + ', ' + q(actor) + ", 'system', " + q('\n'.join(lines)) + ')'
    )
    tg_fanout(cur, row[0], '', actor, '\n'.join(lines))


def announce_done(cur, task_id, actor):
    """Сообщает в канал подразделения, что задача закрыта."""
    cur.execute(
        'SELECT title, restaurant, assignee, owner_login FROM tasks WHERE id = ' + str(task_id)
    )
    row = cur.fetchone()
    if not row:
        return
    title, restaurant, assignee, owner_login = row
    if owner_login or not restaurant:
        return
    cur.execute('SELECT id FROM channels WHERE unit = ' + q(restaurant) + ' AND archived = FALSE')
    channel = cur.fetchone()
    if not channel:
        return
    lines = ['Задача закрыта: ' + title, 'Закрыл: ' + actor]
    named = [n for n in people_list(assignee) if n != actor]
    if named:
        lines.append(('Ответственные: ' if len(named) > 1 else 'Ответственный: ') + ', '.join(named))
    cur.execute(
        'INSERT INTO messages (channel_id, author, author_login, text) VALUES ('
        + str(channel[0]) + ', ' + q(actor) + ", 'system', " + q('\n'.join(lines)) + ')'
    )
    tg_fanout(cur, channel[0], '', actor, '\n'.join(lines))


def announce_comment(cur, task_id, actor, text):
    """Публикует комментарий к задаче в канал подразделения."""
    cur.execute('SELECT title, restaurant, owner_login FROM tasks WHERE id = ' + str(task_id))
    row = cur.fetchone()
    if not row:
        return
    title, restaurant, owner_login = row
    if owner_login or not restaurant:
        return
    cur.execute('SELECT id FROM channels WHERE unit = ' + q(restaurant) + ' AND archived = FALSE')
    channel = cur.fetchone()
    if not channel:
        return
    body_text = text if len(text) <= 400 else text[:400] + '…'
    lines = ['Комментарий к задаче: ' + title, actor + ': ' + body_text]
    cur.execute(
        'INSERT INTO messages (channel_id, author, author_login, text) VALUES ('
        + str(channel[0]) + ', ' + q(actor) + ", 'system', " + q('\n'.join(lines)) + ')'
    )


MONTHS = {
    'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
    'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
}


def deadline_date(deadline: str, today):
    parts = str(deadline).strip().split()
    if len(parts) < 2 or not parts[0].isdigit():
        return None
    month = MONTHS.get(parts[1].lower())
    if not month:
        return None
    year = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else today.year
    try:
        due = date(year, month, int(parts[0]))
    except ValueError:
        return None
    if len(parts) < 3 and (due - today).days < -180:
        try:
            due = date(year + 1, month, int(parts[0]))
        except ValueError:
            return None
    return due


def announce_overdue(cur):
    """Сообщает в каналы подразделений о задачах, просроченных по дедлайну."""
    today = date.today()
    cur.execute(
        'SELECT t.id, t.title, t.restaurant, t.assignee, t.deadline, c.id FROM tasks t '
        'JOIN channels c ON c.unit = t.restaurant AND c.archived = FALSE '
        "WHERE t.column_id <> 'done' AND t.overdue_announced = FALSE AND t.owner_login = '' "
        "AND t.deadline <> ''"
    )
    for task_id, title, restaurant, assignee, deadline, channel_id in cur.fetchall():
        due = deadline_date(deadline, today)
        if not due or due >= today:
            continue
        days = (today - due).days
        tail = 'дней'
        if days % 10 == 1 and days % 100 != 11:
            tail = 'день'
        elif days % 10 in (2, 3, 4) and days % 100 not in (12, 13, 14):
            tail = 'дня'
        lines = [
            'Просрочена задача: ' + title,
            'Срок был ' + deadline + ' — просрочка ' + str(days) + ' ' + tail,
        ]
        named = people_list(assignee)
        if named:
            lines.append(('Ответственные: ' if len(named) > 1 else 'Ответственный: ') + ', '.join(named))
        cur.execute(
            'INSERT INTO messages (channel_id, author, author_login, text) VALUES ('
            + str(channel_id) + ", 'Контроль сроков', 'system', " + q('\n'.join(lines)) + ')'
        )
        cur.execute('UPDATE tasks SET overdue_announced = TRUE WHERE id = ' + str(task_id))
        tg_fanout(cur, channel_id, '', 'Контроль сроков', '\n'.join(lines))
        for person in named:
            cur.execute('SELECT login FROM users WHERE name = ' + q(person))
            who = cur.fetchone()
            if who:
                tg_personal(cur, who[0], 'Просрочена ваша задача\n' + title
                            + '\nСрок был ' + deadline + ' — просрочка ' + str(days) + ' ' + tail)
                to_email, who_name = email_of(cur, who[0])
                send_email(
                    to_email,
                    'Просрочена задача: ' + title,
                    mail_layout(
                        'Здравствуйте, ' + who_name.split(' ')[0] + '!',
                        'Срок по вашей задаче уже прошёл.',
                        title,
                        [('Подразделение', restaurant), ('Срок был', deadline),
                         ('Просрочка', str(days) + ' ' + tail)],
                        'Откройте рабочее пространство ICONFOOD и обновите статус задачи.',
                    ),
                )


def daily_digest(cur):
    """Утренняя сводка: что горит сегодня — письмом на почту и в Telegram."""
    moscow_now = datetime.utcnow() + timedelta(hours=3)
    today, hour = moscow_now.date(), moscow_now.hour
    if hour < 8:
        return
    cur.execute('SELECT 1 FROM digest_log WHERE sent_on = ' + q(today.isoformat()))
    if cur.fetchone():
        return
    cur.execute(
        'INSERT INTO digest_log (sent_on) VALUES (' + q(today.isoformat()) + ') '
        'ON CONFLICT (sent_on) DO NOTHING RETURNING sent_on'
    )
    if not cur.fetchone():
        return
    cur.execute(
        "SELECT login, name, tg_chat_id, email FROM users WHERE active = TRUE "
        "AND (tg_chat_id <> '' OR email <> '') LIMIT 80"
    )
    people = cur.fetchall()
    if not people:
        return
    cur.execute(
        "SELECT assignee, title, restaurant, deadline FROM tasks "
        "WHERE archived = FALSE AND column_id <> 'done' AND deadline <> '' AND assignee <> ''"
    )
    by_person = {}
    for assignee, title, restaurant, deadline in cur.fetchall():
        due = deadline_date(deadline, today)
        if not due:
            continue
        left = (due - today).days
        if left > 3:
            continue
        for person in people_list(assignee):
            by_person.setdefault(person, []).append((left, title, restaurant, deadline))
    letters = []
    for login, name, chat_id, mail in people:
        rows = by_person.get(name) or []
        if not rows:
            continue
        rows.sort()
        lines = ['Сводка на ' + today.strftime('%d.%m'), '']
        items = ''
        for left, title, restaurant, deadline in rows[:12]:
            if left < 0:
                mark, color = 'просрочено на ' + str(-left) + ' дн.', '#c0392b'
            elif left == 0:
                mark, color = 'срок сегодня', '#c0392b'
            elif left == 1:
                mark, color = 'срок завтра', '#b7791f'
            else:
                mark, color = 'через ' + str(left) + ' дн.', '#2d6a4f'
            place = ' · ' + restaurant if restaurant else ''
            lines.append('• ' + title + place + ' — ' + mark)
            items += (
                '<li style="margin:7px 0;color:#333;font-size:14px">' + title
                + '<span style="color:#888">' + place + '</span> — '
                '<b style="color:' + color + '">' + mark + '</b></li>'
            )
        if len(rows) > 12:
            lines.append('…и ещё ' + str(len(rows) - 12))
        if chat_id:
            tg_send(chat_id, '\n'.join(lines))
        if mail:
            letters.append((
                mail,
                'Сводка на ' + today.strftime('%d.%m') + ': задач в работе — ' + str(len(rows)),
                mail_layout(
                    'Доброе утро, ' + name.split(' ')[0] + '!',
                    'Вот что требует внимания сегодня.',
                    'Задачи с близким сроком',
                    [],
                    'Полная картина — на доске в рабочем пространстве ICONFOOD.',
                    '<ul style="margin:6px 0 0;padding-left:18px">' + items + '</ul>',
                ),
            ))
    send_email_bulk(letters)


def notify_assignee(cur, task_id, actor, kind, text):
    cur.execute('SELECT title, assignee FROM tasks WHERE id = ' + str(task_id))
    row = cur.fetchone()
    if not row:
        return
    title, assignee = row
    for person in people_list(assignee):
        if person != actor:
            notify_one_activity(cur, task_id, title, actor, kind, text, person)


def notify_one_activity(cur, task_id, title, actor, kind, text, assignee):
    cur.execute('SELECT login FROM users WHERE name = ' + q(assignee))
    target = cur.fetchone()
    if not target:
        return
    cur.execute(
        'INSERT INTO notifications (recipient_login, task_id, task_title, kind, actor, text) VALUES ('
        + q(target[0]) + ', ' + str(task_id) + ', ' + q(title) + ', ' + q(kind) + ', ' + q(actor) + ', ' + q(text[:300]) + ')'
    )
    head = ('Новый файл в задаче' if kind == 'file'
            else 'Задача изменена' if kind == 'update'
            else 'Комментарий к задаче')
    tg_personal(cur, target[0], head + '\n' + title + '\n' + actor + ': ' + text[:500])
    to_email, who_name = email_of(cur, target[0])
    if kind == 'update':
        lead = actor + ' изменил вашу задачу.'
        rows = [('Что изменилось', text[:300]), ('Кто', actor)]
        extra = ''
    elif kind == 'file':
        lead = actor + ' прикрепил файл к вашей задаче.'
        rows = [('Файл', text[:200]), ('Кто', actor)]
        extra = ''
    else:
        lead = actor + ' оставил комментарий в вашей задаче.'
        rows = [('Кто', actor)]
        extra = (
            '<p style="margin:12px 0 0;font-size:14px;color:#333;border-left:3px solid #e5e5e5;'
            'padding-left:12px">' + text[:600] + '</p>'
        )
    send_email(
        to_email,
        head + ': ' + title,
        mail_layout(
            'Здравствуйте, ' + who_name.split(' ')[0] + '!',
            lead,
            title,
            rows,
            'Ответить можно в карточке задачи в рабочем пространстве ICONFOOD.',
            extra,
        ),
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
    cur.execute(
        'SELECT c.id, c.name, c.hint, c.is_open, c.created_by, c.kind, c.unit FROM channels c WHERE c.archived = FALSE AND '
        '(c.is_open = TRUE OR EXISTS (SELECT 1 FROM channel_members m WHERE m.channel_id = c.id '
        'AND m.active = TRUE AND m.user_login = ' + q(user['login']) + ')) ORDER BY c.position, c.id'
    )
    rows = cur.fetchall()

    cur.execute(
        'SELECT m.channel_id, u.name, u.login FROM channel_members m JOIN users u ON u.login = m.user_login '
        'WHERE m.active = TRUE ORDER BY u.id'
    )
    members = {}
    for cid, name, login_name in cur.fetchall():
        members.setdefault(cid, []).append({'name': name, 'login': login_name})

    cur.execute(
        'SELECT channel_id, id, author, author_login, text, created_at, file_url, file_name, '
        'file_mime, file_size FROM messages WHERE archived = FALSE ORDER BY id'
    )
    grouped = {}
    for row in cur.fetchall():
        channel_id, mid, author, author_login, text, created, f_url, f_name, f_mime, f_size = row
        message = {
            'id': str(mid),
            'author': author,
            'text': text,
            'time': created.strftime('%H:%M'),
            'createdAt': created.isoformat(),
            'own': author_login == user['login'] and author_login != 'system',
            'system': author_login == 'system',
        }
        if f_url:
            message['file'] = {
                'url': f_url,
                'name': f_name,
                'mime': f_mime,
                'size': f_size,
            }
        grouped.setdefault(channel_id, []).append(message)

    cur.execute('SELECT channel_id, last_read_id FROM channel_reads WHERE user_login = ' + q(user['login']))
    reads = {r[0]: r[1] for r in cur.fetchall()}

    channels = []
    for cid, name, hint, is_open, created_by, kind, unit in rows:
        msgs = grouped.get(cid, [])
        last_read = reads.get(cid, 0)
        people = members.get(cid, [])
        title = name
        subtitle = hint or ('Все сотрудники' if is_open else f'{len(people)} участников')
        if unit:
            subtitle = f'Подразделение · {len(people)} участников'
        if kind == 'direct':
            other = next((p for p in people if p['login'] != user['login']), None)
            if other:
                title = other['name']
                cur.execute('SELECT position FROM users WHERE login = ' + q(other['login']))
                pos = cur.fetchone()
                subtitle = (pos[0] if pos and pos[0] else 'Личная переписка')
        channels.append({
            'id': str(cid),
            'name': title,
            'hint': subtitle,
            'kind': kind,
            'open': is_open,
            'createdBy': created_by,
            'unit': unit,
            'members': people,
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
            'assignee': people_list(r[7])[0] if people_list(r[7]) else '',
            'assignees': people_list(r[7]),
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
        for job in (announce_overdue, daily_digest):
            try:
                job(cur)
                conn.commit()
            except Exception as exc:
                conn.rollback()
                print('background job failed:', job.__name__, exc)
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

    if action == 'open_direct':
        other = str(body.get('login', '')).strip().lower()
        if other and other != user['login']:
            key = ':'.join(sorted([user['login'], other]))
            cur.execute('SELECT id FROM channels WHERE dm_key = ' + q(key))
            found = cur.fetchone()
            if not found:
                cur.execute(
                    "INSERT INTO channels (name, hint, position, is_open, created_by, kind, dm_key) "
                    "VALUES ('Личная переписка', '', 500, FALSE, " + q(user['login'])
                    + ", 'direct', " + q(key) + ') RETURNING id'
                )
                new_id = cur.fetchone()[0]
                for who in (user['login'], other):
                    cur.execute(
                        'INSERT INTO channel_members (channel_id, user_login, active) VALUES ('
                        + str(new_id) + ', ' + q(who) + ', TRUE) '
                        'ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE'
                    )
                conn.commit()
    elif action == 'channel_members':
        channel_id = int(body.get('channelId'))
        add = body.get('add') or []
        remove = body.get('remove') or []
        for login_name in add:
            cur.execute(
                'INSERT INTO channel_members (channel_id, user_login, active) VALUES ('
                + str(channel_id) + ', ' + q(str(login_name)) + ', TRUE) '
                'ON CONFLICT (channel_id, user_login) DO UPDATE SET active = TRUE'
            )
        for login_name in remove:
            cur.execute(
                'UPDATE channel_members SET active = FALSE WHERE channel_id = ' + str(channel_id)
                + ' AND user_login = ' + q(str(login_name))
            )
        if add:
            cur.execute('UPDATE channels SET is_open = FALSE WHERE id = ' + str(channel_id))
        conn.commit()
    elif action == 'rename_channel':
        channel_id = int(body.get('channelId'))
        name = str(body.get('name', '')).strip()[:160]
        hint = str(body.get('hint', '')).strip()[:160]
        if name:
            cur.execute(
                'UPDATE channels SET name = ' + q(name) + ', hint = ' + q(hint)
                + ' WHERE id = ' + str(channel_id)
            )
            conn.commit()
    elif action == 'create_channel':
        name = str(body.get('name', '')).strip()[:160]
        hint = str(body.get('hint', '')).strip()[:160]
        people = body.get('members') or []
        if name:
            is_open = 'TRUE' if not people else 'FALSE'
            cur.execute(
                'INSERT INTO channels (name, hint, position, is_open, created_by) VALUES ('
                + q(name) + ', ' + q(hint) + ', 100, ' + is_open + ', ' + q(user['login']) + ') RETURNING id'
            )
            channel_id = cur.fetchone()[0]
            logins = set(str(p) for p in people)
            logins.add(user['login'])
            for login_name in logins:
                cur.execute(
                    'INSERT INTO channel_members (channel_id, user_login) VALUES ('
                    + str(channel_id) + ', ' + q(login_name) + ') ON CONFLICT DO NOTHING'
                )
            conn.commit()
    elif action == 'send_message':
        text = str(body.get('text', '')).strip()
        raw = str(body.get('data', ''))
        f_url = ''
        f_name = str(body.get('name', ''))[:200]
        f_mime = str(body.get('mime', ''))[:120]
        f_size = 0
        if raw:
            if ',' in raw and raw.strip().startswith('data:'):
                raw = raw.split(',', 1)[1]
            content = base64.b64decode(raw)
            f_size = len(content)
            safe = re.sub(r'[^A-Za-z0-9._-]', '_', f_name) or 'file'
            key = f"chat/{int(body.get('channelId'))}/{uuid.uuid4().hex[:10]}_{safe}"
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(Bucket='files', Key=key, Body=content, ContentType=f_mime or 'application/octet-stream')
            f_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        if text or f_url:
            cur.execute(
                'INSERT INTO messages (channel_id, author, author_login, text, file_url, file_name, '
                'file_mime, file_size) VALUES ('
                + str(int(body.get('channelId'))) + ', ' + q(user['name']) + ', '
                + q(user['login']) + ', ' + q(text[:2000]) + ', ' + q(f_url) + ', '
                + q(f_name) + ', ' + q(f_mime) + ', ' + str(f_size) + ')'
            )
            conn.commit()
            body_text = text[:2000] if text else ('Файл: ' + f_name)
            tg_fanout(cur, int(body.get('channelId')), user['login'], user['name'], body_text)
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
        task_id = int(body.get('taskId'))
        column = str(body.get('column'))
        cur.execute('SELECT column_id FROM tasks WHERE id = ' + str(task_id))
        before = cur.fetchone()
        if column == 'done':
            cur.execute('SELECT COUNT(*) FROM subtasks WHERE task_id = ' + str(task_id)
                        + ' AND archived = FALSE AND done = FALSE')
            left = int(cur.fetchone()[0])
            if left:
                cur.close()
                conn.close()
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({
                    'error': 'Сначала закройте подзадачи — осталось ' + str(left)})}
        cur.execute('UPDATE tasks SET column_id = ' + q(column) + ' WHERE id = ' + str(task_id))
        if column == 'done' and before and before[0] != 'done':
            announce_done(cur, task_id, user['name'])
        conn.commit()
    elif action == 'add_subtasks':
        task_id = int(body.get('taskId'))
        if not can_manage(cur, user, task_id):
            cur.close()
            conn.close()
            return DENIED
        titles = [str(t).strip()[:300] for t in (body.get('titles') or []) if str(t).strip()]
        cur.execute(
            'SELECT COALESCE(MAX(position), 0) FROM subtasks WHERE task_id = ' + str(task_id)
        )
        row = cur.fetchone()
        start = int(row[0]) if row and row[0] is not None else 0
        for i, t in enumerate(titles):
            cur.execute(
                'INSERT INTO subtasks (task_id, title, done, position) VALUES ('
                + str(task_id) + ', ' + q(t) + ', FALSE, ' + str(start + i + 1) + ')'
            )
        conn.commit()
    elif action == 'rename_subtask':
        if not can_manage(cur, user, body.get('taskId')):
            cur.close()
            conn.close()
            return DENIED
        title = str(body.get('title', '')).strip()[:300]
        if not title:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Название шага не может быть пустым'})}
        cur.execute('UPDATE subtasks SET title = ' + q(title)
                    + ' WHERE id = ' + str(int(body.get('subtaskId'))))
        conn.commit()
    elif action == 'delete_subtask':
        if not can_manage(cur, user, body.get('taskId')):
            cur.close()
            conn.close()
            return DENIED
        cur.execute(
            'UPDATE subtasks SET archived = TRUE WHERE id = ' + str(int(body.get('subtaskId')))
        )
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
            announce_comment(cur, int(body.get('taskId')), user['name'], text)
            conn.commit()
    elif action == 'delete_task':
        task_id = int(body.get('taskId', 0))
        cur.execute('SELECT owner_login FROM tasks WHERE id = ' + str(task_id) + ' AND archived = FALSE')
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Задача не найдена'})}
        if row[0] and row[0] != user['login']:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Это личная задача другого сотрудника'})}
        if not can_manage(cur, user, task_id):
            cur.close()
            conn.close()
            return DENIED
        cur.execute('UPDATE tasks SET archived = TRUE WHERE id = ' + str(task_id))
        cur.execute('UPDATE subtasks SET archived = TRUE WHERE task_id = ' + str(task_id))
        conn.commit()
    elif action == 'update':
        task_id = int(body.get('taskId', 0))
        cur.execute('SELECT title, restaurant, priority, deadline, assignee, watchers, note, owner_login '
                    'FROM tasks WHERE id = ' + str(task_id) + ' AND archived = FALSE')
        before = cur.fetchone()
        if not before:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Задача не найдена'})}
        if before[7] and before[7] != user['login']:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Это личная задача другого сотрудника'})}
        if not can_manage(cur, user, task_id):
            cur.close()
            conn.close()
            return DENIED

        title = str(body.get('title', before[0])).strip()[:200]
        if not title:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите название задачи'})}
        restaurant = str(body.get('restaurant', before[1]))
        priority = str(body.get('priority', before[2]))
        deadline = str(body.get('deadline', before[3]))
        assignees = people_list(body.get('assignees') if 'assignees' in body else before[4])
        watchers = body.get('watchers') if 'watchers' in body else [w for w in (before[5] or '').split('|') if w]
        note = str(body.get('note', before[6]) or '')
        cover = body.get('cover')

        sets = ('title = ' + q(title) + ', restaurant = ' + q(restaurant) + ', priority = ' + q(priority)
                + ', deadline = ' + q(deadline) + ', assignee = ' + q('|'.join(assignees))
                + ', watchers = ' + q('|'.join(watchers)) + ', note = ' + q(note))
        if cover:
            sets += ', cover = ' + q(str(cover))
        cur.execute('UPDATE tasks SET ' + sets + ' WHERE id = ' + str(task_id))

        changes = []
        if title != before[0]:
            changes.append('название: «' + before[0] + '» → «' + title + '»')
        if deadline != (before[3] or ''):
            changes.append('срок: ' + (before[3] or 'не был указан') + ' → ' + (deadline or 'снят'))
        if priority != before[2]:
            changes.append('приоритет изменён')
        if restaurant != before[1]:
            changes.append('место: ' + (before[1] or '—') + ' → ' + (restaurant or '—'))
        was_people = people_list(before[4])
        if assignees != was_people:
            changes.append('ответственные: ' + (', '.join(assignees) or '—'))
        if changes:
            summary = '; '.join(changes)
            for person in assignees:
                if person != user['name']:
                    notify_one_activity(cur, task_id, title, user['name'], 'update', summary, person)
        conn.commit()

    elif action == 'create':
        owner = user['login'] if body.get('personal') else ''
        cur.execute(
            'INSERT INTO tasks (title, restaurant, column_id, priority, cover, deadline, assignee, watchers, '
            'template, note, track, gantt_start, gantt_span, owner_login) VALUES ('
            + q(body.get('title')) + ', ' + q(body.get('restaurant', '')) + ', ' + q(body.get('column', 'new')) + ', '
            + q(body.get('priority', 'normal')) + ', ' + q(body.get('cover', 'none')) + ', ' + q(body.get('deadline', '')) + ', '
            + q('|'.join(people_list(body.get('assignees') or body.get('assignee', '')))) + ', '
            + q('|'.join(body.get('watchers') or [])) + ', '
            + q(body.get('template')) + ', ' + q(body.get('note')) + ', ' + q(body.get('track', 'Задачи')) + ', '
            + str(int(body.get('ganttStart', 10))) + ', ' + str(int(body.get('ganttSpan', 30))) + ', ' + q(owner) + ') RETURNING id'
        )
        new_id = cur.fetchone()[0]
        subtasks = body.get('subtasks') or []
        for i, s in enumerate(subtasks):
            cur.execute(
                'INSERT INTO subtasks (task_id, title, done, position) VALUES ('
                + str(new_id) + ', ' + q(s.get('title')) + ', false, ' + str(i) + ')'
            )
        named = people_list(body.get('assignees') or body.get('assignee', ''))
        notify_new_task(
            cur, new_id, user['name'], str(body.get('title', '')), str(body.get('restaurant', '')),
            str(body.get('deadline', '')), body.get('template'), named, subtasks,
        )
        if not body.get('personal'):
            announce_task(
                cur, user['name'], str(body.get('title', '')), str(body.get('restaurant', '')),
                str(body.get('deadline', '')), named, body.get('template'), len(subtasks),
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