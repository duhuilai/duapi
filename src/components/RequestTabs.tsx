import React, { useState } from 'react';
import { useApi } from '../store/ApiContext';

type TabName = 'params' | 'headers' | 'auth' | 'body' | 'prescript' | 'tests';

export default function RequestTabs() {
  const { state, dispatch } = useApi();
  const [activeTab, setActiveTab] = useState<TabName>('params');

  const tabs: { key: TabName; label: string }[] = [
    { key: 'params', label: 'Params' },
    { key: 'headers', label: 'Headers' },
    { key: 'auth', label: 'Auth' },
    { key: 'body', label: 'Body' },
    { key: 'prescript', label: 'Pre-script' },
    { key: 'tests', label: 'Tests' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'params': return <ParamsEditor />;
      case 'headers': return <HeadersEditor />;
      case 'auth': return <AuthEditor />;
      case 'body': return <BodyEditor />;
      case 'prescript': return <PreScriptEditor />;
      case 'tests': return <TestsEditor />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <div
            key={tab.key}
            style={{
              ...styles.tab,
              color: activeTab === tab.key ? '#1E40AF' : '#64748B',
              borderBottomColor: activeTab === tab.key ? '#1E40AF' : 'transparent',
              fontWeight: activeTab === tab.key ? 500 : 400,
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div style={styles.body}>
        {renderContent()}
      </div>
    </div>
  );
}

// ------- Params Editor -------

function ParamsEditor() {
  const { state, dispatch } = useApi();
  const { params } = state.request;

  return (
    <div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 32 }}></th>
            <th style={styles.th}>参数名</th>
            <th style={styles.th}>参数值</th>
            <th style={styles.th}>描述</th>
            <th style={{ ...styles.th, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {params.map(p => (
            <tr key={p.id}>
              <td style={styles.td}>
                <span
                  style={{ color: p.enabled ? '#16A34A' : '#CBD5E1', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => dispatch({ type: 'UPDATE_PARAM', payload: { id: p.id, field: 'enabled', value: !p.enabled } })}
                >
                  {p.enabled ? '✓' : '○'}
                </span>
              </td>
              <td style={styles.td}>
                <input
                  style={styles.cellInput}
                  value={p.name}
                  onChange={e => dispatch({ type: 'UPDATE_PARAM', payload: { id: p.id, field: 'name', value: e.target.value } })}
                  placeholder="参数名"
                />
              </td>
              <td style={styles.td}>
                <input
                  style={{ ...styles.cellInput, color: '#1E40AF' }}
                  value={p.value}
                  onChange={e => dispatch({ type: 'UPDATE_PARAM', payload: { id: p.id, field: 'value', value: e.target.value } })}
                  placeholder="参数值"
                />
              </td>
              <td style={styles.td}>
                <input
                  style={{ ...styles.cellInput, color: '#64748B' }}
                  value={p.description}
                  onChange={e => dispatch({ type: 'UPDATE_PARAM', payload: { id: p.id, field: 'description', value: e.target.value } })}
                  placeholder="描述"
                />
              </td>
              <td style={styles.td}>
                <span
                  style={{ color: '#DC2626', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => dispatch({ type: 'REMOVE_PARAM', payload: p.id })}
                >×</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={styles.addRow} onClick={() => dispatch({ type: 'ADD_PARAM' })}>
        <span>+</span>
        <span>添加参数</span>
      </div>
    </div>
  );
}

// ------- Headers Editor -------

function HeadersEditor() {
  const { state, dispatch } = useApi();
  const { headers } = state.request;

  return (
    <div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 32 }}></th>
            <th style={styles.th}>Key</th>
            <th style={styles.th}>Value</th>
            <th style={styles.th}>Description</th>
            <th style={{ ...styles.th, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {headers.map(h => (
            <tr key={h.id}>
              <td style={styles.td}>
                <span
                  style={{ color: h.enabled ? '#16A34A' : '#CBD5E1', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => dispatch({ type: 'UPDATE_HEADER', payload: { id: h.id, field: 'enabled', value: !h.enabled } })}
                >
                  {h.enabled ? '✓' : '○'}
                </span>
              </td>
              <td style={styles.td}>
                <input
                  style={styles.cellInput}
                  value={h.key}
                  onChange={e => dispatch({ type: 'UPDATE_HEADER', payload: { id: h.id, field: 'key', value: e.target.value } })}
                  placeholder="Header Key"
                />
              </td>
              <td style={styles.td}>
                <input
                  style={{ ...styles.cellInput, color: '#1E40AF' }}
                  value={h.value}
                  onChange={e => dispatch({ type: 'UPDATE_HEADER', payload: { id: h.id, field: 'value', value: e.target.value } })}
                  placeholder="Header Value"
                />
              </td>
              <td style={styles.td}>
                <input
                  style={{ ...styles.cellInput, color: '#64748B' }}
                  value={h.description}
                  onChange={e => dispatch({ type: 'UPDATE_HEADER', payload: { id: h.id, field: 'description', value: e.target.value } })}
                  placeholder="描述"
                />
              </td>
              <td style={styles.td}>
                <span
                  style={{ color: '#DC2626', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => dispatch({ type: 'REMOVE_HEADER', payload: h.id })}
                >×</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={styles.addRow} onClick={() => dispatch({ type: 'ADD_HEADER' })}>
        <span>+</span>
        <span>添加 Header</span>
      </div>
    </div>
  );
}

// ------- Auth Editor -------

function AuthEditor() {
  const { state, dispatch } = useApi();
  const { auth } = state.request;

  const authTypes = [
    { type: 'none' as const, label: 'No Auth' },
    { type: 'bearer' as const, label: 'Bearer Token' },
    { type: 'basic' as const, label: 'Basic Auth' },
    { type: 'oauth2' as const, label: 'OAuth 2.0' },
  ];

  return (
    <div style={{ padding: 8 }}>
      <div style={styles.authList}>
        {authTypes.map(at => (
          <div
            key={at.type}
            style={{
              ...styles.authItem,
              borderColor: auth.type === at.type ? '#1E40AF' : '#DBEAFE',
              background: auth.type === at.type ? '#DBEAFE' : 'transparent',
            }}
            onClick={() => dispatch({ type: 'SET_AUTH', payload: { ...auth, type: at.type } })}
          >
            <div style={{
              ...styles.authRadio,
              borderColor: auth.type === at.type ? '#1E40AF' : '#64748B',
            }}>
              {auth.type === at.type && <div style={styles.authRadioInner} />}
            </div>
            <span style={styles.authLabel}>{at.label}</span>
          </div>
        ))}
      </div>

      {auth.type === 'bearer' && (
        <div style={{ marginTop: 16 }}>
          <label style={styles.fieldLabel}>Token</label>
          <input
            style={styles.fieldInput}
            value={auth.bearerToken || ''}
            onChange={e => dispatch({ type: 'SET_AUTH', payload: { ...auth, bearerToken: e.target.value } })}
            placeholder="输入 Bearer Token..."
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={styles.fieldLabel}>Username</label>
            <input
              style={styles.fieldInput}
              value={auth.basicUsername || ''}
              onChange={e => dispatch({ type: 'SET_AUTH', payload: { ...auth, basicUsername: e.target.value } })}
              placeholder="用户名"
            />
          </div>
          <div>
            <label style={styles.fieldLabel}>Password</label>
            <input
              style={styles.fieldInput}
              type="password"
              value={auth.basicPassword || ''}
              onChange={e => dispatch({ type: 'SET_AUTH', payload: { ...auth, basicPassword: e.target.value } })}
              placeholder="密码"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ------- Body Editor -------

function BodyEditor() {
  const { state, dispatch } = useApi();
  const bodyTypes = [
    { key: 'none' as const, label: 'none' },
    { key: 'json' as const, label: 'JSON' },
    { key: 'form' as const, label: 'Form' },
    { key: 'raw' as const, label: 'Raw' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
        {bodyTypes.map(bt => (
          <button
            key={bt.key}
            style={{
              ...styles.bodyTypeBtn,
              background: state.request.bodyType === bt.key ? '#DBEAFE' : '#E9EEF6',
              color: state.request.bodyType === bt.key ? '#1E40AF' : '#64748B',
              fontWeight: state.request.bodyType === bt.key ? 600 : 400,
            }}
            onClick={() => dispatch({ type: 'SET_BODY_TYPE', payload: bt.key })}
          >
            {bt.label}
          </button>
        ))}
      </div>
      {state.request.bodyType !== 'none' && (
        <textarea
          style={styles.editor}
          value={state.request.body}
          onChange={e => dispatch({ type: 'SET_BODY', payload: e.target.value })}
          placeholder={state.request.bodyType === 'json' ? '{\n  "key": "value"\n}' : '请求体内容...'}
          spellCheck={false}
        />
      )}
    </div>
  );
}

// ------- Pre-Script Editor -------

function PreScriptEditor() {
  const { state, dispatch } = useApi();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8, padding: '4px 0' }}>
        请求发送前执行的脚本，可用于设置动态变量、签名计算等
      </div>
      <textarea
        style={styles.editor}
        value={state.request.preScript}
        onChange={e => dispatch({ type: 'SET_PRE_SCRIPT', payload: e.target.value })}
        placeholder="// 预执行脚本..."
        spellCheck={false}
      />
    </div>
  );
}

// ------- Tests Editor -------

function TestsEditor() {
  const { state, dispatch } = useApi();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8, padding: '4px 0' }}>
        响应返回后执行的测试脚本，可用于断言状态码、响应体等
      </div>
      <textarea
        style={styles.editor}
        value={state.request.testScript}
        onChange={e => dispatch({ type: 'SET_TEST_SCRIPT', payload: e.target.value })}
        placeholder="// 测试脚本..."
        spellCheck={false}
      />
    </div>
  );
}

// ------- Styles -------

const styles: Record<string, React.CSSProperties> = {
  tabBar: {
    display: 'flex',
    height: 36,
    borderBottom: '1px solid #DBEAFE',
    background: '#FFFFFF',
  },
  tab: {
    padding: '8px 14px',
    fontSize: 12,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
    userSelect: 'none',
  },
  body: {
    flex: 1,
    background: '#FFFFFF',
    padding: 12,
    overflow: 'auto',
    minHeight: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '6px 8px',
    background: '#E9EEF6',
    fontSize: 11,
    fontWeight: 500,
    color: '#64748B',
    borderRadius: 4,
  },
  td: {
    padding: '6px 8px',
    borderBottom: '1px solid #DBEAFE',
    fontSize: 12,
  },
  cellInput: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: '#1E3A8A',
    outline: 'none',
    fontFamily: 'inherit',
  },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    marginTop: 4,
    color: '#1E40AF',
    fontSize: 12,
    cursor: 'pointer',
  },
  authList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  authItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #DBEAFE',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  authRadio: {
    width: 16,
    height: 16,
    border: '2px solid #64748B',
    borderRadius: '50%',
    position: 'relative' as const,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRadioInner: {
    width: 8,
    height: 8,
    background: '#1E40AF',
    borderRadius: '50%',
  },
  authLabel: {
    fontSize: 13,
    color: '#1E3A8A',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: 500,
  },
  fieldInput: {
    width: '100%',
    height: 32,
    background: '#E9EEF6',
    border: '1px solid #DBEAFE',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 12,
    color: '#1E3A8A',
    outline: 'none',
    fontFamily: 'inherit',
  },
  bodyTypeBtn: {
    padding: '4px 12px',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  editor: {
    width: '100%',
    flex: 1,
    minHeight: 250,
    background: '#F1F5F9',
    border: '1px solid #DBEAFE',
    borderRadius: 6,
    padding: 12,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 12,
    lineHeight: 1.6,
    color: '#1E3A8A',
    resize: 'none' as const,
    outline: 'none',
  },
};
