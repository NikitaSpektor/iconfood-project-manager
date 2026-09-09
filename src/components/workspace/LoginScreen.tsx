import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { login as apiLogin, type ApiUser } from '@/lib/api';

const facts = [
  { icon: 'Columns3', label: 'Доска, календарь и Гант', hint: 'Одни и те же задачи в трёх видах' },
  { icon: 'MessageSquare', label: 'Мессенджер холдинга', hint: 'Каналы по ресторанам и проектам' },
  { icon: 'Sparkles', label: 'Ассистент', hint: 'Разбирает сроки и загрузку людей' },
  { icon: 'Users', label: '29 сотрудников', hint: 'Свой логин, пароль и права у каждого' },
];

export default function LoginScreen({ onEnter }: { onEnter: (user: ApiUser) => void }) {
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim() || !pass.trim()) {
      setError('Введите логин и пароль');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const user = await apiLogin(login.trim().toLowerCase(), pass.trim());
      onEnter(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-7 flex flex-col">
      <div className="pl-1 mb-4 flex items-center">
        <img src="/logo.png" alt="ICONFOOD" className="h-[26px] w-auto dark:hidden" />
        <img src="/logo-dark.png" alt="ICONFOOD" className="h-[26px] w-auto hidden dark:block" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[46fr_54fr] flex-1 min-h-0">
        <section className="bento p-7 sm:p-10 flex flex-col justify-center animate-fade-in">
          <h1 className="font-head text-[34px] sm:text-[44px] font-bold leading-[1.08] tracking-[-0.025em]">
            Рабочее <span className="text-muted-foreground">пространство</span>{' '}
            <span>холдинга</span>.
          </h1>
          <div className="h-px bg-line my-6" />
          <p className="text-[15px] leading-relaxed text-muted-foreground max-w-md">
            Двенадцать ресторанов, весь холдинг и одна доска, на которой видно, что горит сегодня,
            а что подождёт до конца месяца.
          </p>

          <ul className="mt-8 grid sm:grid-cols-2 gap-3">
            {facts.map((f) => (
              <li key={f.label} className="bg-card border border-line rounded-tile p-3.5">
                <Icon name={f.icon} size={17} className="text-muted-foreground mb-2" />
                <div className="text-[13px] font-medium">{f.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{f.hint}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bento p-7 sm:p-10 flex flex-col justify-center animate-fade-in [animation-delay:.12s]">
          <div className="max-w-sm w-full mx-auto">
            <div className="eyebrow mb-4">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
              Вход для сотрудников
            </div>
            <h2 className="font-head text-2xl font-bold tracking-tight">Здравствуйте</h2>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              Логин выдаёт управляющий. Стартовый пароль для всех сотрудников — iconfood.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lg">Логин</Label>
                <Input
                  id="lg"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="имя.фамилия"
                  className="rounded-xl h-11 bg-card border-line"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Пароль</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={show ? 'text' : 'password'}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
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

              {error && (
                <p className="text-[13px] text-primary flex items-center gap-1.5">
                  <Icon name="TriangleAlert" size={14} />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy} className="w-full rounded-full h-11 gap-1.5">
                {busy ? 'Проверяем...' : 'Войти в систему'}
                <Icon name="ArrowRight" size={16} />
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-line text-[12px] text-muted-foreground">
              Нет доступа? Управляющий добавит вас по рабочей почте — приглашение придёт письмом.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}