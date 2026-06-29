import React from 'react';
import { useApi } from '../store/ApiContext';

export default function Navigation() {
  const { state, dispatch } = useApi();

  return (
    <nav style={styles.nav}>
      <button
        style={{
          ...styles.btn,
          background: state.activePage === 'workspace' ? '#DBEAFE' : 'transparent',
          color: state.activePage === 'workspace' ? '#1E40AF' : '#64748B',
          fontWeight: state.activePage === 'workspace' ? 500 : 400,
        }}
        onClick={() => dispatch({ type: 'SET_PAGE', payload: 'workspace' })}
      >
        工作台
      </button>
      <button
        style={{
          ...styles.btn,
          background: state.activePage === 'export' ? '#DBEAFE' : 'transparent',
          color: state.activePage === 'export' ? '#1E40AF' : '#64748B',
          fontWeight: state.activePage === 'export' ? 500 : 400,
        }}
        onClick={() => dispatch({ type: 'SET_PAGE', payload: 'export' })}
      >
        文档导出
      </button>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    background: '#FFFFFF',
    borderBottom: '1px solid #DBEAFE',
  },
  btn: {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
};
