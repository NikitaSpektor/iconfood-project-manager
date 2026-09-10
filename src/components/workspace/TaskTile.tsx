import Icon from '@/components/ui/icon';
import {
  coverClasses,
  deadlineTone,
  toneClasses,
  type Task,
} from '@/data/workspace';
import { deadlineLabel } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface TaskTileProps {
  task: Task;
  onOpen: (task: Task) => void;
  selected?: boolean;
}

export default function TaskTile({ task, onOpen, selected }: TaskTileProps) {
  const tone = toneClasses[deadlineTone(task.deadline, task.column)];
  const doneCount = task.subtasks.filter((s) => s.done).length;

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      className={cn(
        'w-full text-left bg-card border rounded-tile p-3 mb-2 transition-all duration-200',
        'hover:shadow-pill hover:-translate-y-0.5 active:translate-y-0 cursor-grab',
        selected ? 'border-flag-select border-[1.5px]' : 'border-line',
      )}
    >
      {task.cover !== 'none' && (
        <div className={cn('h-7 rounded-lg mb-2.5', coverClasses[task.cover])} />
      )}

      <div className="flex items-start gap-2">
        <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full flex-none', tone.dot)} />
        <span className="text-[13px] font-medium leading-snug">{task.title}</span>
      </div>

      <div className="mt-1.5 pl-3.5 text-[11px] text-muted-foreground">
        {task.template ? `Шаблон «${task.template}» · ` : `${task.restaurant} · `}
        {task.subtasks.length > 0
          ? `${doneCount} из ${task.subtasks.length} подзадач`
          : task.deadline}
      </div>

      <div className="mt-2.5 pl-3.5 flex items-center justify-between">
        <div className="flex">
          {[task.assignee, ...task.watchers].slice(0, 3).map((name, i) => (
            <span
              key={name}
              className="h-[18px] w-[18px] rounded-full bg-avatar border-2 border-card text-[8px] font-head font-semibold text-foreground/70 flex items-center justify-center"
              style={{ marginLeft: i === 0 ? 0 : -5 }}
            >
              {name[0]}
            </span>
          ))}
        </div>
        {(task.priority === 'critical' || task.priority === 'high') && (
          <span className={cn('flex items-center gap-1 text-[10px] font-medium', tone.text)}>
            <Icon name="Flame" size={11} />
            {task.column === 'done' ? task.deadline : deadlineLabel(task.deadline)}
          </span>
        )}
      </div>
    </button>
  );
}
