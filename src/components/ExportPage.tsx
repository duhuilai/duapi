import React, { useState, useMemo } from 'react';
import { useApi } from '../store/ApiContext';
import type { ExportFormat, ApiEndpoint, ApiGroup, ResponseParam } from '../types';

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#DCFCE7', text: '#16A34A' },
  POST: { bg: '#DBEAFE', text: '#1E40AF' },
  PUT: { bg: '#FEF3C7', text: '#D97706' },
  DELETE: { bg: '#FEE2E2', text: '#DC2626' },
  PATCH: { bg: '#F3E8FF', text: '#7C3AED' },
};

const formats: { key: ExportFormat; icon: string; name: string }[] = [
  { key: 'md', icon: 'MD', name: 'Markdown' },
  { key: 'html', icon: 'H', name: 'HTML' },
  { key: 'pdf', icon: 'P', name: 'PDF' },
  { key: 'doc', icon: 'D', name: 'Word' },
];

// ---- Markdown 生成器 ----

function generateMarkdown(
  groups: ApiGroup[],
  selectedEndpoints: string[],
  opts: { includeParams: boolean; includeResponse: boolean; includeSchema: boolean },
): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString('zh-CN');

  lines.push('# API 接口文档');
  lines.push('');
  lines.push(`> 生成时间: ${now} | 共 ${selectedEndpoints.length} 个接口`);
  lines.push('');

  const selectedGroups = groups.filter(g =>
    g.endpoints.some(e => selectedEndpoints.includes(e.id))
  );

  for (const group of selectedGroups) {
    const eps = group.endpoints.filter(e => selectedEndpoints.includes(e.id));
    if (eps.length === 0) continue;

    lines.push(`## ${escapeMd(group.name)}`);
    lines.push('');

    for (const ep of eps) {
      lines.push(`### ${escapeMd(ep.name)}`);
      lines.push('');
      lines.push(`\`${ep.method}\`  ${escapeMd(ep.url)}`);
      lines.push('');

      if (ep.description) {
        lines.push(escapeMd(ep.description));
        lines.push('');
      }

      // 请求参数
      if (opts.includeParams && ep.params.length > 0) {
        lines.push('**请求参数**');
        lines.push('');
        lines.push('| 参数名 | 参数值 | 必填 | 描述 |');
        lines.push('|--------|--------|------|------|');
        for (const p of ep.params) {
          lines.push(`| ${escapeMd(p.name)} | ${escapeMd(p.value)} | ${p.enabled ? '是' : '否'} | ${escapeMd(p.description)} |`);
        }
        lines.push('');
      }

      // 请求头
      if (ep.headers.length > 0) {
        lines.push('**请求头**');
        lines.push('');
        lines.push('| 键 | 值 | 描述 |');
        lines.push('|----|-----|------|');
        for (const h of ep.headers) {
          lines.push(`| ${escapeMd(h.key)} | ${escapeMd(h.value)} | ${escapeMd(h.description)} |`);
        }
        lines.push('');
      }

      // 请求示例
      if (opts.includeResponse && ep.body && ep.bodyType !== 'none') {
        lines.push('**请求示例**');
        lines.push('');
        const lang = ep.bodyType === 'json' ? 'json' : '';
        lines.push('```' + lang);
        lines.push(ep.body);
        lines.push('```');
        lines.push('');
      }

      // 响应参数 Schema
      if (opts.includeSchema && ep.responseParams && ep.responseParams.length > 0) {
        lines.push('**响应参数说明**');
        lines.push('');
        lines.push('| 字段路径 | 类型 | 必填 | 说明 |');
        lines.push('|----------|------|------|------|');
        renderSchemaRows(ep.responseParams, lines, '');
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function renderSchemaRows(params: ResponseParam[], lines: string[], indent: string) {
  for (const p of params) {
    const displayPath = indent + p.path.split('.').pop()!;
    lines.push(`| ${displayPath} | ${p.type} | ${p.required ? '是' : '否'} | ${escapeMd(p.description)} |`);
    if (p.children) {
      renderSchemaRows(p.children, lines, indent + '  ');
    }
  }
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\*/g, '\\*');
}

// ---- Markdown → HTML 转换 ----

function mdToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let inCodeBlock = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      if (!inTable) {
        html += '<table>\n';
        inTable = true;
      }
      const cells = line.split('|').filter(c => c.trim() !== '' || line.endsWith('|'));
      const isHeader = i + 1 < lines.length && lines[i + 1].startsWith('|') && lines[i + 1].includes('---');
      const tag = isHeader ? 'th' : 'td';
      html += '<tr>';
      for (const cell of cells) {
        html += `<${tag}>${inlineMdToHtml(cell.trim())}</${tag}>`;
      }
      html += '</tr>\n';
      if (isHeader) {
        i++; // skip separator row
      }
      continue;
    } else {
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
    }

    // Headings
    if (line.startsWith('### ')) {
      html += `<h3>${inlineMdToHtml(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inlineMdToHtml(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('# ')) {
      html += `<h1>${inlineMdToHtml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${inlineMdToHtml(line.slice(2))}</blockquote>\n`;
    } else if (line.startsWith('---')) {
      html += '<hr>\n';
    } else if (line.trim() === '') {
      html += '\n';
    } else {
      html += `<p>${inlineMdToHtml(line)}</p>\n`;
    }
  }

  if (inTable) html += '</table>\n';
  if (inCodeBlock && codeContent) {
    html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
  }

  return html;
}

function inlineMdToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapFullHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 960px; margin: 0 auto; padding: 40px 20px; color: #1E3A8A; background: #F8FAFC; line-height: 1.7; }
  h1 { color: #1E40AF; border-bottom: 2px solid #DBEAFE; padding-bottom: 12px; }
  h2 { color: #1E40AF; margin-top: 32px; border-bottom: 1px solid #DBEAFE; padding-bottom: 6px; }
  h3 { color: #3B82F6; margin-top: 24px; }
  blockquote { border-left: 3px solid #DBEAFE; padding-left: 12px; color: #64748B; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th { text-align: left; padding: 6px 8px; background: #F1F5F9; font-size: 13px; color: #64748B; border: 1px solid #DBEAFE; }
  td { padding: 6px 8px; border: 1px solid #DBEAFE; font-size: 13px; }
  pre { background: #F1F5F9; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; border: 1px solid #DBEAFE; }
  code { background: #F1F5F9; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #DBEAFE; margin: 16px 0; }
  strong { color: #1E40AF; }
  p { margin: 6px 0; }
</style>
</head><body>
${body}
</body></html>`;
}

// ---- ExportPage 组件 ----

export default function ExportPage() {
  const { state, dispatch } = useApi();
  const { groups, exportConfig } = state;

  const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);
  const selectedCount = exportConfig.selectedEndpoints.length;

  // 编辑器本地缓存（每次生成时重置）
  const [localContent, setLocalContent] = useState(state.exportContent);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('html');
  const [includeSchema, setIncludeSchema] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // 生成文档
  const handleGenerate = () => {
    if (selectedCount === 0) {
      showToast('请先选择需要导出的接口');
      return;
    }
    const md = generateMarkdown(groups, exportConfig.selectedEndpoints, {
      includeParams: exportConfig.includeParams,
      includeResponse: exportConfig.includeResponse,
      includeSchema,
    });
    setLocalContent(md);
    dispatch({ type: 'SET_EXPORT_CONTENT', payload: md });
    showToast('文档已生成，可编辑后导出');
  };

  // 编辑器内容变更
  const handleEditorChange = (val: string) => {
    setLocalContent(val);
  };

  // 保存到 store
  const handleSave = () => {
    dispatch({ type: 'SET_EXPORT_CONTENT', payload: localContent });
    showToast('文档内容已保存');
  };

  // 导出文档
  const handleExport = () => {
    if (!localContent.trim()) {
      showToast('请先生成或编辑文档内容');
      return;
    }

    const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (activeFormat === 'md') {
      downloadFile(`api-doc-${now}.md`, localContent, 'text/markdown');
      showToast('Markdown 文档已下载');
    } else if (activeFormat === 'html') {
      const body = mdToHtml(localContent);
      const full = wrapFullHtml(body, 'API 接口文档');
      downloadFile(`api-doc-${now}.html`, full, 'text/html');
      showToast('HTML 文档已下载');
    } else if (activeFormat === 'pdf') {
      const body = mdToHtml(localContent);
      const full = wrapFullHtml(body, 'API 接口文档');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(full);
        w.document.close();
        setTimeout(() => w.print(), 500);
      } else {
        showToast('弹窗被拦截，请允许弹窗后重试');
      }
    } else if (activeFormat === 'doc') {
      const body = mdToHtml(localContent);
      const docHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; line-height: 1.7; }
  h1 { color: #1E40AF; border-bottom: 2px solid #DBEAFE; padding-bottom: 12px; }
  h2 { color: #1E40AF; margin-top: 24px; border-bottom: 1px solid #DBEAFE; padding-bottom: 6px; }
  h3 { color: #3B82F6; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
  th { background: #EFF6FF; border: 1px solid #BFDBFE; padding: 4px 6px; }
  td { border: 1px solid #DBEAFE; padding: 4px 6px; }
  pre { background: #F1F5F9; padding: 8px; border: 1px solid #DBEAFE; }
  code { font-size: 11px; }
  hr { border: none; border-top: 1px solid #DBEAFE; }
</style>
</head><body>
${body}
</body></html>`;
      downloadFile(`api-doc-${now}.doc`, docHtml, 'application/msword');
      showToast('Word 文档已下载');
    }
  };

  return (
    <div style={styles.page}>
      {/* ── 左侧：接口选择 ── */}
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

      {/* ── 右侧：配置 + 编辑 + 导出 ── */}
      <main style={styles.main}>
        {/* 顶栏：格式选择 + 内容选项 + 生成按钮 */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarRow}>
            <div style={styles.toolbarLeft}>
              <span style={styles.toolbarLabel}>导出格式：</span>
              <div style={styles.formatTabs}>
                {formats.map(f => (
                  <button
                    key={f.key}
                    style={{
                      ...styles.formatTab,
                      background: activeFormat === f.key ? '#1E40AF' : '#F1F5F9',
                      color: activeFormat === f.key ? '#fff' : '#64748B',
                      borderColor: activeFormat === f.key ? '#1E40AF' : '#DBEAFE',
                    }}
                    onClick={() => setActiveFormat(f.key)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.toolbarRight}>
              {/* 快速选项 */}
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={exportConfig.includeParams}
                  onChange={() => dispatch({ type: 'TOGGLE_EXPORT_OPTION', payload: 'includeParams' })}
                /> 请求参数
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={exportConfig.includeResponse}
                  onChange={() => dispatch({ type: 'TOGGLE_EXPORT_OPTION', payload: 'includeResponse' })}
                /> 请求示例
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={includeSchema}
                  onChange={() => setIncludeSchema(!includeSchema)}
                /> Schema
              </label>

              <button style={styles.generateBtn} onClick={handleGenerate}>
                📄 生成文档
              </button>
            </div>
          </div>
        </div>

        {/* 编辑器区域 */}
        <div style={styles.editorArea}>
          <div style={styles.editorHeader}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              已选 {selectedCount}/{totalEndpoints} 个接口 — 可直接编辑下方 Markdown 内容
            </span>
          </div>
          <textarea
            style={styles.editor}
            value={localContent}
            onChange={e => handleEditorChange(e.target.value)}
            placeholder={'点击"生成文档"按钮，从所选接口自动生成 Markdown 格式的 API 文档。\n\n生成后可直接在此编辑文档内容，编辑完成后点击"保存"保存内容，或点击"导出"下载为指定格式文件。'}
            spellCheck={false}
          />
        </div>

        {/* 底部操作栏 */}
        <div style={styles.footer}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            {localContent ? `${localContent.length} 字符` : '尚未生成文档'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={styles.footerBtn} onClick={handleSave} disabled={!localContent}>
              💾 保存
            </button>
            <button
              style={{ ...styles.footerBtn, background: '#1E40AF', color: 'white', borderColor: '#1E40AF' }}
              onClick={handleExport}
              disabled={!localContent}
            >
              📥 导出 {activeFormat.toUpperCase()}
            </button>
          </div>
        </div>
      </main>

      {/* Toast 提示 */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </div>
  );
}

// ── 工具函数 ──

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob(['\uFEFF' + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 样式 ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flex: 1,
    height: '100%',
    background: '#F8FAFC',
    position: 'relative',
  },

  // Sidebar
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
  apiList: { paddingLeft: 30 },
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

  // Main
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  // Toolbar
  toolbar: {
    background: '#FFFFFF',
    borderBottom: '1px solid #DBEAFE',
    padding: '10px 16px',
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  toolbarLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 500,
    flexShrink: 0,
  },
  formatTabs: {
    display: 'flex',
    gap: 4,
  },
  formatTab: {
    padding: '4px 12px',
    borderRadius: 5,
    border: '1px solid #DBEAFE',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#1E3A8A',
    cursor: 'pointer',
    userSelect: 'none',
  },
  generateBtn: {
    padding: '5px 14px',
    borderRadius: 6,
    border: 'none',
    background: '#EFF6FF',
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // Editor
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: '0 16px',
  },
  editorHeader: {
    padding: '8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editor: {
    flex: 1,
    width: '100%',
    border: '1px solid #DBEAFE',
    borderRadius: 8,
    padding: 16,
    fontSize: 13,
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    color: '#1E3A8A',
    background: '#FFFFFF',
    resize: 'none' as const,
    outline: 'none',
    lineHeight: 1.7,
    minHeight: 0,
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTop: '1px solid #DBEAFE',
    background: '#FFFFFF',
    marginTop: 4,
  },
  footerBtn: {
    height: 36,
    padding: '0 20px',
    borderRadius: 8,
    border: '1px solid #DBEAFE',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    background: '#E9EEF6',
    color: '#1E3A8A',
    fontFamily: 'inherit',
  },

  // Toast
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1E3A8A',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.3)',
    animation: 'fadeIn 0.2s ease',
  },
};
