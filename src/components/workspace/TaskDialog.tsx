import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { assigneesOf, assigneesLabel } from '@/lib/assignees';
import {
  columnLabels,
  coverClasses,
  deadlineTone,
  priorityLabels,
  toneClasses,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import { deadlineLabel } from '@/lib/dates';
import { useWorkspace } from '@/hooks/use-workspace';
import { suggestSubtasks } from '@/lib/api';
import { localSubtaskHints } from '@/lib/subtask-hints';
import TaskComments from './TaskComments';
import TaskAttachments from './TaskAttachments';
import TaskEditDialog from './TaskEditDialog';
import { cn } from '@/lib/utils';

const columnOrder: ColumnId[] = ['new', 'progress', 'done'];

export default function TaskDialog({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { toggleSubtask, addSubtasks, removeSubtask, renameSubtask, moveTask, tasks } =
    useWorkspace();
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStep, setEditStep] = useState<string | null>(null);
  const [stepText, setStepText] = useState('');
  const [adding, setAdding] = useState(false);
  const [newStep, setNewStep] = useState('');

  function startEdit(id: string, title: string) {
    setEditStep(id);
    setStepText(title);
  }

  async function saveStep(id: string) {
    const clean = stepText.trim();
    setEditStep(null);
    if (live && clean && clean !== live.subtasks.find((s) => s.id === id)?.title) {
      await renameSubtask(live.id, id, clean);
    }
  }

  async function addStep() {
    const clean = newStep.trim();
    if (!live || !clean) {
      setAdding(false);
      setNewStep('');
      return;
    }
    await addSubtasks(live.id, [clean]);
    setNewStep('');
  }

  async function askAssistant() {
    if (!live) return;
    setAiLoading(true);
    let list: string[];
    try {
      list = await suggestSubtasks({
        title: live.title,
        restaurant: live.restaurant,
        priority: priorityLabels[live.priority],
        deadline: live.deadline,
      });
    } catch {
      list = localSubtaskHints(live.title, live.restaurant);
    }
    const existing = new Set(live.subtasks.map((s) => s.title.trim().toLowerCase()));
    const fresh = list.filter((s) => !existing.has(s.trim().toLowerCase()));
    if (fresh.length) await addSubtasks(live.id, fresh);
    setAiLoading(false);
  }

  if (!live) return null;

  const done = live.subtasks.filter((s) => s.done).length;
  const stepsLeft = live.subtasks.length - done;
  const percent = live.subtasks.length
    ? Math.round((done / live.subtasks.length) * 100)
    : live.column === 'done'
      ? 100
      : 0;
  const tone = toneClasses[deadlineTone(live.deadline, live.column)];

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-bento border-line p-0 overflow-hidden max-h-[88vh] flex flex-col">
        {live.cover !== 'none' && (
          <div className={cn('h-24 w-full flex-none', coverClasses[live.cover])} />
        )}

        <div className="p-6 pt-5 overflow-y-auto no-scrollbar">
          <DialogHeader className="text-left space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  tone.soft,
                  tone.text,
                )}
              >
                {priorityLabels[live.priority]} · {live.deadline}
                {live.column !== 'done' && ` · ${deadlineLabel(live.deadline)}`}
              </span>
              <span className="rounded-full bg-surface border border-line px-2.5 py-1 text-[11px] text-muted-foreground">
                {live.restaurant}
              </span>
              {live.template && (
                <span className="rounded-full bg-surface border border-line px-2.5 py-1 text-[11px] text-muted-foreground">
                  Шаблон «{live.template}»
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <DialogTitle className="text-xl leading-tight tracking-tight flex-1">
                {live.title}
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="rounded-full h-8 px-3 text-[12px] gap-1.5 flex-none mt-0.5"
              >
                <Icon name="Pencil" size={13} />
                Изменить
              </Button>
            </div>
          </DialogHeader>

          {live.note && (
            <p className="mt-2 text-sm text-muted-foreground">{live.note}</p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Progress value={percent} className="h-1.5" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {percent}%
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="eyebrow">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
                Подзадачи
              </div>
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
                {aiLoading ? 'Думаю…' : 'Предложить шаги'}
              </Button>
            </div>
            {live.subtasks.length > 0 ? (
              <ul className="space-y-2.5 max-h-52 overflow-y-auto thin-scrollbar pr-1">
                {live.subtasks.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 group">
                    <Checkbox
                      id={`${live.id}-${s.id}`}
                      checked={s.done}
                      onCheckedChange={() => toggleSubtask(live.id, s.id)}
                      className="mt-0.5"
                    />
                    {editStep === s.id ? (
                      <Input
                        autoFocus
                        value={stepText}
                        onChange={(e) => setStepText(e.target.value)}
                        onBlur={() => saveStep(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveStep(s.id);
                          if (e.key === 'Escape') setEditStep(null);
                        }}
                        className="h-8 rounded-xl text-[13px] flex-1"
                      />
                    ) : (
                      <>
                        <label
                          htmlFor={`${live.id}-${s.id}`}
                          className={cn(
                            'text-sm leading-snug cursor-pointer flex-1',
                            s.done && 'line-through text-muted-foreground',
                          )}
                        >
                          {s.title}
                        </label>
                        <button
                          type="button"
                          onClick={() => startEdit(s.id, s.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground mt-0.5"
                          aria-label="Изменить подзадачу"
                        >
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSubtask(live.id, s.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary mt-0.5"
                          aria-label="Удалить подзадачу"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Пока шагов нет — помощник подскажет, с чего начать.
              </p>
            )}

            {adding ? (
              <Input
                autoFocus
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onBlur={() => {
                  addStep();
                  setAdding(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addStep();
                  if (e.key === 'Escape') {
                    setAdding(false);
                    setNewStep('');
                  }
                }}
                placeholder="Что нужно сделать"
                className="mt-2.5 h-8 rounded-xl text-[13px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Icon name="Plus" size={13} />
                Добавить шаг
              </button>
            )}
          </div>

          <div className="mt-5 rounded-tile bg-surface border border-line p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="UserCheck" size={14} />
              {assigneesOf(live).length > 1 ? 'Ответственные' : 'Ответственный'}:{' '}
              <span className="text-foreground font-medium">{assigneesLabel(live)}</span>
            </div>
            {live.watchers.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="Eye" size={14} />
                Наблюдают: {live.watchers.join(', ')}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Mail" size={14} />
              Уведомление о задаче ушло на почту{' '}
              {assigneesOf(live).length > 1 ? 'всех ответственных' : 'ответственного'}
            </div>
          </div>

          <div className="mt-5">
            <div className="eyebrow mb-2.5">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
              Перенести в колонку
            </div>
            <div className="flex gap-2">
              {columnOrder.map((col) => (
                <Button
                  key={col}
                  size="sm"
                  variant={live.column === col ? 'default' : 'outline'}
                  disabled={col === 'done' && stepsLeft > 0}
                  title={
                    col === 'done' && stepsLeft > 0
                      ? 'Сначала закройте все подзадачи'
                      : undefined
                  }
                  className="rounded-full text-xs"
                  onClick={() => moveTask(live.id, col)}
                >
                  {columnLabels[col]}
                </Button>
              ))}
            </div>
            {stepsLeft > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Icon name="Info" size={12} />
                Завершить можно, когда закрыты все подзадачи — осталось {stepsLeft}
              </p>
            )}
          </div>

          <TaskAttachments taskId={live.id} files={live.attachments ?? []} />

          <TaskComments taskId={live.id} comments={live.comments ?? []} />
        </div>
      </DialogContent>

      <TaskEditDialog task={editing ? live : null} onOpenChange={(v) => setEditing(v)} />
    </Dialog>
  );
}