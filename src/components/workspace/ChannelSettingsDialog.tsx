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
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchMembers } from '@/lib/api';
import type { Channel } from '@/data/workspace';
import { cn } from '@/lib/utils';

interface Person {
  id: string;
  name: string;
  login: string;
  restaurant: string;
}

export default function ChannelSettingsDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateChannelMembers, renameChannel } = useWorkspace();
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState(channel.name);
  const [hint, setHint] = useState(channel.hint);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(channel.name);
    setHint(channel.hint);
    fetchMembers()
      .then((data) => setPeople(data as Person[]))
      .catch(() => undefined);
  }, [open, channel.name, channel.hint]);

  const current = channel.members ?? [];
  const currentLogins = current.map((m) => m.login);
  const candidates = people.filter(
    (p) =>
      !currentLogins.includes(p.login) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function add(login: string) {
    setBusy(true);
    await updateChannelMembers(channel.id, [login], []);
    setBusy(false);
  }

  async function remove(login: string) {
    setBusy(true);
    await updateChannelMembers(channel.id, [], [login]);
    setBusy(false);
  }

  async function saveInfo() {
    if (name.trim().length < 3) return;
    setBusy(true);
    await renameChannel(channel.id, name.trim(), hint.trim());
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-bento border-line max-h-[88vh] overflow-y-auto no-scrollbar">
        <DialogHeader className="text-left">
          <DialogTitle className="tracking-tight">Настройки канала</DialogTitle>
          <DialogDescription>
            {channel.open
              ? 'Сейчас канал открыт для всего холдинга. Добавьте участников, чтобы сделать его закрытым.'
              : 'Канал закрытый — переписку видят только участники.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cs-name">Название</Label>
            <Input
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-hint">Описание</Label>
            <Input
              id="cs-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || name.trim().length < 3}
            onClick={saveInfo}
            className="rounded-full w-full h-9 text-xs border-line"
          >
            Сохранить название и описание
          </Button>

          {current.length > 0 && (
            <div className="space-y-2">
              <Label>В канале · {current.length}</Label>
              <div className="space-y-1 rounded-tile border border-line p-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {current.map((m) => (
                  <div
                    key={m.login}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-surface transition-colors"
                  >
                    <span className="h-7 w-7 rounded-full bg-avatar font-head text-[10px] font-semibold flex items-center justify-center flex-none">
                      {m.name.split(' ').map((w) => w[0]).join('')}
                    </span>
                    <span className="text-[13px] truncate mr-auto">{m.name}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(m.login)}
                      className="h-7 w-7 rounded-full border border-line flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors flex-none"
                      aria-label="Убрать из канала"
                    >
                      <Icon name="UserMinus" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="mr-auto">Добавить сотрудника</Label>
              <div className="relative">
                <Icon
                  name="Search"
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск"
                  className="rounded-full h-8 pl-7 w-36 text-[12px] border-line"
                />
              </div>
            </div>

            <div className="space-y-1 rounded-tile border border-line p-1.5 max-h-44 overflow-y-auto no-scrollbar">
              {candidates.map((p) => (
                <div
                  key={p.login}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-surface transition-colors',
                  )}
                >
                  <span className="h-7 w-7 rounded-full bg-avatar font-head text-[10px] font-semibold flex items-center justify-center flex-none">
                    {p.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span className="min-w-0 mr-auto">
                    <span className="block text-[13px] truncate">{p.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {p.restaurant}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => add(p.login)}
                    className="h-7 w-7 rounded-full border border-line flex items-center justify-center hover:bg-card transition-colors flex-none"
                    aria-label="Добавить в канал"
                  >
                    <Icon name="UserPlus" size={13} />
                  </button>
                </div>
              ))}
              {candidates.length === 0 && (
                <div className="py-6 text-center text-[12px] text-muted-foreground">
                  Все сотрудники уже в канале
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
