import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Comment } from '@/data/workspace';
import { cn } from '@/lib/utils';

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `сегодня в ${time}`;
  return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })} в ${time}`;
}

export default function TaskComments({
  taskId,
  comments,
}: {
  taskId: string;
  comments: Comment[];
}) {
  const { addComment, user } = useWorkspace();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [comments.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    await addComment(taskId, value);
    setText('');
    setBusy(false);
  }

  return (
    <div className="mt-5">
      <div className="eyebrow mb-3">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Обсуждение · {comments.length}
      </div>

      {comments.length > 0 ? (
        <div ref={listRef} className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
          {comments.map((c) => {
            const own = c.author === user.name;
            return (
              <div key={c.id} className="flex gap-2.5">
                <span
                  className={cn(
                    'h-8 w-8 rounded-full font-head text-[11px] font-semibold flex items-center justify-center flex-none',
                    own ? 'bg-flag-select/20 text-foreground' : 'bg-avatar',
                  )}
                >
                  {c.author.split(' ').map((w) => w[0]).join('')}
                </span>
                <div className="min-w-0 flex-1 rounded-tile bg-surface border border-line px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-medium truncate">{c.author}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] leading-snug mt-0.5 whitespace-pre-wrap break-words">
                    {c.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-tile border border-dashed border-line py-5 text-center text-[12px] text-muted-foreground">
          Обсуждения пока нет — напишите первым
        </div>
      )}

      <form onSubmit={submit} className="mt-3 flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder="Написать в задачу..."
          rows={2}
          className="rounded-xl bg-card border-line text-[13px] min-h-[44px] resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !text.trim()}
          className="rounded-full h-10 w-10 flex-none"
          aria-label="Отправить комментарий"
        >
          <Icon name={busy ? 'LoaderCircle' : 'Send'} size={16} className={busy ? 'animate-spin' : ''} />
        </Button>
      </form>
    </div>
  );
}
