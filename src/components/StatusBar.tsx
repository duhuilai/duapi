import React from 'react';
import { useApi } from '../store/ApiContext';

export default function StatusBar() {
  const { state, resolveVars } = useApi();
  const { request, response, activeEndpointId, groups } = state;

  const activeEndpoint = groups.flatMap(g => g.endpoints).find(e => e.id === activeEndpointId);
  const method = request.method;
  const path = activeEndpoint?.url ? resolveVars(activeEndpoint.url) : resolveVars(request.url);
  const lastRun = response ? new Date(response.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.dot} />
        <span>已连接</span>
        <span style={styles.sep}>|</span>
        <span style={styles.path}>{method} {path}</span>
      </div>
      <div style={styles.right}>
        <span>上次运行 {lastRun}</span>
        {response && (
          <>
            <span style={styles.sep}>|</span>
            <span>{response.status} {response.responseTime}ms</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
    background: '#1E40AF',
    padding: '0 12px',
    fontSize: 10,
    color: '#DBEAFE',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    background: '#DCFCE7',
    borderRadius: '50%',
  },
  path: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 400,
  },
  sep: {
    opacity: 0.4,
  },
};
