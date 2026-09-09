import { useState } from 'react';
import { WorkspaceProvider } from '@/hooks/use-workspace';
import LoginScreen from '@/components/workspace/LoginScreen';
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
import { CURRENT_USER } from '@/data/workspace';

const Index = () => {
  const [user, setUser] = useState<string | null>(CURRENT_USER);
  const [view, setView] = useState<ViewId>('overview');

  if (!user) {
    return <LoginScreen onEnter={setUser} />;
  }

  return (
    <WorkspaceProvider>
      <div className="min-h-screen lg:h-screen bg-background px-4 sm:px-7 pt-5 pb-6 flex flex-col">
        <TopNav view={view} onChange={setView} onLogout={() => setUser(null)} userName={user} />

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
      </div>
    </WorkspaceProvider>
  );
};

export default Index;