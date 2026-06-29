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
  const { state } = useApi();

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
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
