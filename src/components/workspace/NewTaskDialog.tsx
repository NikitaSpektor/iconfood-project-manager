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
import {
  RESTAURANTS,
  TEMPLATES,
  coverClasses,
  priorityLabels,
  type Cover,
  type Priority,
} from '@/data/workspace';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchMembers } from '@/lib/api';
import { cn } from '@/lib/utils';

const covers: Cover[] = ['none', 'flame', 'ocean', 'herb', 'grape'];

export default function NewTaskDialog({
  open,
  onOpenChange,
  personal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personal: boolean;
}) {
  const { createTask } = useWorkspace();
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchMembers()
      .then((data) => {
        setPeople(data);
        setAssignee((prev) => prev || data[0]?.name || '');
      })
      .catch(() => undefined);
  }, [open]);

  const [restaurant, setRestaurant] = useState(RESTAURANTS[0]);
  const [priority, setPriority] = useState<Priority>('normal');
  const [deadline, setDeadline] = useState('');
  const [cover, setCover] = useState<Cover>('flame');
  const [template, setTemplate] = useState('none');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 4) {
      setError('Название задачи — минимум 4 символа');
      return;
    }
    if (!/^\d{2}\.\d{2}$/.test(deadline)) {
      setError('Дедлайн в формате ДД.ММ, например 24.09');
      return;
    }
    setError('');
    const tpl = TEMPLATES.find((t) => t.id === template);
    createTask({
      title: title.trim(),
      restaurant,
      column: 'new',
      priority,
      cover,
      deadline: `${deadline.slice(0, 2)} сентября`,
      assignee,
      watchers: [],
      template: tpl?.name,
      personal,
      track: 'Новое',
      ganttStart: 30,
      ganttSpan: 30,
      subtasks: tpl
        ? Array.from({ length: tpl.steps }, (_, i) => ({
            id: `s${i}`,
            title: `${tpl.name}: шаг ${i + 1}`,
            done: false,
          }))
        : [],
    });
    setTitle('');
    setDeadline('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-bento border-line">
        <DialogHeader className="text-left">
          <DialogTitle className="tracking-tight">Новая задача</DialogTitle>
          <DialogDescription>
            {personal ? 'Попадёт на вашу личную доску.' : 'Попадёт на общую доску холдинга.'}{' '}
            Ответственный получит письмо.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-title">Название</Label>
            <Input
              id="nt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: обновить винную карту"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ответственный</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-56">
                  {people.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="nt-deadline">Дедлайн (ДД.ММ)</Label>
              <Input
                id="nt-deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="24.09"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Шаблон</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="none">Без шаблона</SelectItem>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {t.steps} подзадач
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
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
                    cover === c ? 'border-flag-select border-2' : 'border-line',
                  )}
                >
                  {c === 'none' && (
                    <Icon name="Ban" size={14} className="mx-auto text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-primary flex items-center gap-1.5">
              <Icon name="TriangleAlert" size={14} />
              {error}
            </p>
          )}

          <Button type="submit" className="w-full rounded-full h-11">
            Создать и уведомить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}