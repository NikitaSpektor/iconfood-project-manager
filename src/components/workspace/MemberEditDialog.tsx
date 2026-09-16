import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { RESTAURANTS, roleLabels, type Member, type Role } from '@/data/workspace';
import { dismissMember, resetMemberPassword, updateMember } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function MemberEditDialog({
  member,
  onOpenChange,
  onSaved,
  canDismiss,
}: {
  member: Member | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  canDismiss: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [restaurant, setRestaurant] = useState(RESTAURANTS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [freshPassword, setFreshPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!member) return;
    setFreshPassword('');
    setCopied(false);
    setName(member.name);
    setEmail(member.email ?? '');
    setPosition(member.position ?? '');
    setRole(member.role);
    setRestaurant(member.restaurant || RESTAURANTS[0]);
    setError('');
    setConfirmOff(false);
  }, [member]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (name.trim().length < 3) {
      setError('Имя — минимум 3 символа');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i.test(email.trim())) {
      setError('Введите корректный адрес почты');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateMember({
        login: member.login,
        name: name.trim(),
        email: email.trim(),
        position: position.trim(),
        role,
        restaurant,
      });
      toast({ title: 'Карточка сохранена', description: name.trim() });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!member) return;
    setBusy(true);
    setError('');
    try {
      const res = await resetMemberPassword(member.login);
      setFreshPassword(res.password);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сбросить пароль');
    } finally {
      setBusy(false);
    }
  }

  function copyAccess() {
    if (!member) return;
    navigator.clipboard
      .writeText(`Логин: ${member.login}\nПароль: ${freshPassword}`)
      .then(() => {
        setCopied(true);
        toast({ title: 'Скопировано', description: 'Отправьте сотруднику любым способом' });
      })
      .catch(() => toast({ title: 'Не удалось скопировать', variant: 'destructive' }));
  }

  async function dismiss() {
    if (!member) return;
    setBusy(true);
    try {
      await dismissMember(member.login);
      toast({
        title: 'Сотрудник отключён',
        description: `${member.name} больше не получает задачи и письма`,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отключить');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-head">Карточка сотрудника</DialogTitle>
          <DialogDescription>
            Имя изменится во всех задачах и комментариях, где он упомянут.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Имя и фамилия</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              placeholder="Иван Петров"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Рабочая почта</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
              placeholder="petrov@iconfood.ru"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Должность</Label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="rounded-xl"
              placeholder="Управляющий"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Подразделение</Label>
              <Select value={restaurant} onValueChange={setRestaurant}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {RESTAURANTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {(Object.keys(roleLabels) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {member && (
            <div className="rounded-tile border border-line bg-surface p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground mr-auto">
                  Логин для входа: <b className="text-foreground">{member.login}</b> — не меняется.
                </p>
                {canDismiss && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={resetPassword}
                    className="rounded-full h-8 px-3 text-[12px] gap-1.5 border-line flex-none"
                  >
                    <Icon name="KeyRound" size={13} />
                    {freshPassword ? 'Сбросить ещё раз' : 'Сбросить пароль'}
                  </Button>
                )}
              </div>

              {freshPassword && (
                <div className="rounded-xl bg-card border border-line p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Новый пароль — передайте сотруднику. Старый больше не работает, показать его
                    второй раз не получится.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-[15px] font-semibold tracking-wider text-foreground">
                      {freshPassword}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyAccess}
                      className="rounded-full h-8 px-3 text-[12px] gap-1.5 border-line"
                    >
                      <Icon name={copied ? 'Check' : 'Copy'} size={13} />
                      {copied ? 'Скопировано' : 'Копировать'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12px] text-primary flex items-center gap-1.5">
              <Icon name="TriangleAlert" size={13} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={busy} className="flex-1 rounded-full h-10 gap-1.5">
              <Icon name="Check" size={15} />
              Сохранить
            </Button>
            {canDismiss && !confirmOff && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmOff(true)}
                className="rounded-full h-10 gap-1.5 border-line text-muted-foreground"
              >
                <Icon name="UserMinus" size={15} />
                Уволен
              </Button>
            )}
          </div>

          {confirmOff && (
            <div className="rounded-tile border border-line bg-surface p-3 space-y-2.5">
              <p className="text-[12px] text-muted-foreground">
                Сотрудник потеряет доступ, исчезнет из списка ответственных и рассылок. Его задачи
                и переписка сохранятся.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={dismiss}
                  className="flex-1 rounded-full h-9 text-[13px]"
                >
                  Отключить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmOff(false)}
                  className="flex-1 rounded-full h-9 text-[13px] border-line"
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}