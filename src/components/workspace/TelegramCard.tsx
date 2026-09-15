import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { telegramAction, telegramStatus, TELEGRAM_URL, type TelegramStatus } from '@/lib/api';

export default function TelegramCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    telegramStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const getCode = async () => {
    setBusy(true);
    try {
      const data = await telegramAction('code');
      setStatus(data);
      setCode(data.code || '');
      telegramAction('setup', { url: TELEGRAM_URL })
        .then((s) => setStatus((prev) => ({ ...(prev ?? s), bot: s.bot || prev?.bot || '' })))
        .catch(() => undefined);
    } catch {
      toast({ title: 'Не удалось получить код', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      setStatus(await telegramAction('unlink'));
      setCode('');
      toast({ title: 'Telegram отключён' });
    } catch {
      toast({ title: 'Не удалось отключить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const botLink = status?.bot ? `https://t.me/${status.bot}` : '';

  return (
    <section className="bento p-5 sm:p-6 animate-fade-in [animation-delay:.13s]">
      <div className="eyebrow mb-4">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Telegram
      </div>

      {status?.linked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-[13px]">
            <Icon name="CircleCheck" size={17} className="text-emerald-600" />
            <span>
              Подключено{status.username ? ` · @${status.username}` : ''}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Сообщения из ваших каналов приходят в Telegram. Чтобы ответить оттуда, отправьте боту
            команду <b>/channels</b>, затем <b>/use НОМЕР</b> — ответы попадут в выбранный канал.
          </p>
          <Button variant="outline" className="rounded-full h-9 gap-1.5" disabled={busy} onClick={unlink}>
            <Icon name="Unlink" size={14} />
            Отключить
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Получайте сообщения каналов в Telegram и отвечайте прямо оттуда — ответ появится в канале
            на сайте.
          </p>
          {code ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-card px-4 py-3">
                <div className="text-[11px] text-muted-foreground mb-1">Ваш код</div>
                <div className="font-head font-semibold text-2xl tracking-[0.2em]">{code}</div>
              </div>
              <ol className="text-[12px] text-muted-foreground space-y-1.5 list-decimal pl-4">
                <li>
                  Откройте бота{' '}
                  {botLink ? (
                    <a href={botLink} target="_blank" rel="noreferrer" className="text-foreground underline">
                      @{status?.bot}
                    </a>
                  ) : (
                    'холдинга в Telegram'
                  )}
                </li>
                <li>Нажмите «Старт»</li>
                <li>Отправьте код одним сообщением</li>
              </ol>
              <Button
                variant="outline"
                className="rounded-full h-9 gap-1.5"
                disabled={busy}
                onClick={() => telegramStatus().then(setStatus).catch(() => undefined)}
              >
                <Icon name="RefreshCw" size={14} />
                Проверить
              </Button>
            </div>
          ) : (
            <Button className="rounded-full h-10 gap-1.5" disabled={busy} onClick={getCode}>
              <Icon name="Send" size={15} />
              Подключить Telegram
            </Button>
          )}
        </div>
      )}
    </section>
  );
}