import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { RESTAURANTS } from '@/data/workspace';
import { PLANNER_KINDS, minutesToTime, timeToMinutes } from '@/lib/planner';
import type { PlannerEntry } from '@/lib/api';

export interface PlannerDraft {
  id?: string;
  start: number;
  end: number;
  title: string;
  note: string;
  kind: string;
  place: string;
}

export default function PlannerDialog({
  draft,
  dayLabel,
  onClose,
  onSave,
  onDelete,
}: {
  draft: PlannerDraft | null;
  dayLabel: string;
  onClose: () => void;
  onSave: (value: PlannerDraft) => Promise<void>;
  onDelete: (entry: PlannerEntry['id']) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState('work');
  const [place, setPlace] = useState('');
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('10:00');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setNote(draft.note);
    setKind(draft.kind || 'work');
    setPlace(draft.place);
    setFrom(minutesToTime(draft.start));
    setTo(minutesToTime(draft.end));
    setError('');
  }, [draft]);

  if (!draft) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const start = timeToMinutes(from);
    const end = timeToMinutes(to);
    if (title.trim().length < 2) {
      setError('Впишите, чем заняты');
      return;
    }
    if (end <= start) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setBusy(true);
    await onSave({
      id: draft?.id,
      start,
      end,
      title: title.trim(),
      note: note.trim(),
      kind,
      place,
    });
    setBusy(false);
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-bento border-line">
        <DialogHeader className="text-left">
          <DialogTitle className="tracking-tight">
            {draft.id ? 'Изменить запись' : 'Новая запись в дне'}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">{dayLabel}</p>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-title">Чем заняты</Label>
            <Input
              id="pl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: тренинг для кассиров"
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pl-from">Начало</Label>
              <Input
                id="pl-from"
                type="time"
                step={900}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-to">Окончание</Label>
              <Input
                id="pl-to"
                type="time"
                step={900}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {PLANNER_KINDS.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Место</Label>
              <Select value={place || 'none'} onValueChange={(v) => setPlace(v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="none">Не указано</SelectItem>
                  {RESTAURANTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pl-note">Заметка — по желанию</Label>
            <Textarea
              id="pl-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Детали, участники, что подготовить"
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>

          {error && (
            <p className="text-[13px] text-primary flex items-center gap-1.5">
              <Icon name="TriangleAlert" size={14} />
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1 rounded-full h-11">
              {busy ? 'Сохраняю…' : draft.id ? 'Сохранить' : 'Добавить в день'}
            </Button>
            {draft.id && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDelete(draft.id as string);
                  setBusy(false);
                }}
                className="rounded-full h-11 w-11 p-0 border-line text-muted-foreground hover:text-primary"
                aria-label="Удалить запись"
              >
                <Icon name="Trash2" size={15} />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
