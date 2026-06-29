import React, { useState, useRef, useEffect } from 'react';
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

  // 重命名状态
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(null);
  const [editingEndpointName, setEditingEndpointName] = useState('');
  // hover 状态，用于显示操作按钮
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const [hoverEndpointId, setHoverEndpointId] = useState<string | null>(null);

  const groupInputRef = useRef<HTMLInputElement>(null);
  const epInputRef = useRef<HTMLInputElement>(null);
  const searchMatchRef = useRef<HTMLDivElement>(null);

  // 搜索时自动展开匹配的分组并记录首个匹配项
  let firstMatchId = '';
  const filteredGroups = state.groups.map(group => {
    const matched = group.endpoints.filter(ep =>
      state.searchQuery === '' ||
      ep.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ep.url.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    if (state.searchQuery && matched.length > 0 && !firstMatchId) {
      firstMatchId = matched[0].id;
    }
    return { ...group, endpoints: matched };
  });

  // 搜索时自动展开匹配的分组并滚动到首个匹配项
  useEffect(() => {
    if (state.searchQuery) {
      state.groups.forEach(group => {
        const hasMatch = group.endpoints.some(ep =>
          ep.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          ep.url.toLowerCase().includes(state.searchQuery.toLowerCase())
        );
        if (hasMatch && group.collapsed) {
          dispatch({ type: 'TOGGLE_GROUP', payload: group.id });
        }
      });
      setTimeout(() => {
        const el = document.querySelector('[data-search-match="true"]');
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 120);
    }
  }, [state.searchQuery]);

  // ---- 分组重命名 ----
  const startEditGroup = (id: string, name: string) => {
    setEditingGroupId(id);
    setEditingGroupName(name);
    setTimeout(() => groupInputRef.current?.select(), 30);
  };
  const commitGroupName = () => {
    if (editingGroupId && editingGroupName.trim()) {
      dispatch({ type: 'RENAME_GROUP', payload: { id: editingGroupId, name: editingGroupName.trim() } });
    }
    setEditingGroupId(null);
  };

  // ---- 接口重命名 ----
  const startEditEndpoint = (id: string, name: string) => {
    setEditingEndpointId(id);
    setEditingEndpointName(name);
    setTimeout(() => epInputRef.current?.select(), 30);
  };
  const commitEndpointName = () => {
    if (editingEndpointId && editingEndpointName.trim()) {
      dispatch({ type: 'RENAME_ENDPOINT', payload: { endpointId: editingEndpointId, name: editingEndpointName.trim() } });
    }
    setEditingEndpointId(null);
  };

  // ---- 删除确认 ----
  const confirmDeleteGroup = (groupId: string, groupName: string) => {
    if (window.confirm(`确定删除分组「${groupName}」及其所有接口吗？`)) {
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
    }
  };
  const confirmDeleteEndpoint = (groupId: string, epId: string, epName: string) => {
    if (window.confirm(`确定删除接口「${epName}」吗？`)) {
      dispatch({ type: 'DELETE_ENDPOINT', payload: { groupId, endpointId: epId } });
    }
  };

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>duapi</div>
          {/* 新建分组按钮 */}
          <button
            title="新建分组"
            style={styles.addGroupBtn}
            onClick={() => dispatch({ type: 'ADD_GROUP' })}
          >
            <span style={styles.addGroupIcon}>+</span>
            <span style={{ fontSize: 11 }}>分组</span>
          </button>
        </div>
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

      {/* Group list */}
      <div style={styles.content}>
        {filteredGroups.map(group => (
          <div key={group.id} style={styles.group}>
            {/* Group header row */}
            <div
              style={{
                ...styles.groupHeader,
                background: hoverGroupId === group.id ? '#EFF6FF' : 'transparent',
              }}
              onMouseEnter={() => setHoverGroupId(group.id)}
              onMouseLeave={() => setHoverGroupId(null)}
            >
              {/* 折叠箭头 */}
              <span
                style={{
                  ...styles.arrow,
                  transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
                onClick={() => dispatch({ type: 'TOGGLE_GROUP', payload: group.id })}
              >▼</span>

              {/* 图标 */}
              <div
                style={{ ...styles.groupIcon, background: group.iconColor }}
                onClick={() => dispatch({ type: 'TOGGLE_GROUP', payload: group.id })}
              >
                {group.icon}
              </div>

              {/* 分组名（双击重命名） */}
              {editingGroupId === group.id ? (
                <input
                  ref={groupInputRef}
                  value={editingGroupName}
                  style={styles.renameInput}
                  onChange={e => setEditingGroupName(e.target.value)}
                  onBlur={commitGroupName}
                  onKeyDown={e => { if (e.key === 'Enter') commitGroupName(); if (e.key === 'Escape') setEditingGroupId(null); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  style={styles.groupName}
                  onDoubleClick={() => startEditGroup(group.id, group.name)}
                  onClick={() => dispatch({ type: 'TOGGLE_GROUP', payload: group.id })}
                  title="双击重命名"
                >
                  {group.name}
                </span>
              )}

              <span style={styles.groupCount}>{group.endpoints.length}</span>

              {/* 操作按钮：hover 时显示 */}
              {hoverGroupId === group.id && editingGroupId !== group.id && (
                <div style={styles.groupActions} onClick={e => e.stopPropagation()}>
                  {/* 新增接口 */}
                  <button
                    title="在此分组下新建接口"
                    style={styles.actionBtn}
                    onClick={() => dispatch({ type: 'ADD_ENDPOINT', payload: group.id })}
                  >＋</button>
                  {/* 删除分组 */}
                  <button
                    title="删除分组"
                    style={{ ...styles.actionBtn, color: '#DC2626' }}
                    onClick={() => confirmDeleteGroup(group.id, group.name)}
                  >✕</button>
                </div>
              )}
            </div>

            {/* Endpoint list */}
            {!group.collapsed && (
              <div style={styles.apiList}>
                {group.endpoints.map((ep, epi) => {
                  const mc = methodColors[ep.method] || methodColors.GET;
                  const isActive = state.activeEndpointId === ep.id;
                  const isHover = hoverEndpointId === ep.id;
                  const isSearchMatch = ep.id === firstMatchId;
                  return (
                    <div
                      key={ep.id}
                      data-search-match={isSearchMatch || undefined}
                      style={{
                        ...styles.apiItem,
                        background: isActive ? '#DBEAFE'
                          : isSearchMatch ? '#FEF3C7'
                          : isHover ? '#F0F7FF'
                          : 'transparent',
                        outline: isSearchMatch ? '2px solid #F59E0B' : undefined,
                        outlineOffset: -2,
                      }}
                      onClick={() => dispatch({ type: 'SELECT_ENDPOINT', payload: ep.id })}
                      onMouseEnter={() => setHoverEndpointId(ep.id)}
                      onMouseLeave={() => setHoverEndpointId(null)}
                    >
                      <span style={{ ...styles.methodBadge, background: mc.bg, color: mc.text }}>
                        {ep.method}
                      </span>

                      {/* 接口名（双击重命名） */}
                      {editingEndpointId === ep.id ? (
                        <input
                          ref={epInputRef}
                          value={editingEndpointName}
                          style={{ ...styles.renameInput, flex: 1 }}
                          onChange={e => setEditingEndpointName(e.target.value)}
                          onBlur={commitEndpointName}
                          onKeyDown={e => { if (e.key === 'Enter') commitEndpointName(); if (e.key === 'Escape') setEditingEndpointId(null); }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          style={styles.apiName}
                          onDoubleClick={e => { e.stopPropagation(); startEditEndpoint(ep.id, ep.name); }}
                          title="双击重命名"
                        >
                          {ep.name}
                        </span>
                      )}

                      {/* 删除接口按钮：hover 时显示 */}
                      {isHover && editingEndpointId !== ep.id && (
                        <button
                          title="删除接口"
                          style={{ ...styles.actionBtn, color: '#DC2626', marginLeft: 'auto', flexShrink: 0 }}
                          onClick={e => { e.stopPropagation(); confirmDeleteEndpoint(group.id, ep.id, ep.name); }}
                        >✕</button>
                      )}
                    </div>
                  );
                })}

                {/* 快速添加接口行 */}
                <div
                  style={styles.addEndpointRow}
                  onClick={() => dispatch({ type: 'ADD_ENDPOINT', payload: group.id })}
                  title="新建接口"
                >
                  <span style={styles.addEndpointIcon}>＋</span>
                  <span style={styles.addEndpointText}>新建接口</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 无分组时的提示 */}
        {state.groups.length === 0 && (
          <div style={styles.emptyHint}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>还没有分组</div>
            <button
              style={styles.emptyAddBtn}
              onClick={() => dispatch({ type: 'ADD_GROUP' })}
            >
              ＋ 新建分组
            </button>
          </div>
        )}
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
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1E40AF',
  },
  addGroupBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 8px',
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: 5,
    color: '#1E40AF',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  },
  addGroupIcon: {
    fontSize: 14,
    lineHeight: 1,
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
    padding: '5px 6px',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'background 0.12s',
  },
  arrow: {
    fontSize: 10,
    color: '#64748B',
    transition: 'transform 0.2s',
    display: 'inline-block',
    flexShrink: 0,
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
    flexShrink: 0,
  },
  groupName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#1E3A8A',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  groupCount: {
    fontSize: 10,
    color: '#94A3B8',
    flexShrink: 0,
  },
  groupActions: {
    display: 'flex',
    gap: 2,
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 3,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    border: '1px solid #93C5FD',
    borderRadius: 3,
    padding: '1px 4px',
    outline: 'none',
    background: '#fff',
    minWidth: 0,
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
    transition: 'background 0.12s',
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
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  addEndpointRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#64748B',
    transition: 'background 0.12s',
  },
  addEndpointIcon: {
    fontSize: 14,
    lineHeight: 1,
    color: '#94A3B8',
  },
  addEndpointText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyHint: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  emptyAddBtn: {
    padding: '6px 14px',
    background: '#1E40AF',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    fontSize: 12,
    cursor: 'pointer',
  },
};
