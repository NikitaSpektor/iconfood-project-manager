import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  CHANNELS,
  CURRENT_USER,
  TASKS,
  type Channel,
  type ChatMessage,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import { toast } from '@/hooks/use-toast';

interface WorkspaceValue {
  tasks: Task[];
  channels: Channel[];
  moveTask: (taskId: string, column: ColumnId) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  createTask: (task: Omit<Task, 'id'>) => void;
  sendMessage: (channelId: string, text: string) => void;
  readChannel: (channelId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);

  const moveTask = useCallback((taskId: string, column: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column } : t)),
    );
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
  }, []);

  const createTask = useCallback((task: Omit<Task, 'id'>) => {
    const id = `t${Date.now()}`;
    setTasks((prev) => [{ ...task, id }, ...prev]);
    toast({
      title: 'Задача создана',
      description: `Уведомление отправлено на почту: ${task.assignee}`,
    });
  }, []);

  const sendMessage = useCallback((channelId: string, text: string) => {
    const message: ChatMessage = {
      id: `m${Date.now()}`,
      author: CURRENT_USER,
      text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      own: true,
    };
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, messages: [...c.messages, message] } : c,
      ),
    );
  }, []);

  const readChannel = useCallback((channelId: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)),
    );
  }, []);

  const value = useMemo(
    () => ({ tasks, channels, moveTask, toggleSubtask, createTask, sendMessage, readChannel }),
    [tasks, channels, moveTask, toggleSubtask, createTask, sendMessage, readChannel],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace должен использоваться внутри WorkspaceProvider');
  return ctx;
}
