import React, { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  value: string;      // HTML 内容
  onChange: (html: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

// ── 工具栏按钮定义 ──

interface ToolBtn {
  icon: string;
  title: string;
  command?: string;
  value?: string;
  tag?: string;        // 用于判断当前是否激活
  action?: () => void;  // 自定义操作
}

export default function WysiwygEditor({ value, onChange, placeholder, style }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(4);

  // ── 初始化 / 同步外部 HTML ──

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // 仅当内容不同且编辑器未聚焦时更新，避免打断用户输入
    if (el.innerHTML !== value && document.activeElement !== el) {
      el.innerHTML = value;
    }
  }, [value]);

  // ── 内容变更回调 ──

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  // ── execCommand 封装 ──

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  // ── 插入表格 ──

  const insertTable = () => {
    const rows = Math.max(1, Math.min(10, tableRows));
    const cols = Math.max(1, Math.min(8, tableCols));
    let html = '<table>';
    // 表头
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) html += '<th>表头</th>';
    html += '</tr></thead>';
    // 表体
    html += '<tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p>&nbsp;</p>';

    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    setShowTableDialog(false);
    handleInput();
  };

  // ── 插入代码块 ──

  const insertCodeBlock = () => {
    const html = '<pre><code>// 在此编写代码示例</code></pre><p>&nbsp;</p>';
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    handleInput();
  };

  // ── 工具栏按钮 ──

  const toolGroups: ToolBtn[][] = [
    [
      { icon: 'H1', title: '一级标题 (Ctrl+1)', command: 'formatBlock', value: 'h1', tag: 'H1' },
      { icon: 'H2', title: '二级标题 (Ctrl+2)', command: 'formatBlock', value: 'h2', tag: 'H2' },
      { icon: 'H3', title: '三级标题 (Ctrl+3)', command: 'formatBlock', value: 'h3', tag: 'H3' },
    ],
    [
      { icon: 'B', title: '加粗 (Ctrl+B)', command: 'bold', tag: 'B' },
      { icon: 'I', title: '斜体 (Ctrl+I)', command: 'italic', tag: 'I' },
      { icon: 'U', title: '下划线 (Ctrl+U)', command: 'underline', tag: 'U' },
    ],
    [
      { icon: '• ≡', title: '无序列表', command: 'insertUnorderedList', tag: 'UL' },
      { icon: '1.', title: '有序列表', command: 'insertOrderedList', tag: 'OL' },
    ],
    [
      { icon: '</>', title: '插入代码块', action: insertCodeBlock },
      { icon: '⊞', title: '插入表格', action: () => setShowTableDialog(true) },
      { icon: '—', title: '分隔线', command: 'insertHorizontalRule' },
    ],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, ...style }}>
      {/* 工具栏 */}
      <div style={toolbarStyle}>
        {toolGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span style={toolbarDivider} />}
            {group.map(btn => (
              <button
                key={btn.title}
                style={toolbarBtn}
                title={btn.title}
                onMouseDown={e => {
                  e.preventDefault();
                  if (btn.action) {
                    btn.action();
                  } else if (btn.command) {
                    exec(btn.command, btn.value);
                  }
                }}
              >
                {btn.icon}
              </button>
            ))}
          </React.Fragment>
        ))}
        <span style={{ flex: 1 }} />
      </div>

      {/* 编辑器 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={e => {
          // Tab 插入缩进而非切换焦点
          if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&emsp;');
            handleInput();
          }
        }}
        style={editorContentStyle}
        data-placeholder={placeholder}
      />

      {/* 表格插入对话框 */}
      {showTableDialog && (
        <>
          <div style={overlayStyle} onClick={() => setShowTableDialog(false)} />
          <div style={dialogStyle}>
            <div style={dialogTitle}>插入表格</div>
            <div style={dialogBody}>
              <label style={dialogLabel}>
                行数：
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableRows}
                  onChange={e => setTableRows(Number(e.target.value))}
                  style={dialogInput}
                />
              </label>
              <label style={dialogLabel}>
                列数：
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={tableCols}
                  onChange={e => setTableCols(Number(e.target.value))}
                  style={dialogInput}
                />
              </label>
            </div>
            <div style={dialogFooter}>
              <button style={dialogCancelBtn} onClick={() => setShowTableDialog(false)}>取消</button>
              <button style={dialogConfirmBtn} onClick={insertTable}>插入</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 样式 ──

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '6px 10px',
  background: '#F8FAFC',
  border: '1px solid #DBEAFE',
  borderBottom: 'none',
  borderRadius: '8px 8px 0 0',
  flexWrap: 'wrap',
  flexShrink: 0,
};

const toolbarDivider: React.CSSProperties = {
  width: 1,
  height: 20,
  background: '#DBEAFE',
  margin: '0 6px',
};

const toolbarBtn: React.CSSProperties = {
  width: 32,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: '#475569',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.1s',
};

const editorContentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 200,
  border: '1px solid #DBEAFE',
  borderRadius: '0 0 8px 8px',
  padding: '16px 20px',
  fontSize: 14,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  color: '#1E3A8A',
  background: '#FFFFFF',
  outline: 'none',
  lineHeight: 1.8,
  overflowY: 'auto',
  wordBreak: 'break-word',
};

// Placeholder via data attribute
const placeholderCss = `
  [data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: #94A3B8;
    font-style: italic;
    pointer-events: none;
  }
`;

// Inject the placeholder style once
if (typeof document !== 'undefined' && !(document as any).__wysiwygStyle) {
  const styleEl = document.createElement('style');
  styleEl.textContent = placeholderCss;
  document.head.appendChild(styleEl);
  (document as any).__wysiwygStyle = true;
}

// ── 对话框样式 ──

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 999,
};

const dialogStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
  zIndex: 1000,
  minWidth: 280,
  border: '1px solid #DBEAFE',
};

const dialogTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1E3A8A',
  marginBottom: 16,
};

const dialogBody: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginBottom: 20,
};

const dialogLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  color: '#475569',
  fontWeight: 500,
};

const dialogInput: React.CSSProperties = {
  width: 60,
  height: 32,
  border: '1px solid #DBEAFE',
  borderRadius: 6,
  padding: '0 8px',
  fontSize: 13,
  color: '#1E3A8A',
  outline: 'none',
  fontFamily: 'inherit',
};

const dialogFooter: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const dialogCancelBtn: React.CSSProperties = {
  height: 32,
  padding: '0 16px',
  borderRadius: 6,
  border: '1px solid #DBEAFE',
  background: '#F1F5F9',
  color: '#64748B',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const dialogConfirmBtn: React.CSSProperties = {
  height: 32,
  padding: '0 16px',
  borderRadius: 6,
  border: 'none',
  background: '#1E40AF',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
