import { useState } from 'react';
import TopNav, { type ViewId } from '@/components/workspace/TopNav';
import OverviewView from '@/components/workspace/OverviewView';
import BoardView from '@/components/workspace/BoardView';
import GanttView from '@/components/workspace/GanttView';
import CalendarView from '@/components/workspace/CalendarView';
import ChatView from '@/components/workspace/ChatView';
import ReportsView from '@/components/workspace/ReportsView';
import AiView from '@/components/workspace/AiView';
import MembersView from '@/components/workspace/MembersView';
import SettingsView from '@/components/workspace/SettingsView';
import TaskDialog from '@/components/workspace/TaskDialog';
import { useWorkspace } from '@/hooks/use-workspace';
import { roleLabels, type Role } from '@/data/workspace';

export default function Workspace({ onLogout }: { onLogout: () => void }) {
  const { user, tasks } = useWorkspace();
  const [view, setView] = useState<ViewId>('overview');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;

  return (
    <div className="min-h-screen lg:h-screen bg-background px-4 sm:px-7 pt-5 pb-6 flex flex-col">
      <TopNav
        view={view}
        onChange={setView}
        onLogout={onLogout}
        userName={user.name}
        userRole={`${roleLabels[user.role as Role] ?? 'Участник'} · ${user.restaurant}`}
        onOpenTask={setOpenTaskId}
      />

      <main className="flex-1 min-h-0 flex flex-col mt-1">
        {view === 'overview' && <OverviewView onGo={setView} />}
        {view === 'personal' && <BoardView personal />}
        {view === 'board' && <BoardView personal={false} />}
        {view === 'gantt' && <GanttView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'chat' && <ChatView />}
        {view === 'reports' && <ReportsView />}
        {view === 'ai' && <AiView />}
        {view === 'members' && <MembersView />}
        {view === 'settings' && <SettingsView />}
      </main>

      <TaskDialog task={openTask} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
