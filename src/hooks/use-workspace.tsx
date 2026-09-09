import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type Channel,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import { toast } from '@/hooks/use-toast';
import { fetchTasks, taskAction, type ApiUser } from '@/lib/api';

export interface Notification {
  id: string;
  taskId: string;
  taskTitle: string;
  kind: 'comment' | 'file';
  actor: string;
  text: string;
  read: boolean;
  createdAt: string;
}

interface WorkspaceValue {
  tasks: Task[];
  notifications: Notification[];
  markNotificationsRead: () => void;
  channels: Channel[];
  loading: boolean;
  user: ApiUser;
  moveTask: (taskId: string, column: ColumnId) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  createTask: (task: Omit<Task, 'id'>) => void;
  addComment: (taskId: string, text: string) => Promise<void>;
  attachFile: (taskId: string, file: File) => Promise<void>;
  removeFile: (taskId: string, fileId: string) => Promise<void>;
  sendMessage: (channelId: string, text: string, file?: File) => Promise<void>;
  readChannel: (channelId: string) => void;
  createChannel: (name: string, hint: string, members: string[]) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children, user }: { children: ReactNode; user: ApiUser }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);

  const apply = useCallback(
    (data: { tasks: Task[]; notifications: Notification[]; channels?: Channel[] }) => {
      setTasks(data.tasks);
      setNotifications(data.notifications ?? []);
      if (data.channels) setChannels(data.channels);
    },
    [],
  );

  useEffect(() => {
    fetchTasks()
      .then(apply)
      .catch(() => toast({ title: 'Не удалось загрузить задачи', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [apply]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchTasks().then(apply).catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [apply]);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    taskAction({ action: 'read_notifications' }).catch(() => undefined);
  }, []);

  const moveTask = useCallback((taskId: string, column: ColumnId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column } : t)));
    taskAction({ action: 'move', taskId, column })
      .then(apply)
      .catch(() => toast({ title: 'Не удалось сохранить', variant: 'destructive' }));
  }, [apply]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    );
    taskAction({ action: 'toggle', taskId, subtaskId })
      .then(apply)
      .catch(() => toast({ title: 'Не удалось сохранить', variant: 'destructive' }));
  }, [apply]);

  const createTask = useCallback((task: Omit<Task, 'id'>) => {
    taskAction({ action: 'create', ...task })
      .then((data) => {
        apply(data);
        toast({
          title: 'Задача создана',
          description: `Уведомление отправлено на почту: ${task.assignee}`,
        });
      })
      .catch(() => toast({ title: 'Не удалось создать задачу', variant: 'destructive' }));
  }, [apply]);

  const addComment = useCallback(async (taskId: string, text: string) => {
    try {
      apply(await taskAction({ action: 'comment', taskId, text }));
    } catch {
      toast({ title: 'Не удалось отправить комментарий', variant: 'destructive' });
    }
  }, [apply]);

  const attachFile = useCallback(async (taskId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Файл больше 8 МБ', description: 'Загрузите файл поменьше', variant: 'destructive' });
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const updated = await taskAction({
        action: 'attach',
        taskId,
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data,
      });
      apply(updated);
      toast({ title: 'Файл прикреплён', description: file.name });
    } catch {
      toast({ title: 'Не удалось загрузить файл', variant: 'destructive' });
    }
  }, [apply]);

  const removeFile = useCallback(async (taskId: string, fileId: string) => {
    try {
      apply(await taskAction({ action: 'detach', taskId, fileId }));
    } catch {
      toast({ title: 'Не удалось удалить файл', variant: 'destructive' });
    }
  }, [apply]);

  const sendMessage = useCallback(
    async (channelId: string, text: string, file?: File) => {
      try {
        let payload: Record<string, unknown> = { action: 'send_message', channelId, text };
        if (file) {
          if (file.size > 8 * 1024 * 1024) {
            toast({ title: 'Файл больше 8 МБ', variant: 'destructive' });
            return;
          }
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          payload = {
            ...payload,
            data,
            name: file.name,
            mime: file.type || 'application/octet-stream',
          };
        }
        apply(await taskAction(payload));
      } catch {
        toast({ title: 'Сообщение не отправлено', variant: 'destructive' });
      }
    },
    [apply],
  );

  const readChannel = useCallback(
    (channelId: string) => {
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)));
      taskAction({ action: 'read_channel', channelId }).catch(() => undefined);
    },
    [],
  );

  const createChannel = useCallback(
    async (name: string, hint: string, members: string[]) => {
      try {
        apply(await taskAction({ action: 'create_channel', name, hint, members }));
        toast({ title: 'Канал создан', description: name });
      } catch {
        toast({ title: 'Не удалось создать канал', variant: 'destructive' });
      }
    },
    [apply],
  );

  const value = useMemo(
    () => ({
      tasks,
      notifications,
      markNotificationsRead,
      channels,
      loading,
      user,
      moveTask,
      toggleSubtask,
      createTask,
      addComment,
      attachFile,
      removeFile,
      sendMessage,
      readChannel,
      createChannel,
    }),
    [
      tasks,
      notifications,
      markNotificationsRead,
      channels,
      loading,
      user,
      moveTask,
      toggleSubtask,
      createTask,
      addComment,
      attachFile,
      removeFile,
      sendMessage,
      readChannel,
      createChannel,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace должен использоваться внутри WorkspaceProvider');
  return ctx;
}