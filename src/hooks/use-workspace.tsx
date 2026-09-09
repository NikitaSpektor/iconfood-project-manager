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
    () => ({ tasks, channels, loading, user, moveTask, toggleSubtask, createTask, sendMessage, readChannel }),
    [tasks, channels, loading, user, moveTask, toggleSubtask, createTask, sendMessage, readChannel],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace должен использоваться внутри WorkspaceProvider');
  return ctx;
}