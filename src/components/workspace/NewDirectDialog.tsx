import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchMembers } from '@/lib/api';

interface Person {
  id: string;
  name: string;
  login: string;
  restaurant: string;
  position?: string;
}

export default function NewDirectDialog({
  open,
  onOpenChange,
  onPicked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPicked: (channelId: string) => void;
}) {
  const { openDirect, user } = useWorkspace();
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    fetchMembers()
      .then((data) => setPeople(data as Person[]))
      .catch(() => undefined);
  }, [open]);

  const list = people.filter(
    (p) =>
      p.login !== user.login &&
      (p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        (p.position ?? '').toLowerCase().includes(query.trim().toLowerCase())),
  );

  async function pick(login: string) {
    setBusy(login);
    const id = await openDirect(login);
    setBusy('');
    if (id) {
      onPicked(id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-bento border-line">
        <DialogHeader className="text-left">
          <DialogTitle className="tracking-tight">Личная переписка</DialogTitle>
          <DialogDescription>
            Выберите коллегу — диалог увидите только вы двое.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Icon
            name="Search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или должность"
            className="rounded-full h-10 pl-8 border-line"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto thin-scrollbar space-y-1 rounded-tile border border-line p-1.5">
          {list.map((p) => (
            <button
              key={p.login}
              type="button"
              disabled={busy === p.login}
              onClick={() => pick(p.login)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-surface transition-colors"
            >
              <span className="h-8 w-8 rounded-full bg-avatar font-head text-[11px] font-semibold flex items-center justify-center flex-none">
                {p.name.split(' ').map((w) => w[0]).join('')}
              </span>
              <span className="min-w-0 mr-auto">
                <span className="block text-[13px] truncate">{p.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {p.position || p.restaurant}
                </span>
              </span>
              <Icon
                name={busy === p.login ? 'LoaderCircle' : 'MessageSquare'}
                size={14}
                className={busy === p.login ? 'animate-spin flex-none' : 'flex-none'}
              />
            </button>
          ))}
          {list.length === 0 && (
            <div className="py-8 text-center text-[12px] text-muted-foreground">
              Никого не нашли
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
