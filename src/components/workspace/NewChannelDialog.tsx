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
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchMembers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Person {
  id: string;
  name: string;
  login: string;
  restaurant: string;
}

export default function NewChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { createChannel, user } = useWorkspace();
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchMembers()
      .then((data) => setPeople(data as Person[]))
      .catch(() => undefined);
  }, [open]);

  const list = people.filter(
    (p) => p.login !== user.login && p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(login: string) {
    setPicked((prev) =>
      prev.includes(login) ? prev.filter((l) => l !== login) : [...prev, login],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Название канала — минимум 3 символа');
      return;
    }
    setError('');
    setBusy(true);
    await createChannel(name.trim(), hint.trim(), picked);
    setBusy(false);
    setName('');
    setHint('');
    setPicked([]);
    setQuery('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-bento border-line">
        <DialogHeader className="text-left">
          <DialogTitle className="tracking-tight">Новый канал</DialogTitle>
          <DialogDescription>
            Если никого не выбрать, канал увидят все сотрудники холдинга.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ch-name">Название</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Открытие Хлебного"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-hint">Описание</Label>
            <Input
              id="ch-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="О чём канал"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="mr-auto">Участники · {picked.length}</Label>
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

            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1 rounded-tile border border-line p-1.5">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.login)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                    picked.includes(p.login) ? 'bg-flag-select/10' : 'hover:bg-surface',
                  )}
                >
                  <Checkbox checked={picked.includes(p.login)} className="pointer-events-none" />
                  <span className="h-7 w-7 rounded-full bg-avatar font-head text-[10px] font-semibold flex items-center justify-center flex-none">
                    {p.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] truncate">{p.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {p.restaurant}
                    </span>
                  </span>
                </button>
              ))}
              {list.length === 0 && (
                <div className="py-6 text-center text-[12px] text-muted-foreground">
                  Никого не нашли
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-primary flex items-center gap-1.5">
              <Icon name="TriangleAlert" size={14} />
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full rounded-full h-11 gap-1.5">
            {busy ? 'Создаём...' : 'Создать канал'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
