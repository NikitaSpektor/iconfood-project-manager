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
import { fetchMembers, suggestSubtasks } from '@/lib/api';
import { deadlineLabel, formatDeadline, isoToday } from '@/lib/dates';
import { cn } from '@/lib/utils';

const covers: Cover[] = ['none', 'flame', 'ocean', 'herb', 'grape'];

export default function NewTaskDialog({
  open,
  onOpenChange,
  personal,
  presetTemplate = 'none',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personal: boolean;
  presetTemplate?: string;
}) {
  const { createTask } = useWorkspace();
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');

  const [restaurant, setRestaurant] = useState(RESTAURANTS[0]);
  const [priority, setPriority] = useState<Priority>('normal');
  const [deadline, setDeadline] = useState('');
  const [cover, setCover] = useState<Cover>('flame');
  const [template, setTemplate] = useState('none');
  const [steps, setSteps] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTemplate(presetTemplate);
    setAiNote('');
    setSteps(TEMPLATES.find((t) => t.id === presetTemplate)?.steps ?? []);
    const owner = TEMPLATES.find((t) => t.id === presetTemplate)?.owner;
    fetchMembers()
      .then((data) => {
        setPeople(data);
        const match = owner && data.find((m) => m.name === owner);
        setAssignee((prev) => (match ? match.name : prev || data[0]?.name || ''));
      })
      .catch(() => undefined);
  }, [open, presetTemplate]);

  function pickTemplate(id: string) {
    setTemplate(id);
    const tpl = TEMPLATES.find((t) => t.id === id);
    setSteps(tpl?.steps ? [...tpl.steps] : []);
    setAiNote('');
    if (!tpl?.owner) return;
    const match = people.find((m) => m.name === tpl.owner);
    if (match) setAssignee(match.name);
  }

  async function askAssistant() {
    if (title.trim().length < 4) {
      setAiNote('Сначала впишите название задачи');
      return;
    }
    setAiLoading(true);
    setAiNote('');
    try {
      const list = await suggestSubtasks({
        title: title.trim(),
        restaurant,
        priority: priorityLabels[priority],
        deadline: deadline ? formatDeadline(new Date(deadline)) : '',
      });
      setSteps((prev) => [...prev, ...list]);
      setAiNote(`Ассистент предложил ${list.length} шагов — отредактируйте или удалите лишние`);
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : 'Не удалось получить подсказку');
    } finally {
      setAiLoading(false);
    }
  }

  function editStep(i: number, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 4) {
      setError('Название задачи — минимум 4 символа');
      return;
    }
    if (!deadline) {
      setError('Выберите дату дедлайна');
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
      deadline: formatDeadline(new Date(deadline)),
      assignee,
      watchers: [],
      template: tpl?.name,
      personal,
      track: 'Новое',
      ganttStart: 30,
      ganttSpan: 30,
      subtasks: steps
        .map((s) => s.trim())
        .filter(Boolean)
        .map((step, i) => ({ id: `s${i}`, title: step, done: false })),
    });
    setTitle('');
    setDeadline('');
    setSteps([]);
    setAiNote('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-bento border-line max-h-[88vh] overflow-y-auto thin-scrollbar">
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
                <SelectContent className="rounded-2xl">
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
              <Label htmlFor="nt-deadline">Дедлайн</Label>
              <Input
                id="nt-deadline"
                type="date"
                value={deadline}
                min={isoToday()}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-xl"
              />
              {deadline && (
                <p className="text-[11px] text-muted-foreground">
                  {deadlineLabel(formatDeadline(new Date(deadline)))}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Шаблон</Label>
            <Select value={template} onValueChange={pickTemplate}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="none">Без шаблона</SelectItem>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {t.steps.length} подзадач
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {TEMPLATES.find((t) => t.id === template)?.owner && (
              <p className="text-[11px] text-muted-foreground">
                Ответственный по умолчанию — {TEMPLATES.find((t) => t.id === template)?.owner}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Подзадачи {steps.length > 0 && `· ${steps.length}`}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiLoading}
                onClick={askAssistant}
                className="rounded-full h-8 px-3 text-[12px] gap-1.5"
              >
                <Icon
                  name={aiLoading ? 'LoaderCircle' : 'Sparkles'}
                  size={13}
                  className={aiLoading ? 'animate-spin' : ''}
                />
                {aiLoading ? 'Думаю…' : 'Предложить подзадачи'}
              </Button>
            </div>

            {steps.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto thin-scrollbar pr-1">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground w-4 text-right">{i + 1}</span>
                    <Input
                      value={step}
                      onChange={(e) => editStep(i, e.target.value)}
                      className="rounded-xl h-9 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="h-9 w-9 flex-none rounded-xl border border-line text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
                      aria-label="Удалить подзадачу"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, ''])}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Icon name="Plus" size={13} />
              Добавить шаг вручную
            </button>

            {aiNote && <p className="text-[11px] text-muted-foreground">{aiNote}</p>}
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