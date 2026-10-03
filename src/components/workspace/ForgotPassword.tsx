import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { confirmPasswordReset, requestPasswordReset, type ApiUser } from '@/lib/api';

export default function ForgotPassword({
  initialLogin,
  onBack,
  onEnter,
}: {
  initialLogin: string;
  onBack: () => void;
  onEnter: (user: ApiUser) => void;
}) {
  const [step, setStep] = useState<'ask' | 'code'>('ask');
  const [login, setLogin] = useState(initialLogin);
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!login.trim()) {
      setError('Введите логин');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await requestPasswordReset(login.trim().toLowerCase());
      setInfo(res.message || 'Код отправлен на рабочую почту');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Код — 6 цифр из письма');
      return;
    }
    if (pass.length < 6) {
      setError('Новый пароль — минимум 6 символов');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const user = await confirmPasswordReset(login.trim().toLowerCase(), code.trim(), pass);
      onEnter(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сменить пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4 transition-colors"
      >
        <Icon name="ArrowLeft" size={13} />
        Ко входу
      </button>
      <h2 className="font-head text-2xl font-bold tracking-tight">Восстановление пароля</h2>
      <p className="text-[13px] text-muted-foreground mt-1.5">
        {step === 'ask'
          ? 'Введите логин — пришлём код на вашу рабочую почту.'
          : info}
      </p>

      {step === 'ask' ? (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-login">Логин или рабочая почта</Label>
            <Input
              id="fp-login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="имя.фамилия"
              autoFocus
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
            {busy ? 'Отправляем...' : 'Получить код'}
            <Icon name="Mail" size={16} />
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-code">Код из письма</Label>
            <Input
              id="fp-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              className="rounded-xl h-11 bg-card border-line font-mono tracking-[0.3em] text-[16px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fp-pass">Новый пароль</Label>
            <div className="relative">
              <Input
                id="fp-pass"
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="минимум 6 символов"
                autoComplete="new-password"
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
            {busy ? 'Сохраняем...' : 'Сменить пароль и войти'}
            <Icon name="ArrowRight" size={16} />
          </Button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={busy}
            className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Письмо не пришло? Отправить код ещё раз
          </button>
        </form>
      )}
    </div>
  );
}
