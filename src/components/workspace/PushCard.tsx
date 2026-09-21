import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from '@/lib/api';
import {
  DEFAULT_PREFS,
  disablePush,
  enablePush,
  pushPermission,
  pushSupported,
  savePushPrefs,
  sendTestPush,
  type PushPrefs,
  type PushTopic,
} from '@/lib/push';

const TOPICS: { id: PushTopic; label: string; hint: string; icon: string }[] = [
  {
    id: 'task',
    label: 'Новые задачи на мне',
    hint: 'Когда вас назначили ответственным',
    icon: 'ClipboardCheck',
  },
  {
    id: 'deadline',
    label: 'Приближение дедлайна',
    hint: 'Утром в день срока, накануне и при просрочке',
    icon: 'CalendarClock',
  },
  {
    id: 'comment',
    label: 'Комментарии и правки',
    hint: 'Обсуждение и файлы в ваших задачах',
    icon: 'MessageCircle',
  },
  {
    id: 'chat',
    label: 'Сообщения в чатах',
    hint: 'Новые сообщения в каналах и личных диалогах',
    icon: 'MessagesSquare',
  },
];

export default function PushCard() {
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const blocked = pushPermission() === 'denied';

  useEffect(() => {
    fetchTasks()
      .then((data) => {
        const push = (data as { push?: PushPrefs }).push;
        if (push) setPrefs({ ...DEFAULT_PREFS, ...push });
      })
      .catch(() => undefined);
  }, []);

  const toggleMaster = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        await enablePush({
          task: prefs.task,
          deadline: prefs.deadline,
          comment: prefs.comment,
          chat: prefs.chat,
        });
        setPrefs((p) => ({ ...p, enabled: true }));
        toast({
          title: 'Push включены',
          description: 'Уведомления будут приходить на это устройство.',
        });
      } else {
        await disablePush();
        setPrefs((p) => ({ ...p, enabled: false }));
        toast({ title: 'Push выключены', description: 'Это устройство больше не получает уведомления.' });
      }
    } catch (e) {
      toast({
        title: 'Не получилось',
        description: e instanceof Error ? e.message : 'Попробуйте ещё раз',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleTopic = async (id: PushTopic, on: boolean) => {
    const next = { ...prefs, [id]: on };
    setPrefs(next);
    try {
      await savePushPrefs({ [id]: on });
    } catch {
      setPrefs(prefs);
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  const test = async () => {
    try {
      await sendTestPush();
      toast({ title: 'Тест отправлен', description: 'Уведомление придёт в течение пары секунд.' });
    } catch {
      toast({ title: 'Не удалось отправить тест', variant: 'destructive' });
    }
  };

  return (
    <section className="bento p-5 sm:p-6 animate-fade-in [animation-delay:.2s]">
      <div className="eyebrow mb-4">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Push-уведомления на устройство
      </div>

      {!supported ? (
        <div className="rounded-tile border border-line bg-muted/40 p-4 text-[13px] text-muted-foreground flex items-start gap-2.5">
          <Icon name="CircleAlert" size={16} className="flex-none mt-0.5" />
          Этот браузер не поддерживает push. На iPhone сначала добавьте приложение на экран «Домой».
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 pb-4 mb-1 border-b border-line">
            <div className="mr-auto">
              <div className="text-[13px] font-medium">Присылать уведомления</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {blocked
                  ? 'Уведомления запрещены — разрешите их в настройках браузера'
                  : 'Приходят, даже когда приложение закрыто'}
              </div>
            </div>
            <Switch
              checked={prefs.enabled}
              disabled={busy || blocked}
              onCheckedChange={toggleMaster}
            />
          </div>

          <ul className={prefs.enabled ? 'space-y-4 pt-3' : 'space-y-4 pt-3 opacity-50 pointer-events-none'}>
            {TOPICS.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <Icon name={t.icon} size={16} className="text-muted-foreground flex-none mt-0.5" fallback="Bell" />
                <div className="mr-auto min-w-0">
                  <div className="text-[13px] font-medium">{t.label}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{t.hint}</div>
                </div>
                <Switch
                  checked={prefs[t.id]}
                  onCheckedChange={(v) => toggleTopic(t.id, v)}
                />
              </li>
            ))}
          </ul>

          {prefs.enabled && (
            <Button
              variant="outline"
              onClick={test}
              className="rounded-full h-9 gap-1.5 mt-5 border-line"
            >
              <Icon name="BellRing" size={14} />
              Отправить тестовое
            </Button>
          )}
        </>
      )}
    </section>
  );
}
