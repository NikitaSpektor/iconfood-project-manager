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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import {
  RESTAURANTS,
  coverClasses,
  priorityLabels,
  type Cover,
  type Priority,
  type Task,
} from '@/data/workspace';
import { assigneesOf } from '@/lib/assignees';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchMembers } from '@/lib/api';
import { deadlineLabel, formatDeadline, parseDeadline } from '@/lib/dates';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const covers: Cover[] = ['none', 'flame', 'ocean', 'herb', 'grape'];

function toIso(deadline: string) {
  const d = parseDeadline(deadline);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TaskEditDialog({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateTask } = useWorkspace();
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [restaurant, setRestaurant] = useState(RESTAURANTS[0]);
  const [priority, setPriority] = useState<Priority>('normal');
  const [deadline, setDeadline] = useState('');
  const [cover, setCover] = useState<Cover>('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNote(task.note ?? '');
    setAssignees(assigneesOf(task));
    setWatchers(task.watchers ?? []);
    setRestaurant(task.restaurant || RESTAURANTS[0]);
    setPriority(task.priority);
    setDeadline(toIso(task.deadline));
    setCover(task.cover);
    setError('');
  }, [task]);

  useEffect(() => {
    if (!task) return;
    fetchMembers()
      .then((list) => setPeople(list.map((m) => ({ id: m.id, name: m.name }))))
      .catch(() => undefined);
  }, [task]);

  function toggle(list: string[], set: (v: string[]) => void, name: string) {
    set(list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (title.trim().length < 3) {
      setError('Название — минимум 3 символа');
      return;
    }
    if (assignees.length === 0) {
      setError('Выберите хотя бы одного ответственного');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateTask(task.id, {
        title: title.trim(),
        note: note.trim(),
        assignees,
        assignee: assignees[0],
        watchers,
        restaurant,
        priority,
        cover,
        deadline: deadline ? formatDeadline(new Date(deadline)) : '',
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
      toast({ title: 'Не удалось сохранить задачу', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function peoplePicker(
    list: string[],
    set: (v: string[]) => void,
    placeholder: string,
  ) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl justify-between font-normal"
          >
            <span className="truncate">
              {list.length === 0
                ? placeholder
                : list.length <= 2
                  ? list.join(', ')
                  : `${list[0]} и ещё ${list.length - 1}`}
            </span>
            <Icon name="ChevronsUpDown" size={14} className="opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] rounded-2xl p-1.5" align="start">
          <div className="max-h-64 overflow-y-auto">
            {people.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(list, set, m.name)}
                className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-muted text-left"
              >
                <Checkbox checked={list.includes(m.name)} className="pointer-events-none" />
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-bento border-line max-h-[88vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-head">Изменить задачу</DialogTitle>
          <DialogDescription>
            Ответственные получат письмо с тем, что именно поменялось.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="et-title">Название</Label>
            <Input
              id="et-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="et-note">Описание</Label>
            <Textarea
              id="et-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Детали, которые важно не забыть"
              className="rounded-xl min-h-[72px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ответственные</Label>
              {peoplePicker(assignees, setAssignees, 'Выберите сотрудников')}
            </div>
            <div className="space-y-1.5">
              <Label>Наблюдатели</Label>
              {peoplePicker(watchers, setWatchers, 'Никто не следит')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ресторан</Label>
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
              <Label>Важность</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="et-deadline">Дедлайн</Label>
            <Input
              id="et-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="rounded-xl"
            />
            {deadline && (
              <p className="text-[11px] text-muted-foreground">
                {deadlineLabel(formatDeadline(new Date(deadline)))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Обложка</Label>
            <div className="flex gap-2">
              {covers.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCover(c)}
                  className={cn(
                    'h-9 flex-1 rounded-xl border transition-all',
                    c === 'none' ? 'bg-surface' : coverClasses[c],
                    cover === c ? 'border-foreground' : 'border-line',
                  )}
                  aria-label={`Обложка ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-primary flex items-center gap-1.5">
              <Icon name="TriangleAlert" size={13} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-full h-10 border-line"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={busy} className="flex-1 rounded-full h-10 gap-1.5">
              <Icon name="Check" size={15} />
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
