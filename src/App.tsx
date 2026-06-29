import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApiProvider, useApi } from './store/ApiContext';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import RequestBar from './components/RequestBar';
import RequestTabs from './components/RequestTabs';
import ResponsePanel from './components/ResponsePanel';
import StatusBar from './components/StatusBar';
import ExportPage from './components/ExportPage';

// ---- 可拖拽分隔条 ----

function useDragger(options: {
  direction: 'horizontal' | 'vertical';
  containerRef: React.RefObject<HTMLDivElement | null>;
  minSize: number;
  maxSize: number;
  defaultSize: number;
  onResize: (size: number) => void;
}) {
  const { direction, containerRef, minSize, maxSize, defaultSize, onResize } = options;
  const [dragging, setDragging] = useState(false);
  const sizeRef = useRef(defaultSize);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    sizeRef.current = defaultSize;

    const startPos = direction === 'vertical' ? e.clientX : e.clientY;
    const container = containerRef.current;
    const containerSize = direction === 'vertical'
      ? container?.getBoundingClientRect().width ?? window.innerWidth
      : container?.getBoundingClientRect().height ?? window.innerHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const rawDelta = direction === 'vertical'
        ? ev.clientX - startPos
        : ev.clientY - startPos;
      // horizontal 拖拽方向：向上拖 → 响应面板增高
      const delta = direction === 'horizontal' ? -rawDelta : rawDelta;
      const newSize = Math.min(maxSize, Math.max(minSize, sizeRef.current + delta));
      onResize(newSize);
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [direction, containerRef, minSize, maxSize, defaultSize, onResize]);

  return { dragging, onMouseDown };
}

// ---- Workspace 页面 ----

function WorkspacePage() {
  const { state, dispatch } = useApi();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [responseHeight, setResponseHeight] = useState(340);
  const [showDesc, setShowDesc] = useState(false);
  const [toast, setToast] = useState('');
  const prevSavedTick = useRef(state.savedTick);

  // 保存成功后显示 toast
  useEffect(() => {
    if (state.savedTick > prevSavedTick.current && prevSavedTick.current > 0) {
      setToast('✓ 已保存');
      const timer = setTimeout(() => setToast(''), 2000);
      prevSavedTick.current = state.savedTick;
      return () => clearTimeout(timer);
    }
    prevSavedTick.current = state.savedTick;
  }, [state.savedTick]);

  const sidebarDragger = useDragger({
    direction: 'vertical',
    containerRef: workspaceRef,
    minSize: 180,
    maxSize: 480,
    defaultSize: sidebarWidth,
    onResize: setSidebarWidth,
  });

  const responseDragger = useDragger({
    direction: 'horizontal',
    containerRef: workspaceRef,
    minSize: 120,
    maxSize: 800,
    defaultSize: responseHeight,
    onResize: setResponseHeight,
  });

  return (
    <div ref={workspaceRef} style={styles.workspace}>
      {/* ── 左侧：接口列表 ── */}
      <div style={{ width: sidebarWidth, minWidth: sidebarWidth, height: '100%', flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* ── 侧边栏拖拽手柄 ── */}
      <div
        style={{
          ...styles.dragHandleV,
          cursor: sidebarDragger.dragging ? 'col-resize' : 'col-resize',
          background: sidebarDragger.dragging ? '#93C5FD' : undefined,
        }}
        onMouseDown={sidebarDragger.onMouseDown}
      />

      {/* ── 右侧：请求调试 + 响应面板 ── */}
      <div style={styles.rightArea}>
        {/* 上半部分：请求调试 */}
        <div style={styles.requestArea}>
          <RequestBar onSaved={() => {}} />
          {/* ── 接口描述 ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 6,
          }}>
            <span
              style={{
                fontSize: 11,
                color: '#64748B',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 500,
              }}
              onClick={() => setShowDesc(!showDesc)}
            >
              {showDesc ? '▾' : '▸'} 接口说明
            </span>
            {state.request.description && !showDesc && (
              <span style={{
                fontSize: 11,
                color: '#94A3B8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {state.request.description}
              </span>
            )}
          </div>
          {showDesc && (
            <textarea
              style={{
                width: 'calc(100% - 32px)',
                margin: '0 16px 4px',
                height: 48,
                border: '1px solid #DBEAFE',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontFamily: 'inherit',
                color: '#1E3A8A',
                background: '#F8FAFC',
                resize: 'vertical',
                outline: 'none',
              }}
              value={state.request.description}
              onChange={e => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
              placeholder="接口的总体描述，如：获取指定用户的详细信息，包括角色和权限..."
            />
          )}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <RequestTabs />
          </div>
          <StatusBar />
        </div>

        {/* ── 水平拖拽手柄 ── */}
        <div
          style={{
            ...styles.dragHandleH,
            cursor: responseDragger.dragging ? 'row-resize' : 'row-resize',
            background: responseDragger.dragging ? '#93C5FD' : undefined,
          }}
          onMouseDown={responseDragger.onMouseDown}
        />

        {/* 下半部分：响应面板 */}
        <div style={{ height: responseHeight, minHeight: responseHeight, flexShrink: 0 }}>
          <ResponsePanel />
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && <div style={styles.toast}>{toast}</div>}
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
  rightArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  requestArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 150,
    overflow: 'hidden',
  },
  dragHandleV: {
    width: 4,
    flexShrink: 0,
    background: 'transparent',
    transition: 'background 0.15s',
    zIndex: 10,
  },
  dragHandleH: {
    height: 4,
    flexShrink: 0,
    background: 'transparent',
    transition: 'background 0.15s',
    zIndex: 10,
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1E3A8A',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.3)',
  },
};
