import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// ── Props ──

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

// ── 工具栏按钮定义 ──

interface ToolGroup {
  label?: string;
  buttons: ToolBtn[];
}

interface ToolBtn {
  icon: string;
  title: string;
  action: () => void;
  isActive?: () => boolean;
}

// ═════════════════════════════════════════
//  组件
// ═════════════════════════════════════════

export default function WysiwygEditor({ value, onChange, placeholder, style }: Props) {
  const lastValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder || '开始编辑...' }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== lastValueRef.current) {
        lastValueRef.current = html;
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  // 外部 value 变化时同步（仅在编辑器未聚焦时）
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml && !editor.isFocused) {
      lastValueRef.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // ── 工具栏动作 ──

  const exec = useCallback(
    (fn: () => boolean) => {
      editor?.chain().focus();
      fn();
    },
    [editor],
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('输入链接地址：', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('输入图片地址：');
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const setColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run();
    },
    [editor],
  );

  const setHighlight = useCallback(
    (color: string) => {
      editor?.chain().focus().toggleHighlight({ color }).run();
    },
    [editor],
  );

  // ── 工具栏分组 ──

  if (!editor) return null;

  const toolGroups: ToolGroup[] = [
    {
      buttons: [
        { icon: '↩', title: '撤销', action: () => editor.chain().focus().undo().run() },
        { icon: '↪', title: '重做', action: () => editor.chain().focus().redo().run() },
      ],
    },
    {
      label: '标题',
      buttons: [
        {
          icon: 'H1',
          title: '一级标题',
          action: () => exec(() => editor.chain().focus().toggleHeading({ level: 1 }).run()),
          isActive: () => editor.isActive('heading', { level: 1 }),
        },
        {
          icon: 'H2',
          title: '二级标题',
          action: () => exec(() => editor.chain().focus().toggleHeading({ level: 2 }).run()),
          isActive: () => editor.isActive('heading', { level: 2 }),
        },
        {
          icon: 'H3',
          title: '三级标题',
          action: () => exec(() => editor.chain().focus().toggleHeading({ level: 3 }).run()),
          isActive: () => editor.isActive('heading', { level: 3 }),
        },
        {
          icon: '¶',
          title: '正文',
          action: () => exec(() => editor.chain().focus().setParagraph().run()),
          isActive: () => editor.isActive('paragraph'),
        },
      ],
    },
    {
      label: '样式',
      buttons: [
        {
          icon: 'B',
          title: '加粗 (Ctrl+B)',
          action: () => exec(() => editor.chain().focus().toggleBold().run()),
          isActive: () => editor.isActive('bold'),
        },
        {
          icon: 'I',
          title: '斜体 (Ctrl+I)',
          action: () => exec(() => editor.chain().focus().toggleItalic().run()),
          isActive: () => editor.isActive('italic'),
        },
        {
          icon: 'U',
          title: '下划线 (Ctrl+U)',
          action: () => exec(() => editor.chain().focus().toggleUnderline().run()),
          isActive: () => editor.isActive('underline'),
        },
        {
          icon: 'S',
          title: '删除线',
          action: () => exec(() => editor.chain().focus().toggleStrike().run()),
          isActive: () => editor.isActive('strike'),
        },
        {
          icon: 'A',
          title: '文字颜色',
          action: () => {
            const c = window.prompt('输入颜色值 (如 #1E40AF, red, rgb(30,64,175))：', '#1E40AF');
            if (c) setColor(c);
          },
        },
        {
          icon: '⌨',
          title: '高亮',
          action: () => {
            const c = window.prompt('输入高亮颜色 (如 #FEF08A, yellow)：', '#FEF08A');
            if (c) setHighlight(c);
          },
        },
        {
          icon: '▤',
          title: '清除格式',
          action: () => exec(() => editor.chain().focus().clearNodes().unsetAllMarks().run()),
        },
      ],
    },
    {
      label: '对齐',
      buttons: [
        {
          icon: '≡←',
          title: '左对齐',
          action: () => exec(() => editor.chain().focus().setTextAlign('left').run()),
          isActive: () => editor.isActive({ textAlign: 'left' }),
        },
        {
          icon: '≡↔',
          title: '居中',
          action: () => exec(() => editor.chain().focus().setTextAlign('center').run()),
          isActive: () => editor.isActive({ textAlign: 'center' }),
        },
        {
          icon: '≡→',
          title: '右对齐',
          action: () => exec(() => editor.chain().focus().setTextAlign('right').run()),
          isActive: () => editor.isActive({ textAlign: 'right' }),
        },
      ],
    },
    {
      label: '列表',
      buttons: [
        {
          icon: '•',
          title: '无序列表',
          action: () => exec(() => editor.chain().focus().toggleBulletList().run()),
          isActive: () => editor.isActive('bulletList'),
        },
        {
          icon: '1.',
          title: '有序列表',
          action: () => exec(() => editor.chain().focus().toggleOrderedList().run()),
          isActive: () => editor.isActive('orderedList'),
        },
      ],
    },
    {
      label: '插入',
      buttons: [
        {
          icon: '❝',
          title: '引用块',
          action: () => exec(() => editor.chain().focus().toggleBlockquote().run()),
          isActive: () => editor.isActive('blockquote'),
        },
        {
          icon: '</>',
          title: '代码块 (Ctrl+Alt+C)',
          action: () => exec(() => editor.chain().focus().toggleCodeBlock().run()),
          isActive: () => editor.isActive('codeBlock'),
        },
        {
          icon: '⊞',
          title: '插入表格 (3×3)',
          action: () =>
            exec(() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
            ),
        },
        {
          icon: '┼',
          title: '分隔线',
          action: () => exec(() => editor.chain().focus().setHorizontalRule().run()),
        },
        {
          icon: '🔗',
          title: '插入链接',
          action: addLink,
        },
        {
          icon: '🖼',
          title: '插入图片',
          action: addImage,
        },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...style }}>
      {/* 工具栏 */}
      <div style={toolbarStyle}>
        {toolGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span style={toolbarDivider} />}
            {group.label && <span style={groupLabel}>{group.label}</span>}
            {group.buttons.map(btn => (
              <button
                key={btn.title}
                style={{
                  ...toolbarBtn,
                  background: btn.isActive?.() ? '#DBEAFE' : 'transparent',
                  color: btn.isActive?.() ? '#1E40AF' : '#475569',
                }}
                title={btn.title}
                onMouseDown={e => {
                  e.preventDefault();
                  btn.action();
                }}
                type="button"
              >
                {btn.icon}
              </button>
            ))}
          </React.Fragment>
        ))}
        <span style={{ flex: 1 }} />
      </div>

      {/* 编辑器 */}
      <EditorContent editor={editor} style={editorWrapperStyle} />
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

const groupLabel: React.CSSProperties = {
  fontSize: 9,
  color: '#94A3B8',
  fontWeight: 500,
  textTransform: 'uppercase',
  marginRight: 2,
  letterSpacing: 0.5,
};

const toolbarBtn: React.CSSProperties = {
  width: 32,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s, color 0.15s',
};

const editorWrapperStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
};

// ── 注入编辑器全局样式 ──

const editorStyles = `
  /* TipTap 编辑器容器 */
  .tiptap-editor {
    flex: 1;
    min-height: 200px;
    border: 1px solid #DBEAFE;
    border-radius: 0 0 8px 8px;
    padding: 16px 20px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    color: #1E3A8A;
    background: #FFFFFF;
    outline: none;
    line-height: 1.8;
    overflow-y: auto;
    word-break: break-word;
  }

  /* Placeholder */
  .tiptap-editor p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #94A3B8;
    font-style: italic;
    pointer-events: none;
    height: 0;
  }

  /* 标题 */
  .tiptap-editor h1 { font-size: 22px; font-weight: 700; color: #1E40AF; margin: 20px 0 10px; padding-bottom: 8px; border-bottom: 2px solid #DBEAFE; }
  .tiptap-editor h2 { font-size: 18px; font-weight: 600; color: #1E40AF; margin: 18px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #DBEAFE; }
  .tiptap-editor h3 { font-size: 15px; font-weight: 600; color: #3B82F6; margin: 14px 0 6px; }

  /* 段落 */
  .tiptap-editor p { margin: 6px 0; }

  /* 加粗 */
  .tiptap-editor strong { color: #1E40AF; }

  /* 代码块 */
  .tiptap-editor pre {
    background: #F1F5F9;
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid #DBEAFE;
    overflow-x: auto;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    margin: 12px 0;
  }
  .tiptap-editor pre code {
    background: none;
    padding: 0;
    font-size: 13px;
    color: #1E3A8A;
    line-height: 1.7;
  }

  /* 行内代码 */
  .tiptap-editor code {
    background: #EFF6FF;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    color: #1E40AF;
  }

  /* 引用 */
  .tiptap-editor blockquote {
    border-left: 3px solid #BFDBFE;
    padding-left: 12px;
    margin: 12px 0;
    color: #64748B;
    font-style: italic;
  }

  /* 分隔线 */
  .tiptap-editor hr {
    border: none;
    border-top: 1px solid #DBEAFE;
    margin: 16px 0;
  }

  /* 表格 */
  .tiptap-editor table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    border: 1px solid #DBEAFE;
  }
  .tiptap-editor th {
    background: #EFF6FF;
    padding: 8px 12px;
    border: 1px solid #BFDBFE;
    font-size: 13px;
    font-weight: 600;
    color: #1E40AF;
    text-align: left;
  }
  .tiptap-editor td {
    padding: 8px 12px;
    border: 1px solid #DBEAFE;
    font-size: 13px;
    color: #334155;
  }
  .tiptap-editor tr:nth-child(even) td {
    background: #F8FAFC;
  }

  /* 链接 */
  .tiptap-editor a {
    color: #3B82F6;
    text-decoration: underline;
    cursor: pointer;
  }

  /* 图片 */
  .tiptap-editor img {
    max-width: 100%;
    border-radius: 6px;
    margin: 8px 0;
  }

  /* 列表 */
  .tiptap-editor ul, .tiptap-editor ol {
    padding-left: 24px;
    margin: 8px 0;
  }
  .tiptap-editor li {
    margin: 4px 0;
  }

  /* 选中文本样式 */
  .tiptap-editor ::selection {
    background: #DBEAFE;
  }

  /* 表格选中 */
  .tiptap-editor .selectedCell {
    background: #DBEAFE !important;
  }

  /* ProseMirror 隐藏元素 */
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #94A3B8;
    font-style: italic;
    pointer-events: none;
    height: 0;
  }
  .ProseMirror:focus {
    outline: none;
  }
`;

if (typeof document !== 'undefined' && !(document as any).__tiptapStyle) {
  const styleEl = document.createElement('style');
  styleEl.textContent = editorStyles;
  document.head.appendChild(styleEl);
  (document as any).__tiptapStyle = true;
}
