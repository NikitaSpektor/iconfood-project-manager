import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Attachment, Comment } from '@/data/workspace';
import { cn } from '@/lib/utils';

function shortTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${time}`;
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function SubtaskThread({
  taskId,
  subtaskId,
  comments,
  files,
}: {
  taskId: string;
  subtaskId: string;
  comments: Comment[];
  files: Attachment[];
}) {
  const { addComment, attachFile, removeFile, user } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = comments.filter((c) => c.subtaskId === subtaskId);
  const stepFiles = files.filter((f) => f.subtaskId === subtaskId);
  const count = list.length + stepFiles.length;

  async function send() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    await addComment(taskId, value, subtaskId);
    setText('');
    setBusy(false);
  }

  async function upload(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    setBusy(true);
    for (const file of Array.from(picked)) {
      await attachFile(taskId, file, subtaskId);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'text-[11px] flex items-center gap-1 transition-colors',
          count > 0
            ? 'text-foreground/70 hover:text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon name="MessageSquare" size={12} />
        {count > 0 ? `Обсуждение · ${count}` : 'Комментировать'}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5 border-l-2 border-line pl-2.5">
          {list.map((c) => (
            <div key={c.id} className="text-[12px] leading-snug">
              <span
                className={cn(
                  'font-medium',
                  c.author === user.name ? 'text-foreground' : 'text-foreground/80',
                )}
              >
                {c.author}
              </span>
              <span className="text-muted-foreground text-[11px] ml-1.5">
                {shortTime(c.createdAt)}
              </span>
              <p className="whitespace-pre-wrap break-words text-foreground/90">{c.text}</p>
            </div>
          ))}

          {stepFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {stepFiles.map((f) =>
                f.mime.startsWith('image/') ? (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    title={f.name}
                    className="group relative h-14 w-14 rounded-lg overflow-hidden border border-line"
                  >
                    <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeFile(taskId, f.id);
                      }}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-card border border-line flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Удалить файл"
                    >
                      <Icon name="X" size={9} />
                    </button>
                  </a>
                ) : (
                  <span
                    key={f.id}
                    className="group flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] max-w-[190px]"
                  >
                    <Icon name="Paperclip" size={11} className="text-muted-foreground flex-none" />
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      download={f.name}
                      className="truncate hover:underline"
                      title={`${f.name} · ${sizeLabel(f.size)}`}
                    >
                      {f.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeFile(taskId, f.id)}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-none"
                      aria-label="Удалить файл"
                    >
                      <Icon name="X" size={11} />
                    </button>
                  </span>
                ),
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Что по этому шагу?"
              className="h-8 rounded-xl text-[12px]"
            />
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="h-8 w-8 flex-none rounded-xl border border-line text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center disabled:opacity-40"
              aria-label="Прикрепить файл к шагу"
            >
              <Icon name="Paperclip" size={13} />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || !text.trim()}
              className="h-8 w-8 flex-none rounded-xl border border-line text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center disabled:opacity-40"
              aria-label="Отправить комментарий к шагу"
            >
              <Icon
                name={busy ? 'LoaderCircle' : 'Send'}
                size={13}
                className={busy ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
