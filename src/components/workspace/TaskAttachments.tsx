import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Attachment } from '@/data/workspace';
import { cn } from '@/lib/utils';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function fileIcon(mime: string, name: string) {
  if (mime.startsWith('image/')) return 'Image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'FileText';
  if (/sheet|excel|csv/.test(mime) || /\.(xlsx?|csv)$/i.test(name)) return 'Sheet';
  if (/word|document/.test(mime) || /\.docx?$/i.test(name)) return 'FileType';
  if (/zip|rar|7z/.test(mime) || /\.(zip|rar|7z)$/i.test(name)) return 'FileArchive';
  return 'Paperclip';
}

export default function TaskAttachments({
  taskId,
  files,
}: {
  taskId: string;
  files: Attachment[];
}) {
  const { attachFile, removeFile } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    for (const file of Array.from(list)) {
      await attachFile(taskId, file);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  const images = files.filter((f) => f.mime.startsWith('image/'));
  const docs = files.filter((f) => !f.mime.startsWith('image/'));

  return (
    <div className="mt-5">
      <div className="eyebrow mb-3">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Вложения · {files.length}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {images.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square rounded-tile overflow-hidden border border-line bg-surface"
              title={f.name}
            >
              <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-card/90 px-2 py-1 text-[10px] truncate">
                {f.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(taskId, f.id);
                }}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-card border border-line flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Удалить вложение"
              >
                <Icon name="X" size={12} />
              </button>
            </a>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <ul className="space-y-2 mb-2.5">
          {docs.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-tile bg-surface border border-line px-3 py-2"
            >
              <Icon name={fileIcon(f.mime, f.name)} size={16} className="text-muted-foreground flex-none" />
              <div className="min-w-0 mr-auto">
                <div className="text-[13px] font-medium truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {formatSize(f.size)} · {f.author}
                </div>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                download={f.name}
                className="h-8 w-8 rounded-full border border-line flex items-center justify-center hover:bg-card transition-colors flex-none"
                aria-label="Скачать файл"
              >
                <Icon name="Download" size={14} />
              </a>
              <button
                type="button"
                onClick={() => removeFile(taskId, f.id)}
                className="h-8 w-8 rounded-full border border-line flex items-center justify-center hover:bg-card transition-colors flex-none text-muted-foreground"
                aria-label="Удалить вложение"
              >
                <Icon name="Trash2" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-tile border border-dashed px-4 py-4 text-center transition-colors',
          dragging ? 'border-flag-select bg-flag-select/5' : 'border-line',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <p className="text-[12px] text-muted-foreground">
          Перетащите файлы сюда или выберите на компьютере · до 8 МБ
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full mt-2.5 gap-1.5 text-xs"
        >
          <Icon
            name={busy ? 'LoaderCircle' : 'Paperclip'}
            size={14}
            className={busy ? 'animate-spin' : ''}
          />
          {busy ? 'Загружаем...' : 'Прикрепить файл'}
        </Button>
      </div>
    </div>
  );
}
