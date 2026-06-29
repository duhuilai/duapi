import React from 'react';
import { useApi } from '../store/ApiContext';
import type { ExportFormat } from '../types';

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#DCFCE7', text: '#16A34A' },
  POST: { bg: '#DBEAFE', text: '#1E40AF' },
  PUT: { bg: '#FEF3C7', text: '#D97706' },
  DELETE: { bg: '#FEE2E2', text: '#DC2626' },
  PATCH: { bg: '#F3E8FF', text: '#7C3AED' },
};

const formats: { key: ExportFormat; icon: string; name: string; desc: string; bg: string }[] = [
  { key: 'pdf', icon: 'PDF', name: 'PDF 文档', desc: '适合打印与分享', bg: '#DC2626' },
  { key: 'doc', icon: 'DOC', name: 'Word 文档', desc: '.docx 可二次编辑', bg: '#1E40AF' },
  { key: 'html', icon: 'HTML', name: 'HTML 页面', desc: '浏览器直接查阅', bg: '#7C3AED' },
  { key: 'md', icon: 'MD', name: 'Markdown', desc: '适合 Git 仓库', bg: '#64748B' },
];

export default function ExportPage() {
  const { state, dispatch } = useApi();
  const { groups, exportConfig } = state;

  const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);
  const selectedCount = exportConfig.selectedEndpoints.length;

  const handlePreview = () => {
    const selectedGroups = groups.filter(g => exportConfig.selectedGroups.includes(g.id));
    const selectedEndpoints = groups.flatMap(g =>
      g.endpoints.filter(e => exportConfig.selectedEndpoints.includes(e.id))
    );

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>duapi - API 文档预览</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 40px 20px; color: #1E3A8A; background: #F8FAFC; }
  h1 { color: #1E40AF; border-bottom: 2px solid #DBEAFE; padding-bottom: 12px; }
  h2 { color: #1E40AF; margin-top: 32px; }
  .endpoint { background: #FFF; border: 1px solid #DBEAFE; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .method-GET { background: #DCFCE7; color: #16A34A; }
  .method-POST { background: #DBEAFE; color: #1E40AF; }
  .method-PUT { background: #FEF3C7; color: #D97706; }
  .method-DELETE { background: #FEE2E2; color: #DC2626; }
  .method-PATCH { background: #F3E8FF; color: #7C3AED; }
  .url { font-family: monospace; margin-left: 8px; color: #64748B; }
  pre { background: #F1F5F9; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; padding: 6px 8px; background: #F1F5F9; font-size: 12px; color: #64748B; }
  td { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; font-size: 12px; }
</style></head><body>
<h1>duapi - API 接口文档</h1>
<p>生成时间: ${new Date().toLocaleString('zh-CN')} | 共 ${selectedCount} 个接口</p>`;

    selectedGroups.forEach(group => {
      html += `<h2>${group.name}</h2>`;
      group.endpoints
        .filter(e => exportConfig.selectedEndpoints.includes(e.id))
        .forEach(ep => {
          html += `<div class="endpoint">
  <span class="method method-${ep.method}">${ep.method}</span>
  <span class="url">${ep.url}</span>
  <p>${ep.description || ''}</p>`;
          if (exportConfig.includeParams && ep.params.length > 0) {
            html += `<h4>请求参数</h4><table><tr><th>参数名</th><th>参数值</th><th>描述</th></tr>`;
            ep.params.forEach(p => {
              html += `<tr><td>${p.name}</td><td>${p.value}</td><td>${p.description || ''}</td></tr>`;
            });
            html += `</table>`;
          }
          if (exportConfig.includeResponse && ep.body) {
            html += `<h4>请求示例</h4><pre>${escapeHtml(ep.body)}</pre>`;
          }
          html += `</div>`;
        });
    });

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleExport = () => {
    // Simulate export — in production would generate actual files
    alert(`导出功能：已选择 ${selectedCount} 个接口\n格式: ${exportConfig.formats.join(', ')}\n合并文档: ${exportConfig.mergeDoc ? '是' : '否'}\n\n在 Electron 环境中将支持导出为实际文件。`);
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>选择接口</div>
          <div style={styles.sidebarSub}>勾选需要导出的接口或分组</div>
        </div>
        <div style={styles.sidebarActions}>
          <button style={styles.actionBtnPrimary} onClick={() => dispatch({ type: 'SELECT_ALL_EXPORT' })}>全选</button>
          <button style={styles.actionBtnSecondary} onClick={() => dispatch({ type: 'DESELECT_ALL_EXPORT' })}>取消</button>
        </div>
        <div style={styles.sidebarContent}>
          {groups.map(group => {
            const allSelected = group.endpoints.every(e => exportConfig.selectedEndpoints.includes(e.id));
            const someSelected = group.endpoints.some(e => exportConfig.selectedEndpoints.includes(e.id));
            return (
              <div key={group.id} style={styles.group}>
                <div style={styles.groupHeader} onClick={() => dispatch({ type: 'TOGGLE_EXPORT_GROUP', payload: group.id })}>
                  <span style={{
                    ...styles.arrow,
                    transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}>▼</span>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={e => {
                      e.stopPropagation();
                      dispatch({ type: 'TOGGLE_EXPORT_GROUP', payload: group.id });
                    }}
                    style={{ marginRight: 6 }}
                  />
                  <div style={{ ...styles.groupIcon, background: group.iconColor }}>{group.icon}</div>
                  <span style={styles.groupName}>{group.name}</span>
                </div>
                {!group.collapsed && (
                  <div style={styles.apiList}>
                    {group.endpoints.map(ep => {
                      const mc = methodColors[ep.method] || methodColors.GET;
                      const selected = exportConfig.selectedEndpoints.includes(ep.id);
                      return (
                        <div
                          key={ep.id}
                          style={styles.apiItem}
                          onClick={() => dispatch({ type: 'TOGGLE_EXPORT_ENDPOINT', payload: { endpointId: ep.id, groupId: group.id } })}
                        >
                          <input type="checkbox" checked={selected} onChange={() => {}} style={{ marginRight: 6 }} />
                          <span style={{ ...styles.methodBadge, background: mc.bg, color: mc.text }}>{ep.method}</span>
                          <span style={styles.apiName}>{ep.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A8A', marginBottom: 4 }}>导出配置</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            已选 {selectedCount} 个接口，来自 {exportConfig.selectedGroups.length} 个分组
          </div>
        </div>

        {/* Format Selection */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>导出格式</div>
          <div style={styles.formatGrid}>
            {formats.map(f => {
              const selected = exportConfig.formats.includes(f.key);
              return (
                <div
                  key={f.key}
                  style={{
                    ...styles.formatCard,
                    borderColor: selected ? '#1E40AF' : '#DBEAFE',
                    background: selected ? '#DBEAFE' : '#FFFFFF',
                  }}
                  onClick={() => dispatch({ type: 'TOGGLE_FORMAT', payload: f.key })}
                >
                  <div style={{ ...styles.formatIcon, background: f.bg }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A8A' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Options */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>包含内容</div>
          {[
            { key: 'includeParams' as const, label: '请求参数说明' },
            { key: 'includeResponse' as const, label: '响应示例' },
            { key: 'includeErrors' as const, label: '错误码说明' },
            { key: 'includeChangelog' as const, label: '接口变更记录' },
          ].map(item => (
            <div key={item.key} style={styles.toggleRow}>
              <span style={{ fontSize: 13, color: '#1E3A8A' }}>{item.label}</span>
              <div
                style={{
                  ...styles.toggle,
                  background: exportConfig[item.key] ? '#1E40AF' : '#DBEAFE',
                }}
                onClick={() => dispatch({ type: 'TOGGLE_EXPORT_OPTION', payload: item.key })}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: exportConfig[item.key] ? 'translateX(16px)' : 'translateX(0)',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Merge Card */}
        <div
          style={{
            ...styles.mergeCard,
            borderColor: exportConfig.mergeDoc ? '#1E40AF' : '#DBEAFE',
            background: exportConfig.mergeDoc ? '#DBEAFE' : '#FFFFFF',
          }}
          onClick={() => dispatch({ type: 'TOGGLE_EXPORT_OPTION', payload: 'mergeDoc' })}
        >
          <div style={{ width: 40, height: 40, background: '#1E40AF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'white' }}>⊕</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1E40AF' }}>合并为单一文档</div>
            <div style={{ fontSize: 11, color: '#1E40AF', opacity: 0.8 }}>所有分组汇总输出为一个完整文档</div>
          </div>
          <div
            style={{
              ...styles.toggle,
              background: exportConfig.mergeDoc ? '#1E40AF' : '#DBEAFE',
            }}
          >
            <div style={{
              ...styles.toggleKnob,
              transform: exportConfig.mergeDoc ? 'translateX(16px)' : 'translateX(0)',
            }} />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontSize: 12, color: '#64748B' }}>已选 {selectedCount} / {totalEndpoints} 个接口</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={styles.footerBtn} onClick={handlePreview}>预览</button>
            <button style={{ ...styles.footerBtn, background: '#1E40AF', color: 'white', borderColor: '#1E40AF' }} onClick={handleExport}>导出文档</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flex: 1,
    height: '100%',
    background: '#F8FAFC',
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#FFFFFF',
    borderRight: '1px solid #DBEAFE',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: 16,
    borderBottom: '1px solid #DBEAFE',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1E3A8A',
    marginBottom: 4,
  },
  sidebarSub: {
    fontSize: 12,
    color: '#64748B',
  },
  sidebarActions: {
    display: 'flex',
    gap: 6,
    padding: 8,
    borderBottom: '1px solid #DBEAFE',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 24,
    borderRadius: 4,
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    background: '#DBEAFE',
    color: '#1E40AF',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 24,
    borderRadius: 4,
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    background: 'transparent',
    color: '#64748B',
    fontFamily: 'inherit',
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 4,
  },
  group: { marginBottom: 2 },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
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
  },
  apiList: {
    paddingLeft: 30,
  },
  apiItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 4,
    cursor: 'pointer',
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
  main: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #DBEAFE',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#64748B',
    marginBottom: 12,
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  formatCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    border: '1px solid #DBEAFE',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formatIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
    flexShrink: 0,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #DBEAFE',
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute' as const,
    width: 16,
    height: 16,
    background: 'white',
    borderRadius: '50%',
    top: 2,
    left: 2,
    transition: 'transform 0.2s',
  },
  mergeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    border: '1px solid #DBEAFE',
    cursor: 'pointer',
    background: '#FFFFFF',
    marginBottom: 16,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTop: '1px solid #DBEAFE',
    background: '#FFFFFF',
    marginTop: 'auto',
  },
  footerBtn: {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    border: '1px solid #DBEAFE',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    background: '#E9EEF6',
    color: '#1E3A8A',
    fontFamily: 'inherit',
  },
};
