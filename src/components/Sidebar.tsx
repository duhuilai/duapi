import React from 'react';
import { useApi } from '../store/ApiContext';

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#DCFCE7', text: '#16A34A' },
  POST: { bg: '#DBEAFE', text: '#1E40AF' },
  PUT: { bg: '#FEF3C7', text: '#D97706' },
  DELETE: { bg: '#FEE2E2', text: '#DC2626' },
  PATCH: { bg: '#F3E8FF', text: '#7C3AED' },
  HEAD: { bg: '#F1F5F9', text: '#64748B' },
  OPTIONS: { bg: '#F1F5F9', text: '#64748B' },
};

export default function Sidebar() {
  const { state, dispatch } = useApi();

  const filteredGroups = state.groups.map(group => ({
    ...group,
    endpoints: group.endpoints.filter(ep =>
      state.searchQuery === '' ||
      ep.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ep.url.toLowerCase().includes(state.searchQuery.toLowerCase())
    ),
  }));

  const env = state.environments.find(e => e.id === state.activeEnvironmentId);

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logo}>duapi</div>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="搜索接口..."
            value={state.searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            style={styles.searchInput}
          />
        </div>
      </div>

      <div style={styles.envBar}>
        <div style={{ ...styles.envDot, background: '#16A34A' }} />
        <select
          style={styles.envSelect}
          value={state.activeEnvironmentId || ''}
          onChange={e => dispatch({ type: 'SET_ENVIRONMENT', payload: e.target.value })}
        >
          {state.environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.content}>
        {filteredGroups.map(group => (
          <div key={group.id} style={styles.group}>
            <div
              style={styles.groupHeader}
              onClick={() => dispatch({ type: 'TOGGLE_GROUP', payload: group.id })}
            >
              <span style={{
                ...styles.arrow,
                transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}>▼</span>
              <div style={{ ...styles.groupIcon, background: group.iconColor }}>
                {group.icon}
              </div>
              <span style={styles.groupName}>{group.name}</span>
              <span style={styles.groupCount}>{group.endpoints.length}</span>
            </div>
            {!group.collapsed && (
              <div style={styles.apiList}>
                {group.endpoints.map(ep => {
                  const mc = methodColors[ep.method] || methodColors.GET;
                  return (
                    <div
                      key={ep.id}
                      style={{
                        ...styles.apiItem,
                        background: state.activeEndpointId === ep.id ? '#DBEAFE' : 'transparent',
                      }}
                      onClick={() => dispatch({ type: 'SELECT_ENDPOINT', payload: ep.id })}
                    >
                      <span style={{ ...styles.methodBadge, background: mc.bg, color: mc.text }}>
                        {ep.method}
                      </span>
                      <span style={styles.apiName}>{ep.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#FFFFFF',
    borderRight: '1px solid #DBEAFE',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #DBEAFE',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1E40AF',
    marginBottom: 12,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: '#E9EEF6',
    borderRadius: 6,
    padding: '6px 10px',
    gap: 6,
  },
  searchIcon: { fontSize: 12 },
  searchInput: {
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: '#1E3A8A',
    outline: 'none',
    width: '100%',
  },
  envBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderBottom: '1px solid #DBEAFE',
  },
  envDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  envSelect: {
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: '#1E3A8A',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 4,
  },
  group: {
    marginBottom: 2,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    cursor: 'pointer',
    borderRadius: 4,
  },
  arrow: {
    fontSize: 10,
    color: '#64748B',
    transition: 'transform 0.2s',
    display: 'inline-block',
  },
  groupIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
  },
  groupName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#1E3A8A',
    flex: 1,
  },
  groupCount: {
    fontSize: 10,
    color: '#94A3B8',
  },
  apiList: {
    paddingLeft: 24,
  },
  apiItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  methodBadge: {
    width: 42,
    height: 18,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  },
  apiName: {
    fontSize: 12,
    color: '#1E3A8A',
  },
};
