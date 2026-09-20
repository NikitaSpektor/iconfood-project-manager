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
    'ответственные, наблюдатели, сроки, ВСЕ подзадачи со статусами, комментарии к задачам '
    'и комментарии к отдельным шагам, вложения. Архивные и удалённые задачи в срез не '
    'попадают — их не существует, не упоминай их. '
    'Отвечай ТОЛЬКО по этим данным. Никогда не выдумывай задачи, имена, рестораны и цифры: '
    'если чего-то нет в срезе — так и скажи. '
    'Комментарии — главный источник причин: именно там люди пишут, что мешает, чего ждут '
    'и что уже сделано. Обязательно опирайся на них, цитируй автора и суть: '
    'Иванов пишет, что поставщик сорвал сроки. '
    'Ответ должен быть точным и развёрнутым: сначала прямой вывод одной фразой, '
    'затем разбор с конкретикой — названия задач, фамилии, даты, числа, названия шагов. '
    'Заверши коротким блоком «Что сделать» из 2-4 конкретных действий. '
    'Пиши по-русски, деловым языком, без воды и без markdown-разметки. '
    'Объём — 8-14 строк. Обычный текст, списки оформляй тире с новой строки.'
)

REPORT_PROMPT = (
    'Ты — операционный аналитик сети ресторанов ICONFOOD. '
    'Тебе дают ПОЛНУЮ КАРТОЧКУ ОДНОЙ ЗАДАЧИ: описание, статус, сроки, ответственных, '
    'наблюдателей, все подзадачи со статусами, все комментарии к задаче и к каждому шагу, '
    'вложения. Нужен детальный отчёт по этой задаче. '
    'Пиши ТОЛЬКО по этим данным, ничего не выдумывай. '
    'Структура отчёта, каждый блок с новой строки, заголовок блока заглавными: '
    'ИТОГ — одна фраза: где задача сейчас и успевает ли к сроку. '
    'ПРОГРЕСС — сколько шагов закрыто из скольких, какие именно закрыты, какие остались. '
    'ХОД РАБОТЫ — что происходило по шагам по комментариям: кто что написал, '
    'что сделано, какие файлы приложены. Разбирай шаги по порядку, с названиями. '
    'РИСКИ — что мешает, где задержки, чего ждут, что не двигается. Если рисков нет — так и напиши. '
    'ЧТО СДЕЛАТЬ — 2-4 конкретных действия с ответственными. '
    'Пиши по-русски, деловым языком, без markdown-разметки. Списки — тире с новой строки. '
    'Объём — 12-20 строк.'
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


def load_details(cur, ids):
    """Подзадачи, комментарии и вложения по списку задач."""
    subs, sub_names, task_comments, step_comments, files = {}, {}, {}, {}, {}
    if not ids:
        return subs, sub_names, task_comments, step_comments, files
    id_list = ','.join(str(i) for i in ids)

    cur.execute(
        'SELECT task_id, id, title, done FROM subtasks WHERE archived = FALSE '
        'AND task_id IN (' + id_list + ') ORDER BY position, id'
    )
    for task_id, sub_id, title, done in cur.fetchall():
        subs.setdefault(task_id, []).append((sub_id, title, done))
        sub_names[sub_id] = title

    cur.execute(
        'SELECT task_id, subtask_id, author, text, created_at FROM comments '
        'WHERE task_id IN (' + id_list + ') ORDER BY id'
    )
    for task_id, sub_id, author, text, created in cur.fetchall():
        stamp = created.strftime('%d.%m') if created else ''
        entry = (author, str(text)[:400], stamp)
        if sub_id:
            step_comments.setdefault(task_id, {}).setdefault(sub_id, []).append(entry)
        else:
            task_comments.setdefault(task_id, []).append(entry)

    cur.execute(
        'SELECT task_id, subtask_id, name, author FROM attachments '
        'WHERE archived = FALSE AND task_id IN (' + id_list + ') ORDER BY id'
    )
    for task_id, sub_id, name, author in cur.fetchall():
        files.setdefault(task_id, []).append((sub_id, name, author))

    return subs, sub_names, task_comments, step_comments, files


def board_snapshot(cur):
    today = date.today()
    cur.execute(
        'SELECT id, title, restaurant, column_id, priority, deadline, assignee, note '
        'FROM tasks WHERE archived = FALSE ORDER BY id DESC'
    )
    rows = cur.fetchall()
    ids = [r[0] for r in rows]
    subs, sub_names, task_comments, step_comments, files = load_details(cur, ids)

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
        done_steps = sum(1 for _, _, d in steps if d)
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
            open_steps = [t for _, t, d in steps if not d][:4]
            if open_steps:
                chunk += ' (не сделано: ' + '; '.join(open_steps) + ')'
        if note:
            chunk += ' | описание: ' + str(note)[:160]
        lines.append(chunk)

        for author, text, stamp in task_comments.get(task_id, [])[-4:]:
            lines.append('    комментарий ' + stamp + ' ' + author + ': ' + text[:200])
        by_step = step_comments.get(task_id, {})
        for sub_id, step_title, _done in steps:
            for author, text, stamp in by_step.get(sub_id, [])[-3:]:
                lines.append(
                    '    по шагу «' + step_title + '» ' + stamp + ' ' + author + ': ' + text[:200]
                )
        step_files = files.get(task_id, [])
        if step_files:
            named = []
            for sub_id, name, _author in step_files[-4:]:
                where = sub_names.get(sub_id, '')
                named.append(name + (' (к шагу «' + where + '»)' if where else ''))
            lines.append('    вложения: ' + '; '.join(named))

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
    return header + '\nСписок активных задач:\n' + '\n'.join(lines[:320]), total


def task_card(cur, task_id: int):
    """Полная карточка одной задачи со всеми шагами и комментариями."""
    today = date.today()
    cur.execute(
        'SELECT id, title, restaurant, column_id, priority, deadline, assignee, watchers, note '
        'FROM tasks WHERE id = ' + str(task_id) + ' AND archived = FALSE'
    )
    row = cur.fetchone()
    if not row:
        return None, ''
    tid, title, place, column, priority, deadline, assignee, watchers, note = row
    subs, sub_names, task_comments, step_comments, files = load_details(cur, [tid])
    steps = subs.get(tid, [])
    done_steps = sum(1 for _, _, d in steps if d)
    left = days_left(deadline, today)

    out = ['Сегодня: ' + today.strftime('%d.%m.%Y')]
    out.append('Задача: «' + title + '»')
    out.append('Подразделения: ' + (str(place or '').replace('|', ', ') or 'не указано'))
    out.append('Статус: ' + COLUMN_LABELS.get(column, column)
               + ' | приоритет: ' + PRIORITY_LABELS.get(priority, priority)
               + ' | срок: ' + (deadline or 'не задан'))
    if left is not None and column != 'done':
        out.append('До срока: ' + ('просрочено на ' + str(-left) + ' дн.' if left < 0
                                   else 'осталось ' + str(left) + ' дн.'))
    out.append('Ответственные: ' + (str(assignee or '').replace('|', ', ') or 'не назначены'))
    out.append('Наблюдатели: ' + (str(watchers or '').replace('|', ', ') or 'нет'))
    if note:
        out.append('Описание: ' + str(note)[:600])

    out.append('')
    out.append('Шаги (' + str(done_steps) + ' из ' + str(len(steps)) + ' закрыто):')
    if not steps:
        out.append('- шагов нет')
    by_step = step_comments.get(tid, {})
    by_step_files = {}
    for sub_id, name, author in files.get(tid, []):
        by_step_files.setdefault(sub_id, []).append((name, author))
    for sub_id, step_title, done in steps:
        out.append('- «' + step_title + '» — ' + ('сделан' if done else 'не сделан'))
        for author, text, stamp in by_step.get(sub_id, []):
            out.append('    комментарий ' + stamp + ' ' + author + ': ' + text[:400])
        for name, author in by_step_files.get(sub_id, []):
            out.append('    файл: ' + name + ' (загрузил ' + author + ')')

    general = task_comments.get(tid, [])
    out.append('')
    out.append('Комментарии к задаче целиком:')
    if general:
        for author, text, stamp in general:
            out.append('- ' + stamp + ' ' + author + ': ' + text[:400])
    else:
        out.append('- нет')

    root_files = [(n, a) for sid, n, a in files.get(tid, []) if not sid]
    if root_files:
        out.append('')
        out.append('Вложения к задаче: '
                   + '; '.join(n + ' (' + a + ')' for n, a in root_files))
    return '\n'.join(out), title


def ask_gpt(question: str, snapshot: str, user: dict, report: bool = False):
    api_key = os.environ.get('YANDEX_GPT_API_KEY')
    folder_id = os.environ.get('YANDEX_GPT_FOLDER_ID')
    if not api_key or not folder_id:
        return None, 'ИИ-помощник не подключён'

    if report:
        user_text = (
            'Карточка задачи со всеми шагами и комментариями:\n'
            + snapshot
            + '\n\nОтчёт запросил: ' + user['name'] + ' (' + user['restaurant'] + ')'
            + '\nЗадание: ' + question
            + '\n\nСоставь детальный отчёт по структуре из инструкции, '
              'обязательно разбери каждый шаг и используй комментарии как источник причин.'
        )
    else:
        user_text = (
            'Данные досок (только активные задачи, архив исключён):\n'
            + snapshot
            + '\n\nСпрашивает: ' + user['name'] + ' (' + user['restaurant'] + ')'
            + '\nВопрос: ' + question
            + '\n\nОтветь точно по данным выше, с конкретными названиями, фамилиями и датами. '
              'Если в комментариях есть причины задержек — назови их.'
        )

    payload = {
        'modelUri': 'gpt://' + folder_id + '/yandexgpt/latest',
        'completionOptions': {
            'stream': False,
            'temperature': 0.3,
            'maxTokens': 2000 if report else 1400,
        },
        'messages': [
            {'role': 'system', 'text': REPORT_PROMPT if report else SYSTEM_PROMPT},
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
    raw_task = str(body.get('taskId') or '').strip()
    report_mode = raw_task.isdigit()
    if report_mode and len(question) < 3:
        question = 'Составь детальный отчёт по этой задаче'
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
            if report_mode:
                snapshot, found = task_card(cur, int(raw_task))
                if not snapshot:
                    return {
                        'statusCode': 404,
                        'headers': CORS,
                        'body': json.dumps({'error': 'Задача не найдена'}, ensure_ascii=False),
                    }
                total = 1
            else:
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

    answer, error = ask_gpt(question, snapshot, user, report_mode)
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