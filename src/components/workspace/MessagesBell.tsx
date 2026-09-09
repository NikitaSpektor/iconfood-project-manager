import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import { toast } from '@/hooks/use-toast';

export default function MessagesBell({ onOpenChat }: { onOpenChat: () => void }) {
  const { channels } = useWorkspace();
  const total = channels.reduce((sum, c) => sum + c.unread, 0);
  const seen = useRef<Record<string, string>>({});
  const ready = useRef(false);

  useEffect(() => {
    const direct = channels.filter((c) => c.kind === 'direct');
    const fresh: { author: string; text: string }[] = [];

    direct.forEach((c) => {
      const last = c.messages[c.messages.length - 1];
      if (!last) return;
      const prev = seen.current[c.id];
      seen.current[c.id] = last.id;
      if (ready.current && prev && prev !== last.id && !last.own && c.unread > 0) {
        fresh.push({
          author: c.name,
          text: last.text || (last.file ? `Файл: ${last.file.name}` : 'Новое сообщение'),
        });
      }
    });

    if (!ready.current && channels.length > 0) ready.current = true;

    fresh.forEach((m) => {
      toast({
        title: `Личное сообщение · ${m.author}`,
        description: m.text.length > 90 ? `${m.text.slice(0, 90)}…` : m.text,
      });
    });
  }, [channels]);

  return (
    <button
      onClick={onOpenChat}
      className="relative h-9 w-9 rounded-full border border-line bg-card shadow-pill flex items-center justify-center hover:bg-surface transition-colors"
      aria-label="Сообщения"
    >
      <Icon name="MessageSquare" size={16} />
      {total > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  );
}
