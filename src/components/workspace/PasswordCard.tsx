import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { changeOwnPassword } from '@/lib/api';

function strengthOf(value: string) {
  if (value.length < 6) return { label: 'Слишком короткий', tone: 'text-flag-hot', fill: 'w-1/4 bg-flag-hot' };
  const variety =
    Number(/[a-zа-я]/.test(value)) + Number(/[A-ZА-Я]/.test(value)) + Number(/\d/.test(value)) + Number(/[^\wа-яА-Я]/.test(value));
  if (value.length >= 10 && variety >= 3) {
    return { label: 'Надёжный пароль', tone: 'text-flag-done', fill: 'w-full bg-flag-done' };
  }
  if (value.length >= 8 && variety >= 2) {
    return { label: 'Нормальный пароль', tone: 'text-flag-soon', fill: 'w-2/3 bg-flag-soon' };
  }
  return { label: 'Простой пароль', tone: 'text-flag-soon', fill: 'w-1/2 bg-flag-soon' };
}

export default function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = strengthOf(next);
  const mismatch = repeat.length > 0 && next !== repeat;
  const ready = current.length > 0 && next.length >= 6 && next === repeat && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setCurrent('');
      setNext('');
      setRepeat('');
      toast({
        title: 'Пароль изменён',
        description: 'В следующий раз входите с новым паролем. Другие устройства разлогинены.',
      });
    } catch (e) {
      toast({
        title: 'Не удалось сменить пароль',
        description: e instanceof Error ? e.message : 'Попробуйте ещё раз',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bento p-5 sm:p-6 animate-fade-in [animation-delay:.16s]">
      <div className="eyebrow mb-4">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Пароль для входа
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Текущий пароль</Label>
          <Input
            id="pw-current"
            type={show ? 'text' : 'password'}
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Тот, которым вы вошли"
            className="rounded-xl bg-card border-line"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pw-next">Новый пароль</Label>
          <Input
            id="pw-next"
            type={show ? 'text' : 'password'}
            value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
            placeholder="Минимум 6 символов"
            className="rounded-xl bg-card border-line"
          />
          {next.length > 0 && (
            <div className="pt-1">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${strength.fill}`} />
              </div>
              <div className={`text-[11px] mt-1 ${strength.tone}`}>{strength.label}</div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pw-repeat">Повторите новый пароль</Label>
          <Input
            id="pw-repeat"
            type={show ? 'text' : 'password'}
            value={repeat}
            autoComplete="new-password"
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="Ещё раз, для проверки"
            className="rounded-xl bg-card border-line"
          />
          {mismatch && (
            <div className="text-[11px] text-flag-hot flex items-center gap-1.5">
              <Icon name="CircleAlert" size={12} />
              Пароли не совпадают
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Icon name={show ? 'EyeOff' : 'Eye'} size={14} />
          {show ? 'Скрыть символы' : 'Показать символы'}
        </button>

        <Button onClick={submit} disabled={!ready} className="rounded-full h-10 gap-1.5">
          <Icon name={busy ? 'Loader' : 'KeyRound'} size={15} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Сохраняю…' : 'Сменить пароль'}
        </Button>

        <p className="text-[12px] text-muted-foreground flex items-start gap-1.5">
          <Icon name="Info" size={13} className="flex-none mt-0.5" />
          После смены вход на других устройствах потребует новый пароль. Эта сессия останется активной.
        </p>
      </div>
    </section>
  );
}
