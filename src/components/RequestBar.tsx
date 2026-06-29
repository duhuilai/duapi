import React from 'react';
import { useApi } from '../store/ApiContext';
import type { HttpMethod } from '../types';

export default function RequestBar() {
  const { state, dispatch, resolveVars } = useApi();
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const handleSend = async () => {
    dispatch({ type: 'SET_REQUESTING', payload: true });

    try {
      const resolvedUrl = resolveVars(state.request.url);

      // Build headers from the header list
      const headers: Record<string, string> = {};
      state.request.headers
        .filter(h => h.enabled && h.key)
        .forEach(h => {
          headers[h.key] = resolveVars(h.value);
        });

      // Add auth header
      if (state.request.auth.type === 'bearer' && state.request.auth.bearerToken) {
        headers['Authorization'] = `Bearer ${resolveVars(state.request.auth.bearerToken)}`;
      } else if (state.request.auth.type === 'basic' && state.request.auth.basicUsername) {
        const creds = btoa(`${state.request.auth.basicUsername}:${state.request.auth.basicPassword || ''}`);
        headers['Authorization'] = `Basic ${creds}`;
      }

      // Build query params
      const url = new URL(resolvedUrl);
      state.request.params
        .filter(p => p.enabled && p.name)
        .forEach(p => {
          url.searchParams.set(p.name, resolveVars(p.value));
        });
      const finalUrl = url.toString();

      const body = state.request.bodyType !== 'none' ? state.request.body : undefined;

      // Use Electron IPC if available, otherwise fallback to fetch
      if (window.electronAPI) {
        const result = await window.electronAPI.httpRequest({
          method: state.request.method,
          url: finalUrl,
          headers,
          body,
        });

        if (result.success) {
          dispatch({
            type: 'SET_RESPONSE',
            payload: {
              body: result.body,
              status: result.status,
              statusText: result.statusText,
              headers: result.headers,
              responseTime: result.responseTime,
              timestamp: Date.now(),
            },
          });
        } else {
          dispatch({
            type: 'SET_RESPONSE',
            payload: {
              body: JSON.stringify({ error: result.error }, null, 2),
              status: 0,
              statusText: 'Error',
              headers: {},
              responseTime: 0,
              timestamp: Date.now(),
            },
          });
        }
      } else {
        // Browser fallback (dev mode without Electron)
        const startTime = Date.now();
        const fetchOptions: RequestInit = {
          method: state.request.method,
          headers,
        };
        if (body && state.request.method !== 'GET' && state.request.method !== 'HEAD') {
          fetchOptions.body = body;
        }
        const res = await fetch(finalUrl, fetchOptions);
        const responseTime = Date.now() - startTime;
        const resBody = await res.text();
        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { resHeaders[k] = v; });

        dispatch({
          type: 'SET_RESPONSE',
          payload: {
            body: resBody,
            status: res.status,
            statusText: res.statusText,
            headers: resHeaders,
            responseTime,
            timestamp: Date.now(),
          },
        });
      }
    } catch (err: any) {
      dispatch({
        type: 'SET_RESPONSE',
        payload: {
          body: JSON.stringify({ error: err.message || '请求失败' }, null, 2),
          status: 0,
          statusText: 'Error',
          headers: {},
          responseTime: 0,
          timestamp: Date.now(),
        },
      });
    } finally {
      dispatch({ type: 'SET_REQUESTING', payload: false });
    }
  };

  return (
    <div style={styles.bar}>
      <select
        style={styles.methodSelect}
        value={state.request.method}
        onChange={e => dispatch({ type: 'SET_REQUEST', payload: { method: e.target.value as HttpMethod } })}
      >
        {methods.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <input
        style={styles.urlInput}
        type="text"
        value={state.request.url}
        onChange={e => dispatch({ type: 'SET_REQUEST', payload: { url: e.target.value } })}
        placeholder="输入请求 URL，使用 {{变量}} 语法..."
      />
      <button
        style={{
          ...styles.sendBtn,
          opacity: state.isRequesting ? 0.7 : 1,
          cursor: state.isRequesting ? 'wait' : 'pointer',
        }}
        onClick={handleSend}
        disabled={state.isRequesting}
      >
        {state.isRequesting ? '发送中...' : '发送'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderBottom: '1px solid #DBEAFE',
    background: '#FFFFFF',
  },
  methodSelect: {
    width: 80,
    height: 32,
    background: '#DBEAFE',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#1E40AF',
    cursor: 'pointer',
    outline: 'none',
    padding: '0 4px',
  },
  urlInput: {
    flex: 1,
    height: 32,
    background: '#E9EEF6',
    border: 'none',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 13,
    color: '#1E3A8A',
    outline: 'none',
  },
  sendBtn: {
    width: 80,
    height: 32,
    background: '#1E40AF',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    transition: 'opacity 0.15s',
  },
};
