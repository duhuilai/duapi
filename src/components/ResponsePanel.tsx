import React, { useState, useMemo } from 'react';
import { useApi } from '../store/ApiContext';
import type { ResponseParam, ErrorCode } from '../types';
import { useColumnResize, resizeHandleStyle } from '../utils/useColumnResize';

type RespTab = 'body' | 'headers' | 'cookies' | 'schema';

export default function ResponsePanel() {
  const { state, dispatch } = useApi();
  const { response, isRequesting, groups, activeEndpointId } = state;
  const [activeTab, setActiveTab] = useState<RespTab>('body');
  const [copied, setCopied] = useState(false);

  const activeEndpoint = useMemo(
    () => groups.flatMap(g => g.endpoints).find(e => e.id === activeEndpointId),
    [groups, activeEndpointId],
  );

  const responseParams = activeEndpoint?.responseParams ?? [];
  const errorCodes = activeEndpoint?.errorCodes ?? [];

  // 列宽拖拽
  const { widths: sw, onResizeStart: onSchemaResize } = useColumnResize({
    path: 160, type: 72, required: 36, desc: 180,
  });
  const { widths: ew, onResizeStart: onEcResize } = useColumnResize({
    code: 90, http: 60, msg: 140, desc: 180,
  });

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

  const handleCopy = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / Electron
      const textarea = document.createElement('textarea');
      textarea.value = response.body;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateSchema = () => {
    dispatch({ type: 'GENERATE_RESPONSE_PARAMS' });
  };

  const handleUpdateParam = (paramId: string, field: string, value: string | boolean) => {
    dispatch({ type: 'UPDATE_RESPONSE_PARAM', payload: { paramId, field, value } });
  };

  const handleAddErrorCode = () => {
    dispatch({ type: 'ADD_ERROR_CODE' });
  };

  const handleUpdateErrorCode = (codeId: string, field: string, value: string | number) => {
    dispatch({ type: 'UPDATE_ERROR_CODE', payload: { codeId, field, value } });
  };

  const handleDeleteErrorCode = (codeId: string) => {
    if (confirm('确定删除此错误码？')) {
      dispatch({ type: 'DELETE_ERROR_CODE', payload: codeId });
    }
  };

  const renderParamRows = (params: ResponseParam[], depth = 0): React.ReactNode[] => {
    const colStyle = (col: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
      width: sw[col], flexShrink: 0, display: 'flex', alignItems: 'center', borderRight: '1px solid #E2E8F0', ...extra,
    });
    const lastColStyle: React.CSSProperties = {
      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
    };
    return params.flatMap(param => {
      const rows: React.ReactNode[] = [];
      rows.push(
        <div key={param.id} style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', padding: '2px 0', minHeight: 30 }}>
          <div style={{ ...colStyle('path'), paddingLeft: 8 + depth * 16, overflow: 'hidden' }}>
            <code style={pathCode}>{param.path || '(unnamed)'}</code>
          </div>
          <div style={colStyle('type')}>
            <span style={typeBadge(param.type)}>{param.type}</span>
          </div>
          <div style={{ ...colStyle('required'), justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={param.required}
              onChange={e => handleUpdateParam(param.id, 'required', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div style={lastColStyle}>
            <input
              style={descInput}
              type="text"
              value={param.description}
              onChange={e => handleUpdateParam(param.id, 'description', e.target.value)}
              placeholder="添加说明..."
            />
          </div>
        </div>
      );
      if (param.children && param.children.length > 0) {
        rows.push(...renderParamRows(param.children, depth + 1));
      }
      return rows;
    });
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>响应</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {response && (
            <button
              style={copyBtn(copied)}
              onClick={handleCopy}
              title="复制响应内容"
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
          )}
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
      </div>

      <div style={styles.tabBar}>
        {([
          ['body', 'Body'],
          ['headers', 'Headers'],
          ['cookies', 'Cookies'],
          ['schema', 'Schema'],
        ] as [RespTab, string][]).map(([tab, label]) => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              flex: tab === 'schema' ? 'none' : 1,
              width: tab === 'schema' ? 64 : undefined,
              textAlign: 'center' as const,
              color: activeTab === tab ? '#1E40AF' : '#64748B',
              borderBottomColor: activeTab === tab ? '#1E40AF' : 'transparent',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {label}
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
          <div style={styles.emptyTip}>
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
        {activeTab === 'headers' && !response && (
          <div style={styles.emptyTip}>暂无响应</div>
        )}

        {activeTab === 'cookies' && (
          <div style={styles.emptyTip}>
            Cookie 管理功能即将上线
          </div>
        )}

        {activeTab === 'schema' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <button
              style={styles.generateBtn}
              onClick={handleGenerateSchema}
              disabled={!response}
              title={!response ? '请先发送请求获取响应' : '从当前响应 JSON 生成字段说明'}
            >
              📋 从响应生成
            </button>

            {responseParams.length === 0 && (
              <div style={styles.emptyTip}>
                点击「从响应生成」按钮，<br />
                自动解析返回的 JSON 结构
              </div>
            )}

            {responseParams.length > 0 && (
              <>
                <div style={{ display: 'flex', borderBottom: '2px solid #DBEAFE', padding: '4px 0', marginBottom: 2 }}>
                  <div style={{ width: sw.path, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', paddingLeft: 8, position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                    字段路径
                    <div style={resizeHandleStyle} onMouseDown={onSchemaResize('path')} />
                  </div>
                  <div style={{ width: sw.type, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                    类型
                    <div style={resizeHandleStyle} onMouseDown={onSchemaResize('type')} />
                  </div>
                  <div style={{ width: sw.required, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', textAlign: 'center', position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                    必填
                    <div style={resizeHandleStyle} onMouseDown={onSchemaResize('required')} />
                  </div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 10, color: '#64748B', position: 'relative' }}>
                    说明
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', maxHeight: 200, overflow: 'auto', minHeight: 0 }}>
                  {renderParamRows(responseParams)}
                </div>
              </>
            )}

            {/* 错误码说明 */}
            <div style={{ marginTop: responseParams.length > 0 ? 16 : 0 }}>
              <div style={ecSectionHeader}>
                <span style={{ fontWeight: 600, fontSize: 12, color: '#1E3A8A' }}>⚠ 错误码说明</span>
                <button style={ecAddBtn} onClick={handleAddErrorCode}>
                  ＋ 添加错误码
                </button>
              </div>

              {errorCodes.length === 0 && (
                <div style={styles.emptyTip}>
                  暂无错误码，点击「添加错误码」管理 API 异常返回
                </div>
              )}

              {errorCodes.length > 0 && (
                <>
                  <div style={{ display: 'flex', borderBottom: '1px solid #DBEAFE', padding: '3px 0', marginBottom: 2 }}>
                    <div style={{ width: ew.code, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', padding: '0 4px', position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                      错误码
                      <div style={resizeHandleStyle} onMouseDown={onEcResize('code')} />
                    </div>
                    <div style={{ width: ew.http, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', padding: '0 4px', position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                      HTTP
                      <div style={resizeHandleStyle} onMouseDown={onEcResize('http')} />
                    </div>
                    <div style={{ width: ew.msg, flexShrink: 0, fontWeight: 600, fontSize: 10, color: '#64748B', padding: '0 4px', position: 'relative', borderRight: '1px solid #E2E8F0' }}>
                      错误信息
                      <div style={resizeHandleStyle} onMouseDown={onEcResize('msg')} />
                    </div>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 10, color: '#64748B', padding: '0 4px', position: 'relative' }}>
                      说明
                    </div>
                    <div style={{ width: 28, flexShrink: 0 }}></div>
                  </div>
                  <div style={{ maxHeight: 220, overflow: 'auto' }}>
                    {errorCodes.map(ec => (
                      <div key={ec.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '2px 0', minHeight: 28 }}>
                        <div style={{ width: ew.code, flexShrink: 0, padding: '0 4px', borderRight: '1px solid #E2E8F0' }}>
                          <input
                            style={ecInput}
                            value={ec.code}
                            onChange={e => handleUpdateErrorCode(ec.id, 'code', e.target.value)}
                            placeholder="如 1001"
                          />
                        </div>
                        <div style={{ width: ew.http, flexShrink: 0, padding: '0 4px', borderRight: '1px solid #E2E8F0' }}>
                          <select
                            style={ecSelect}
                            value={ec.httpStatus}
                            onChange={e => handleUpdateErrorCode(ec.id, 'httpStatus', Number(e.target.value))}
                          >
                            {[400, 401, 403, 404, 405, 408, 409, 422, 429, 500, 502, 503, 504].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ width: ew.msg, flexShrink: 0, padding: '0 4px', borderRight: '1px solid #E2E8F0' }}>
                          <input
                            style={ecInput}
                            value={ec.message}
                            onChange={e => handleUpdateErrorCode(ec.id, 'message', e.target.value)}
                            placeholder="如 Token已过期"
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
                          <input
                            style={ecInput}
                            value={ec.description}
                            onChange={e => handleUpdateErrorCode(ec.id, 'description', e.target.value)}
                            placeholder="详细说明及处理建议"
                          />
                        </div>
                        <div style={{ width: 28, flexShrink: 0 }}>
                          <button
                            style={ecDelBtn}
                            onClick={() => handleDeleteErrorCode(ec.id)}
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {response && (
        <div style={styles.footer}>
          <span>⏱ {formatTime(response.responseTime)}</span>
          <span>📦 {formatSize(response.body)}</span>
          {responseParams.length > 0 && (
            <span>🔖 {responseParams.length} 字段</span>
          )}
        </div>
      )}
    </aside>
  );
}

// ---- Styles ----

const pathCode: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  color: '#1E40AF',
  background: '#EFF6FF',
  padding: '1px 4px',
  borderRadius: 3,
};

const typeBadge = (type: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 500,
  padding: '1px 5px',
  borderRadius: 4,
  background:
    type.startsWith('string') ? '#DCFCE7' :
    type.startsWith('number') || type.startsWith('integer') ? '#FEF3C7' :
    type.startsWith('boolean') ? '#EDE9FE' :
    type.startsWith('array') ? '#DBEAFE' :
    type.startsWith('object') ? '#FEE2E2' :
    type === 'null' ? '#F1F5F9' :
    '#F8FAFC',
  color:
    type.startsWith('string') ? '#16A34A' :
    type.startsWith('number') || type.startsWith('integer') ? '#D97706' :
    type.startsWith('boolean') ? '#7C3AED' :
    type.startsWith('array') ? '#1E40AF' :
    type.startsWith('object') ? '#DC2626' :
    type === 'null' ? '#64748B' :
    '#1E3A8A',
});

const descInput: React.CSSProperties = {
  width: '100%',
  height: 22,
  border: '1px solid #E2E8F0',
  borderRadius: 3,
  padding: '0 4px',
  fontSize: 11,
  color: '#1E3A8A',
  outline: 'none',
  background: '#FFFFFF',
};

// ---- SyntaxHighlight ----

function SyntaxHighlight({ json }: { json: unknown }) {
  const render = (value: unknown, _key?: string, indent = 0): React.ReactNode => {
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

// ---- Styles ----

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    background: '#FFFFFF',
    borderTop: '1px solid #DBEAFE',
    display: 'flex',
    flexDirection: 'column',
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
    padding: '6px 8px',
    fontSize: 11,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    userSelect: 'none' as const,
  },
  body: {
    flex: 1,
    background: '#F8FAFC',
    padding: 12,
    overflow: 'auto',
    minHeight: 0,
  },
  emptyTip: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center' as const,
    padding: 40,
  },
  generateBtn: {
    width: '100%',
    height: 30,
    background: '#1E40AF',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    marginBottom: 10,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderTop: '1px solid #DBEAFE',
    fontSize: 11,
    color: '#64748B',
    background: '#FFFFFF',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
};

// ---- Error Code Styles ----

const ecSectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  paddingBottom: 6,
  borderBottom: '2px solid #DBEAFE',
};

const ecAddBtn: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#1E40AF',
  background: '#EFF6FF',
  border: '1px solid #DBEAFE',
  borderRadius: 4,
  padding: '2px 8px',
  cursor: 'pointer',
};

const ecInput: React.CSSProperties = {
  width: '100%',
  height: 24,
  border: '1px solid #E2E8F0',
  borderRadius: 3,
  padding: '0 4px',
  fontSize: 11,
  color: '#1E3A8A',
  outline: 'none',
  background: '#FFFFFF',
};

const ecSelect: React.CSSProperties = {
  width: '100%',
  height: 24,
  border: '1px solid #E2E8F0',
  borderRadius: 3,
  padding: '0 2px',
  fontSize: 11,
  color: '#1E3A8A',
  outline: 'none',
  background: '#FFFFFF',
  cursor: 'pointer',
};

const ecDelBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 3,
  fontSize: 11,
  color: '#DC2626',
  background: '#FEF2F2',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const copyBtn = (active: boolean): React.CSSProperties => ({
  height: 26,
  padding: '0 10px',
  border: active ? '1px solid #16A34A' : '1px solid #DBEAFE',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 500,
  color: active ? '#16A34A' : '#1E40AF',
  background: active ? '#DCFCE7' : '#EFF6FF',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  transition: 'all 0.15s',
});
