import { useEffect, useState } from 'react';
import { WorkspaceProvider } from '@/hooks/use-workspace';
import LoginScreen from '@/components/workspace/LoginScreen';
import Workspace from '@/components/workspace/Workspace';
import Icon from '@/components/ui/icon';
import { getToken, logout, me, type ApiUser } from '@/lib/api';

const Index = () => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    me()
      .then(setUser)
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="LoaderCircle" size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onEnter={setUser} />;
  }

  return (
    <WorkspaceProvider user={user}>
      <Workspace onLogout={handleLogout} />
    </WorkspaceProvider>
  );
};

export default Index;
