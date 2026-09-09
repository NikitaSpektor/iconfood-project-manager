import { useState } from 'react';
import Icon from '@/components/ui/icon';
import NotificationsBell from './NotificationsBell';
import MessagesBell from './MessagesBell';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ViewId =
  | 'overview'
  | 'personal'
  | 'board'
  | 'gantt'
  | 'calendar'
  | 'chat'
  | 'reports'
  | 'ai'
  | 'members'
  | 'settings';

export const NAV: { id: ViewId; label: string; icon: string; dot?: boolean }[] = [
  { id: 'overview', label: 'Обзор', icon: 'LayoutGrid' },
  { id: 'personal', label: 'Моя доска', icon: 'UserRound' },
  { id: 'board', label: 'Доска холдинга', icon: 'Columns3' },
  { id: 'gantt', label: 'Гант', icon: 'GanttChart', dot: true },
  { id: 'calendar', label: 'Календарь', icon: 'CalendarDays' },
  { id: 'chat', label: 'Мессенджер', icon: 'MessageSquare' },
  { id: 'reports', label: 'Отчёты', icon: 'ChartNoAxesColumn' },
  { id: 'ai', label: 'Ассистент', icon: 'Sparkles' },
  { id: 'members', label: 'Участники', icon: 'Users' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

interface TopNavProps {
  onOpenTask: (taskId: string) => void;
  view: ViewId;
  onChange: (v: ViewId) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
}

export default function TopNav({ view, onChange, onLogout, userName, userRole, onOpenTask }: TopNavProps) {
  const [open, setOpen] = useState(false);
  const primary = NAV.slice(0, 5);
  const rest = NAV.slice(5);

  return (
    <header className="relative flex-none">
      <div className="flex items-center justify-between gap-3 h-[54px]">
        <div className="pl-1 flex items-center">
          <img
            src="/logo.png"
            alt="ICONFOOD"
            className="h-[22px] w-auto dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="ICONFOOD"
            className="h-[22px] w-auto hidden dark:block"
          />
        </div>

        {/* плавающая пилюля-меню */}
        <nav className="hidden lg:flex absolute left-1/2 top-1.5 -translate-x-1/2 items-center gap-1 bg-card border border-line rounded-full p-1.5 shadow-pill z-20">
          {primary.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex items-center gap-[7px] px-4 py-2 rounded-full font-head text-[13px] font-medium transition-colors',
                view === item.id
                  ? 'bg-surface text-foreground font-semibold shadow-[inset_0_0_0_1px_hsl(var(--line))]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.dot && <i className="h-1.5 w-1.5 rounded-full bg-primary flex-none" />}
              {item.label}
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full font-head text-[13px] font-medium transition-colors',
                  rest.some((r) => r.id === view)
                    ? 'bg-surface text-foreground font-semibold shadow-[inset_0_0_0_1px_hsl(var(--line))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Ещё
                <Icon name="ChevronDown" size={13} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="rounded-2xl border-line">
              {rest.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => onChange(item.id)}
                  className="gap-2 text-sm cursor-pointer"
                >
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <MessagesBell onOpenChat={() => onChange('chat')} />
          <NotificationsBell onOpenTask={onOpenTask} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium shadow-pill hover:bg-surface transition-colors">
                <span className="h-6 w-6 rounded-full bg-avatar font-head text-[11px] font-semibold flex items-center justify-center">
                  {userName[0]}
                </span>
                <span className="hidden sm:block">{userName.split(' ')[0]}</span>
                <Icon name="ChevronDown" size={13} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-line w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {userRole}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onChange('settings')} className="gap-2 text-sm cursor-pointer">
                <Icon name="Settings" size={15} />
                Настройки профиля
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onLogout} className="gap-2 text-sm cursor-pointer">
                <Icon name="LogOut" size={15} />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden h-9 w-9 rounded-full border border-line bg-card flex items-center justify-center shadow-pill"
            aria-label="Меню"
          >
            <Icon name={open ? 'X' : 'Menu'} size={17} />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-[56px] z-30 bg-card border border-line rounded-bento p-2 shadow-pill animate-scale-in">
          <div className="grid grid-cols-2 gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-left transition-colors',
                  view === item.id
                    ? 'bg-surface text-foreground'
                    : 'text-muted-foreground hover:bg-surface',
                )}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
