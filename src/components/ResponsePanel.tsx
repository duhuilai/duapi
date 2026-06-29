import React, { useState, useMemo } from 'react';
import { useApi } from '../store/ApiContext';

type RespTab = 'body' | 'headers' | 'cookies';

export default function ResponsePanel() {
  const { state } = useApi();
  const { response, isRequesting } = state;
  const [activeTab, setActiveTab] = useState<RespTab>('body');

  const statusColor = useMemo(() => {
    if (!response) return '#64748B';
    if (response.status >= 200 && response.status < 300) return '#16A34A';
    if (response.status >= 300 && response.status < 400) return '#D97706';
    if (response.status >= 400 && response.status < 500) return '#DC2626';
    return '#DC2626';
  }, [response]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSize = (str: string) => {
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const renderJson = (text: string): React.ReactNode => {
    try {
      const obj = JSON.parse(text);
      return <SyntaxHighlight json={obj} />;
    } catch {
      return <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, fontFamily: 'monospace', color: '#1E3A8A' }}>{text}</pre>;
    }
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>响应</span>
        {response && (
          <span style={{ ...styles.statusBadge, background: statusColor === '#16A34A' ? '#DCFCE7' : '#FEE2E2', color: statusColor }}>
            {response.status} {response.statusText}
          </span>
        )}
        {isRequesting && (
          <span style={{ ...styles.statusBadge, background: '#FEF3C7', color: '#D97706' }}>
            请求中...
          </span>
        )}
      </div>

      <div style={styles.tabBar}>
        {(['body', 'headers', 'cookies'] as RespTab[]).map(tab => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              flex: 1, textAlign: 'center',
              color: activeTab === tab ? '#1E40AF' : '#64748B',
              borderBottomColor: activeTab === tab ? '#1E40AF' : 'transparent',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'body' ? 'Body' : tab === 'headers' ? 'Headers' : 'Cookies'}
          </div>
        ))}
      </div>

      <div style={styles.body}>
        {activeTab === 'body' && response && (
          <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6 }}>
            {renderJson(response.body)}
          </div>
        )}
        {activeTab === 'body' && !response && !isRequesting && (
          <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: 40 }}>
            点击「发送」按钮发送请求
          </div>
        )}

        {activeTab === 'headers' && response && (
          <div>
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9', display: 'flex' }}>
                <span style={{ fontWeight: 500, color: '#1E40AF', fontSize: 12, minWidth: 140 }}>{key}</span>
                <span style={{ color: '#64748B', fontSize: 12, wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cookies' && (
          <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: 40 }}>
            Cookie 管理功能即将上线
          </div>
        )}
      </div>

      {response && (
        <div style={styles.footer}>
          <span>⏱ {formatTime(response.responseTime)}</span>
          <span>📦 {formatSize(response.body)}</span>
        </div>
      )}
    </aside>
  );
}

// Simple syntax-highlighted JSON renderer
function SyntaxHighlight({ json }: { json: unknown }) {
  const render = (value: unknown, key?: string, indent = 0): React.ReactNode => {
    const pad = '  '.repeat(indent);

    if (value === null) return <span style={{ color: '#7C3AED' }}>null</span>;
    if (typeof value === 'boolean') return <span style={{ color: '#7C3AED' }}>{value ? 'true' : 'false'}</span>;
    if (typeof value === 'number') return <span style={{ color: '#D97706' }}>{value}</span>;
    if (typeof value === 'string') return <span style={{ color: '#16A34A' }}>"{value}"</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      return (
        <div>
          <span>[</span>
          {value.map((item, i) => (
            <div key={i}>
              <span>{pad}  </span>
              {render(item, undefined, indent + 1)}
              {i < value.length - 1 ? <span>,</span> : null}
            </div>
          ))}
          <span>{pad}]</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return <span>{'{}'}</span>;
      return (
        <div>
          <span>{'{'}</span>
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span>{pad}  </span>
              <span style={{ color: '#1E40AF' }}>"{k}"</span>
              <span>: </span>
              {render(v, k, indent + 1)}
              {i < entries.length - 1 ? <span>,</span> : null}
            </div>
          ))}
          <span>{pad}{'}'}</span>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return <div style={{ whiteSpace: 'pre' }}>{render(json)}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 320,
    minWidth: 320,
    background: '#FFFFFF',
    borderLeft: '1px solid #DBEAFE',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #DBEAFE',
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1E3A8A',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
  },
  tabBar: {
    display: 'flex',
    height: 32,
    borderBottom: '1px solid #DBEAFE',
  },
  tab: {
    padding: '6px',
    fontSize: 11,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    userSelect: 'none',
  },
  body: {
    flex: 1,
    background: '#F8FAFC',
    padding: 12,
    overflow: 'auto',
    minHeight: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderTop: '1px solid #DBEAFE',
    fontSize: 11,
    color: '#64748B',
    background: '#FFFFFF',
  },
};
