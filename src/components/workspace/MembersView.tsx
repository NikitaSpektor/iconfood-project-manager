import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MEMBERS, roleLabels, roleRights, type Member, type Role } from '@/data/workspace';
import { toast } from '@/hooks/use-toast';

export default function MembersView() {
  const [people, setPeople] = useState<Member[]>(MEMBERS);
  const [query, setQuery] = useState('');
  const [invite, setInvite] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('staff');
  const [error, setError] = useState('');

  const list = useMemo(
    () =>
      people.filter(
        (m) =>
          m.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          m.login.includes(query.trim().toLowerCase()),
      ),
    [people, query],
  );

  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i.test(invite.trim())) {
      setError('Введите корректный адрес почты');
      return;
    }
    setError('');
    toast({
      title: 'Приглашение отправлено',
      description: `${invite.trim()} получит логин и пароль. Роль: ${roleLabels[inviteRole]}.`,
    });
    setInvite('');
  }

  function changeRole(id: string, role: Role) {
    setPeople((p) => p.map((m) => (m.id === id ? { ...m, role } : m)));
    toast({ title: 'Права обновлены', description: `Новая роль: ${roleLabels[role]}` });
  }

  return (
    <div className="grid gap-3.5 lg:grid-cols-[1fr_320px] flex-1 min-h-0">
      <section className="bento p-5 sm:p-6 flex flex-col min-h-0 animate-fade-in">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="mr-auto">
            <div className="font-head font-semibold text-[14px]">
              Участники холдинга · {people.length}
            </div>
            <div className="text-[12px] text-muted-foreground">
              У каждого свой логин и пароль, роль задаёт права
            </div>
          </div>
          <div className="relative">
            <Icon
              name="Search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени или логину"
              className="rounded-full h-9 pl-8 w-56 bg-card border-line text-[13px]"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
          {list.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-card border border-line rounded-tile px-3.5 py-2.5"
            >
              <span className="relative h-9 w-9 rounded-full bg-avatar font-head text-[12px] font-semibold flex items-center justify-center flex-none">
                {m.name.split(' ').map((w) => w[0]).join('')}
                <i
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                    m.online ? 'bg-flag-done' : 'bg-bar',
                  )}
                />
              </span>
              <div className="min-w-0 mr-auto">
                <div className="text-[13px] font-medium truncate">{m.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {m.login} · {m.restaurant}
                </div>
              </div>
              <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                <SelectTrigger className="w-[150px] h-8 rounded-full text-[12px] border-line">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {(Object.keys(roleLabels) as Role[]).map((r) => (
                    <SelectItem key={r} value={r} className="text-[13px]">
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {list.length === 0 && (
            <div className="rounded-tile border border-dashed border-line py-10 text-center text-[13px] text-muted-foreground">
              Никого не нашли
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3.5 min-h-0">
        <section className="bento p-5 animate-fade-in [animation-delay:.1s]">
          <div className="eyebrow mb-3.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
            Добавить по почте
          </div>
          <form onSubmit={sendInvite} className="space-y-3">
            <Input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="имя@iconfood.ru"
              className="rounded-xl bg-card border-line"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="rounded-xl border-line">
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
            {error && (
              <p className="text-[12px] text-primary flex items-center gap-1.5">
                <Icon name="TriangleAlert" size={13} />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full rounded-full h-10 gap-1.5">
              <Icon name="Mail" size={15} />
              Отправить приглашение
            </Button>
          </form>
        </section>

        <section className="bento p-5 flex-1 min-h-0 overflow-y-auto no-scrollbar animate-fade-in [animation-delay:.16s]">
          <div className="eyebrow mb-3.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
            Что может каждая роль
          </div>
          <ul className="space-y-3">
            {(Object.keys(roleLabels) as Role[]).map((r) => (
              <li key={r}>
                <div className="text-[13px] font-medium">{roleLabels[r]}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{roleRights[r]}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
