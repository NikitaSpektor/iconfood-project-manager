import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CHANNELS,
  type Channel,
  type ChatMessage,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import { toast } from '@/hooks/use-toast';
import { fetchTasks, taskAction, type ApiUser } from '@/lib/api';

interface WorkspaceValue {
  tasks: Task[];
  channels: Channel[];
  loading: boolean;
  user: ApiUser;
  moveTask: (taskId: string, column: ColumnId) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  createTask: (task: Omit<Task, 'id'>) => void;
  addComment: (taskId: string, text: string) => Promise<void>;
  attachFile: (taskId: string, file: File) => Promise<void>;
  removeFile: (taskId: string, fileId: string) => Promise<void>;
  sendMessage: (channelId: string, text: string) => void;
  readChannel: (channelId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children, user }: { children: ReactNode; user: ApiUser }) {
  const userName = user.name;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);

  useEffect(() => {
    fetchTasks()
      .then((data) => setTasks(data))
      .catch(() => toast({ title: 'Не удалось загрузить задачи', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const moveTask = useCallback((taskId: string, column: ColumnId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column } : t)));
    taskAction({ action: 'move', taskId, column })
      .then(setTasks)
      .catch(() => toast({ title: 'Не удалось сохранить', variant: 'destructive' }));
  }, []);

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
      .then(setTasks)
      .catch(() => toast({ title: 'Не удалось сохранить', variant: 'destructive' }));
  }, []);

  const createTask = useCallback((task: Omit<Task, 'id'>) => {
    taskAction({ action: 'create', ...task })
      .then((data) => {
        setTasks(data);
        toast({
          title: 'Задача создана',
          description: `Уведомление отправлено на почту: ${task.assignee}`,
        });
      })
      .catch(() => toast({ title: 'Не удалось создать задачу', variant: 'destructive' }));
  }, []);

  const addComment = useCallback(async (taskId: string, text: string) => {
    try {
      const data = await taskAction({ action: 'comment', taskId, text });
      setTasks(data);
    } catch {
      toast({ title: 'Не удалось отправить комментарий', variant: 'destructive' });
    }
  }, []);

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
      setTasks(updated);
      toast({ title: 'Файл прикреплён', description: file.name });
    } catch {
      toast({ title: 'Не удалось загрузить файл', variant: 'destructive' });
    }
  }, []);

  const removeFile = useCallback(async (taskId: string, fileId: string) => {
    try {
      const updated = await taskAction({ action: 'detach', taskId, fileId });
      setTasks(updated);
    } catch {
      toast({ title: 'Не удалось удалить файл', variant: 'destructive' });
    }
  }, []);

  const sendMessage = useCallback(
    (channelId: string, text: string) => {
      const message: ChatMessage = {
        id: `m${Date.now()}`,
        author: userName,
        text,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        own: true,
      };
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, messages: [...c.messages, message] } : c,
        ),
      );
    },
    [userName],
  );

  const readChannel = useCallback((channelId: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)),
    );
  }, []);

  const value = useMemo(
    () => ({
      tasks,
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
    }),
    [
      tasks,
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
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace должен использоваться внутри WorkspaceProvider');
  return ctx;
}