import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return sameDay
    ? `сегодня в ${time}`
    : `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} в ${time}`;
}

export default function NotificationsBell({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { notifications, markNotificationsRead } = useWorkspace();
  const unread = notifications.filter((n) => !n.read);

  useEffect(() => {
    if (unread.length === 0) return;
    const latest = unread[0];
    toast({
      title: latest.kind === 'file' ? 'Новый файл в вашей задаче' : 'Новый комментарий в вашей задаче',
      description: `${latest.actor} · ${latest.taskTitle}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread.length > 0 ? unread[0].id : '']);

  return (
    <DropdownMenu onOpenChange={(open) => open && unread.length > 0 && markNotificationsRead()}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-9 w-9 rounded-full border border-line bg-card shadow-pill flex items-center justify-center hover:bg-surface transition-colors"
          aria-label="Уведомления"
        >
          <Icon name="Bell" size={16} />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-line w-[320px] p-0">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-3 py-2.5">
          Уведомления по вашим задачам
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
            Пока тихо — новых событий нет
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto no-scrollbar py-1">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpenTask(n.taskId)}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-surface transition-colors',
                  !n.read && 'bg-flag-select/5',
                )}
              >
                <span className="h-8 w-8 rounded-full bg-avatar flex items-center justify-center flex-none">
                  <Icon name={n.kind === 'file' ? 'Paperclip' : 'MessageSquare'} size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium truncate">{n.taskTitle}</span>
                  <span className="block text-[12px] text-muted-foreground truncate">
                    {n.actor}: {n.text}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {formatTime(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
