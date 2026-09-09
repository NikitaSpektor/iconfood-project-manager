import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import {
  columnLabels,
  coverClasses,
  deadlineTone,
  priorityLabels,
  toneClasses,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import { useWorkspace } from '@/hooks/use-workspace';
import { cn } from '@/lib/utils';

const columnOrder: ColumnId[] = ['new', 'progress', 'done'];

export default function TaskDialog({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { toggleSubtask, moveTask, tasks } = useWorkspace();
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;

  if (!live) return null;

  const done = live.subtasks.filter((s) => s.done).length;
  const percent = live.subtasks.length
    ? Math.round((done / live.subtasks.length) * 100)
    : live.column === 'done'
      ? 100
      : 0;
  const tone = toneClasses[deadlineTone(live.deadline, live.column)];

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-bento border-line p-0 overflow-hidden">
        {live.cover !== 'none' && (
          <div className={cn('h-24 w-full', coverClasses[live.cover])} />
        )}

        <div className="p-6 pt-5">
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
            <DialogTitle className="text-xl leading-tight tracking-tight">
              {live.title}
            </DialogTitle>
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

          {live.subtasks.length > 0 && (
            <div className="mt-5">
              <div className="eyebrow mb-3">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
                Подзадачи
              </div>
              <ul className="space-y-2.5 max-h-52 overflow-y-auto no-scrollbar">
                {live.subtasks.map((s) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`${live.id}-${s.id}`}
                      checked={s.done}
                      onCheckedChange={() => toggleSubtask(live.id, s.id)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`${live.id}-${s.id}`}
                      className={cn(
                        'text-sm leading-snug cursor-pointer',
                        s.done && 'line-through text-muted-foreground',
                      )}
                    >
                      {s.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 rounded-tile bg-surface border border-line p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="UserCheck" size={14} />
              Ответственный: <span className="text-foreground font-medium">{live.assignee}</span>
            </div>
            {live.watchers.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="Eye" size={14} />
                Наблюдают: {live.watchers.join(', ')}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Mail" size={14} />
              Уведомление о задаче ушло на почту ответственного
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
                  className="rounded-full text-xs"
                  onClick={() => moveTask(live.id, col)}
                >
                  {columnLabels[col]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
