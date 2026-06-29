import React from 'react';
import { ApiProvider, useApi } from './store/ApiContext';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import RequestBar from './components/RequestBar';
import RequestTabs from './components/RequestTabs';
import ResponsePanel from './components/ResponsePanel';
import StatusBar from './components/StatusBar';
import ExportPage from './components/ExportPage';

function WorkspacePage() {
  return (
    <div style={styles.workspace}>
      <Sidebar />
      <main style={styles.main}>
        <RequestBar />
        <RequestTabs />
        <StatusBar />
      </main>
      <ResponsePanel />
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useApi();

  // Ctrl+S / Cmd+S shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.activeEndpointId) {
          dispatch({ type: 'SAVE_ENDPOINT' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.activeEndpointId, dispatch]);

  return (
    <div style={styles.app}>
      <Navigation />
      {state.activePage === 'workspace' ? <WorkspacePage /> : <ExportPage />}
    </div>
  );
}

export default function App() {
  return (
    <ApiProvider>
      <AppContent />
    </ApiProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    background: '#F8FAFC',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    color: '#1E3A8A',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
};
