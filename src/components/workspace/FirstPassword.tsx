import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { setFirstPassword, type ApiUser, type FirstLogin } from '@/lib/api';

export default function FirstPassword({
  pending,
  onBack,
  onEnter,
}: {
  pending: FirstLogin;
  onBack: () => void;
  onEnter: (user: ApiUser) => void;
}) {
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 6) {
      setError('Минимум 6 символов');
      return;
    }
    if (pass.trim().toLowerCase() === 'iconfood') {
      setError('Стартовый пароль не подойдёт — придумайте свой');
      return;
    }
    if (pass !== again) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setBusy(true);
    try {
      onEnter(await setFirstPassword(pending.login, pending.ticket, pass));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить пароль');
    } finally {
      setBusy(false);
    }
  }

  const first = pending.name.split(' ')[0] || pending.name;

  return (
    <div>
      <div className="eyebrow mb-4">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Первый вход
      </div>
      <h2 className="font-head text-2xl font-bold tracking-tight">
        {first}, придумайте свой пароль
      </h2>
      <p className="text-[13px] text-muted-foreground mt-1.5">
        Стартовый пароль одинаковый у всех, поэтому дальше пускаем только со своим. Это один раз.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="np1">Новый пароль</Label>
          <div className="relative">
            <Input
              id="np1"
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="минимум 6 символов"
              autoComplete="new-password"
              autoFocus
              className="rounded-xl h-11 bg-card border-line pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Показать пароль"
            >
              <Icon name={show ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np2">Повторите пароль</Label>
          <Input
            id="np2"
            type={show ? 'text' : 'password'}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
            className="rounded-xl h-11 bg-card border-line"
          />
        </div>

        {error && (
          <p className="text-[13px] text-primary flex items-center gap-1.5">
            <Icon name="TriangleAlert" size={14} />
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full rounded-full h-11 gap-1.5">
          {busy ? 'Сохраняем...' : 'Сохранить и войти'}
          <Icon name="ArrowRight" size={16} />
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Это не я — вернуться ко входу
        </button>
      </form>
    </div>
  );
}
