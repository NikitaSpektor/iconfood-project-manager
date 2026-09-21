import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useInstallPrompt, type Platform } from '@/hooks/use-install-prompt';

const STEPS: Record<Platform, { icon: string; text: string }[]> = {
  ios: [
    { icon: 'Compass', text: 'Откройте сайт в Safari — в других браузерах на iPhone ярлык не создаётся.' },
    { icon: 'Share', text: 'Нажмите кнопку «Поделиться» — квадрат со стрелкой вверх внизу экрана.' },
    { icon: 'SquarePlus', text: 'В списке пролистайте вниз и выберите «На экран “Домой”».' },
    { icon: 'Check', text: 'Нажмите «Добавить» — значок ICONFOOD появится среди приложений.' },
  ],
  android: [
    { icon: 'Chrome', text: 'Откройте сайт в Chrome.' },
    { icon: 'EllipsisVertical', text: 'Нажмите три точки в правом верхнем углу.' },
    { icon: 'Download', text: 'Выберите «Установить приложение» или «Добавить на главный экран».' },
    { icon: 'Check', text: 'Подтвердите — ярлык появится на рабочем столе телефона.' },
  ],
  desktop: [
    { icon: 'Globe', text: 'Откройте сайт в Chrome, Edge или Яндекс Браузере.' },
    { icon: 'MonitorDown', text: 'В адресной строке справа нажмите значок установки.' },
    { icon: 'Download', text: 'Либо меню браузера → «Установить ICONFOOD».' },
    { icon: 'Check', text: 'Приложение откроется в отдельном окне без вкладок.' },
  ],
};

const TABS: { id: Platform; label: string; icon: string }[] = [
  { id: 'ios', label: 'iPhone', icon: 'Apple' },
  { id: 'android', label: 'Android', icon: 'Smartphone' },
  { id: 'desktop', label: 'Компьютер', icon: 'Monitor' },
];

export default function InstallGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { canInstall, install, installed, platform } = useInstallPrompt();
  const [tab, setTab] = useState<Platform>(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-tile">
        <DialogHeader>
          <DialogTitle className="text-[17px]">Приложение на экран телефона</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-muted-foreground -mt-1">
          ICONFOOD откроется как обычное приложение — на весь экран, без адресной строки.
        </p>

        {installed ? (
          <div className="rounded-tile bg-muted/50 border border-line p-4 flex items-center gap-2.5 text-[13px]">
            <Icon name="CircleCheck" size={18} className="text-flag-done flex-none" />
            Приложение уже установлено — вы открыли его с ярлыка.
          </div>
        ) : (
          <>
            {canInstall && (
              <Button onClick={() => install()} className="rounded-full h-10 gap-2 w-full">
                <Icon name="Download" size={16} />
                Установить в одно нажатие
              </Button>
            )}

            <div className="flex gap-1.5 p-1 bg-muted/60 rounded-full">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-1 h-8 rounded-full text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5',
                    tab === t.id ? 'bg-card shadow-pill' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon name={t.icon} size={13} fallback="Smartphone" />
                  {t.label}
                </button>
              ))}
            </div>

            <ol className="space-y-2.5">
              {STEPS[tab].map((s, i) => (
                <li key={s.text} className="flex gap-3 items-start">
                  <span className="flex-none h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-[1.45] flex items-start gap-2">
                    <Icon name={s.icon} size={15} className="text-muted-foreground flex-none mt-0.5" fallback="Circle" />
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>

            <p className="text-[12px] text-muted-foreground flex items-start gap-1.5">
              <Icon name="Info" size={13} className="flex-none mt-0.5" />
              Вход сохраняется — заново вводить логин не придётся.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
