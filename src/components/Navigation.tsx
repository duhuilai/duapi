import React from 'react';
import { useApi } from '../store/ApiContext';

export default function Navigation() {
  const { state, dispatch } = useApi();

  return (
    <nav style={styles.nav}>
      {/* 品牌区域 */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>⚡</span>
        <span style={styles.brandText}>duApi</span>
      </div>

      {/* 分段控件 */}
      <div style={styles.segments}>
        <button
          style={{
            ...styles.segmentBtn,
            background: state.activePage === 'workspace'
              ? 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)'
              : 'transparent',
            color: state.activePage === 'workspace' ? '#FFFFFF' : '#6B7280',
            fontWeight: state.activePage === 'workspace' ? 600 : 400,
            boxShadow: state.activePage === 'workspace'
              ? '0 2px 8px rgba(30, 64, 175, 0.35), 0 0 0 2px rgba(59, 130, 246, 0.2)'
              : 'none',
          }}
          onClick={() => dispatch({ type: 'SET_PAGE', payload: 'workspace' })}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          工作台
        </button>
        <button
          style={{
            ...styles.segmentBtn,
            background: state.activePage === 'export'
              ? 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)'
              : 'transparent',
            color: state.activePage === 'export' ? '#FFFFFF' : '#6B7280',
            fontWeight: state.activePage === 'export' ? 600 : 400,
            boxShadow: state.activePage === 'export'
              ? '0 2px 8px rgba(30, 64, 175, 0.35), 0 0 0 2px rgba(59, 130, 246, 0.2)'
              : 'none',
          }}
          onClick={() => dispatch({ type: 'SET_PAGE', payload: 'export' })}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          文档导出
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    WebkitAppRegion: 'drag' as any,
    userSelect: 'none',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    WebkitAppRegion: 'no-drag' as any,
  },
  brandIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  brandText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1E3A8A',
    letterSpacing: -0.5,
  },
  segments: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    WebkitAppRegion: 'no-drag' as any,
  },
  segmentBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 18px',
    borderRadius: 8,
    fontSize: 13.5,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    position: 'relative' as any,
    whiteSpace: 'nowrap' as any,
  },
};
