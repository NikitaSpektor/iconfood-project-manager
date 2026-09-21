import base64
import json
import os
import struct
import time
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils as asym_utils
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

VAPID_PUBLIC_KEY = 'BMjyeTytSakSpQqT4Uk1k2LrLXPZMV7QgcjJT_oeN0N1Dn0M_iZz6jM31Wzf2U2yA9WeIH6CNqAEM8uQioHd-dY'
VAPID_SUBJECT = 'mailto:noreply@iconfood.ru'


def b64d(value: str) -> bytes:
    pad = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')


def private_key():
    raw = os.environ.get('VAPID_PRIVATE_KEY', '').strip()
    if not raw:
        return None
    return ec.derive_private_key(int.from_bytes(b64d(raw), 'big'), ec.SECP256R1())


def vapid_header(endpoint: str) -> str:
    key = private_key()
    if key is None:
        return ''
    parts = urllib.parse.urlparse(endpoint)
    claims = {
        'aud': parts.scheme + '://' + parts.netloc,
        'exp': int(time.time()) + 12 * 3600,
        'sub': VAPID_SUBJECT,
    }
    header = b64e(json.dumps({'typ': 'JWT', 'alg': 'ES256'}, separators=(',', ':')).encode())
    payload = b64e(json.dumps(claims, separators=(',', ':')).encode())
    signing_input = (header + '.' + payload).encode()
    der = key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
    r, s = asym_utils.decode_dss_signature(der)
    signature = b64e(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))
    return 'vapid t=' + header + '.' + payload + '.' + signature + ', k=' + VAPID_PUBLIC_KEY


def encrypt(payload: bytes, p256dh: str, auth: str) -> bytes:
    client_public = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b64d(p256dh))
    server_key = ec.generate_private_key(ec.SECP256R1())
    server_public = server_key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    shared = server_key.exchange(ec.ECDH(), client_public)
    auth_secret = b64d(auth)
    client_public_raw = b64d(p256dh)

    info = b'WebPush: info\x00' + client_public_raw + server_public
    prk = HKDF(algorithm=hashes.SHA256(), length=32, salt=auth_secret, info=info).derive(shared)

    salt = os.urandom(16)
    cek = HKDF(
        algorithm=hashes.SHA256(), length=16, salt=salt, info=b'Content-Encoding: aes128gcm\x00'
    ).derive(prk)
    nonce = HKDF(
        algorithm=hashes.SHA256(), length=12, salt=salt, info=b'Content-Encoding: nonce\x00'
    ).derive(prk)

    ciphertext = AESGCM(cek).encrypt(nonce, payload + b'\x02', None)
    header = salt + struct.pack('!I', 4096) + bytes([len(server_public)]) + server_public
    return header + ciphertext


def send_push(endpoint: str, p256dh: str, auth: str, data: dict, ttl: int = 86400) -> int:
    """Отправляет одно push-уведомление в браузер сотрудника. Возвращает HTTP-код."""
    if not os.environ.get('VAPID_PRIVATE_KEY'):
        return 0
    try:
        body = encrypt(json.dumps(data, ensure_ascii=False).encode(), p256dh, auth)
        header = vapid_header(endpoint)
    except Exception:
        return 400
    request = urllib.request.Request(endpoint, data=body, method='POST')
    request.add_header('Content-Encoding', 'aes128gcm')
    request.add_header('Content-Type', 'application/octet-stream')
    request.add_header('TTL', str(ttl))
    request.add_header('Urgency', 'normal')
    request.add_header('Authorization', header)
    try:
        with urllib.request.urlopen(request, timeout=3) as res:
            return res.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except Exception:
        return 0


TOPIC_COLUMN = {
    'task': 'on_task',
    'deadline': 'on_deadline',
    'comment': 'on_comment',
    'chat': 'on_chat',
}


def push_to_login(cur, login: str, topic: str, title: str, body: str, url: str = '/') -> None:
    """Шлёт push всем устройствам сотрудника, если он подписан на эту тему."""
    column = TOPIC_COLUMN.get(topic)
    if not column or not login or not os.environ.get('VAPID_PRIVATE_KEY'):
        return
    cur.execute(
        'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE active = TRUE AND '
        + column + " = TRUE AND user_login = '" + str(login).replace("'", "''") + "'"
    )
    rows = cur.fetchall()
    payload = {'title': title, 'body': body[:300], 'url': url, 'topic': topic}
    dead = []
    for sub_id, endpoint, p256dh, auth in rows:
        code = send_push(endpoint, p256dh, auth, payload)
        if code in (400, 404, 410):
            dead.append(sub_id)
    if dead:
        cur.execute(
            'UPDATE push_subscriptions SET active = FALSE WHERE id IN ('
            + ','.join(str(int(i)) for i in dead) + ')'
        )
    if rows:
        cur.execute(
            'UPDATE push_subscriptions SET last_sent_at = NOW() WHERE user_login = '
            "'" + str(login).replace("'", "''") + "'"
        )
