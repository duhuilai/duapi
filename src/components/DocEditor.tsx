import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";

export function DocEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imgUrl, setImgUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "在此编辑接口文档内容…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return <div style={{ padding: 20 }}>加载编辑器…</div>;
  }

  const btn = (active: boolean, label: string, fn: () => void, title?: string) => (
    <button
      className={active ? "active" : ""}
      title={title || label}
      onMouseDown={(e) => {
        e.preventDefault();
        fn();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="doc-editor-wrap">
      <div className="editor-toolbar">
        {btn(editor.isActive("bold"), "B", () => editor.chain().focus().toggleBold().run(), "加粗")}
        {btn(editor.isActive("italic"), "I", () => editor.chain().focus().toggleItalic().run(), "斜体")}
        {btn(editor.isActive("underline"), "U", () => editor.chain().focus().toggleUnderline().run(), "下划线")}
        <span className="sep" />
        {btn(editor.isActive("heading", { level: 1 }), "H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {btn(editor.isActive("heading", { level: 2 }), "H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn(editor.isActive("heading", { level: 3 }), "H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        <span className="sep" />
        {btn(editor.isActive("bulletList"), "• 列表", () => editor.chain().focus().toggleBulletList().run())}
        {btn(editor.isActive("orderedList"), "1. 列表", () => editor.chain().focus().toggleOrderedList().run())}
        {btn(editor.isActive("codeBlock"), "代码", () => editor.chain().focus().toggleCodeBlock().run())}
        <span className="sep" />
        {btn(editor.isActive("table"), "表格", () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        )}
        {btn(editor.isActive({ textAlign: "left" }), "左对齐", () => editor.chain().focus().setTextAlign("left").run(), "左对齐")}
        {btn(editor.isActive({ textAlign: "center" }), "居中", () => editor.chain().focus().setTextAlign("center").run(), "居中")}
        {btn(editor.isActive({ textAlign: "right" }), "右对齐", () => editor.chain().focus().setTextAlign("right").run(), "右对齐")}
        <span className="sep" />
        {linkUrl ? (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <input
              className="input"
              style={{ width: 200, height: 28 }}
              placeholder="输入链接地址"
              value={linkUrl}
              autoFocus
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <button
              className="btn sm primary"
              onMouseDown={(e) => {
                e.preventDefault();
                if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
                setLinkUrl("");
              }}
            >
              确定
            </button>
          </span>
        ) : (
          btn(editor.isActive("link"), "链接", () => setLinkUrl("https://"), "插入链接")
        )}
        {imgUrl ? (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <input
              className="input"
              style={{ width: 200, height: 28 }}
              placeholder="输入图片地址"
              value={imgUrl}
              autoFocus
              onChange={(e) => setImgUrl(e.target.value)}
            />
            <button
              className="btn sm primary"
              onMouseDown={(e) => {
                e.preventDefault();
                if (imgUrl) editor.chain().focus().setImage({ src: imgUrl }).run();
                setImgUrl("");
              }}
            >
              确定
            </button>
          </span>
        ) : (
          btn(false, "图片", () => setImgUrl("https://"), "插入图片")
        )}
      </div>
      <div className="ProseMirror-wrap">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
