import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/AppContext";
import type { DocItem, Folder, ApiItem } from "../types";
import { DocEditor } from "./DocEditor";
import { Modal, ConfirmDialog, PromptModal } from "./ui";
import { exportAsHtml, exportAsWord, exportAsMarkdown } from "../lib/docExport";

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconFileText({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function DocManager({
  selectedDocId,
  onSelectDoc,
  onCloseDoc,
  generateSignal = 0,
}: {
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onCloseDoc?: () => void;
  generateSignal?: number;
}) {
  const { data, addDoc, saveDoc, renameDoc, removeDoc, notify } = useStore();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [rename, setRename] = useState<null | DocItem>(null);
  const [del, setDel] = useState<null | DocItem>(null);
  const [editMode, setEditMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const doc = data.docs.find((d) => d.id === selectedDocId) || null;

  useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setTitle(doc.title);
      setEditMode(false);
    }
  }, [selectedDocId]);

  useEffect(() => {
    if (generateSignal) setGenOpen(true);
  }, [generateSignal]);

  const folderName = (id: string) =>
    data.folders.find((f) => f.id === id)?.name ?? "未分组";

  const outline = useMemo(() => {
    if (!doc) return [];
    return doc.apiIds
      .map((id) => data.apis.find((a) => a.id === id))
      .filter((a): a is ApiItem => !!a)
      .sort((a, b) => a.order - b.order);
  }, [doc, data.apis]);

  const paramCount = useMemo(() => {
    return outline.reduce((sum, a) => sum + a.requestDocs.length + a.responseDocs.length, 0);
  }, [outline]);

  const doExport = async (format: "html" | "word" | "md") => {
    if (!doc) return;
    let ok = false;
    if (format === "html") ok = await exportAsHtml(title, content);
    else if (format === "word") ok = await exportAsWord(title, content);
    else ok = await exportAsMarkdown(title, content);
    if (ok) notify(`已导出 ${format.toUpperCase()}`, "success");
    setExportOpen(false);
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div className="doclist">
        <div className="head">
          <button className="btn primary sm" style={{ width: "100%" }} onClick={() => setGenOpen(true)}>
            <IconPlus size={13} /> 创建文档
          </button>
        </div>
        {data.docs.length === 0 && (
          <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>
            暂无文档。<br />点击「创建文档」选择分组与接口。
          </div>
        )}
          {data.docs
            .slice()
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((d) => (
              <div
                key={d.id}
                className={"item" + (selectedDocId === d.id ? " selected" : "")}
                onClick={() => onSelectDoc(d.id)}
              >
                <div className="t">{d.title}</div>
                <div className="s">
                  {folderName(d.folderId)} · {d.apiIds.length} 个接口 ·{" "}
                  {new Date(d.updatedAt).toLocaleDateString()}
                </div>
                <button
                  className="doc-item-del"
                  title="删除文档"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDel(d);
                  }}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--panel)" }}>
        {doc ? (
          <>
            <div className="doc-preview-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>duApi</span>
                  <span style={{ color: "var(--muted)" }}>·</span>
                  <span>文档预览</span>
                  <span className="badge">已生成</span>
                  <div style={{ flex: 1 }} />
                  <button className="x-btn" title="关闭文档" onClick={() => onCloseDoc?.()}>×</button>
                </div>
                <div className="meta">
                  基于 {doc.apiIds.length} 个接口自动生成 · 生成时间 {new Date(doc.createdAt).toLocaleString()} · v{data.version}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
                <button
                  className={"btn sm" + (editMode ? " primary" : "")}
                  onClick={() => setEditMode((v) => !v)}
                >
                  <IconEdit size={13} /> {editMode ? "预览模式" : "编辑模式"}
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => setDel(doc)}
                  title="删除文档"
                >
                  <IconTrash size={13} /> 删除
                </button>
                <div style={{ position: "relative" }}>
                  <button className="btn primary sm" onClick={() => setExportOpen((v) => !v)}>
                    导出 <IconChevronDown size={12} />
                  </button>
                  {exportOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0 }} onClick={() => setExportOpen(false)} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 20, minWidth: 120 }}>
                        <div className="export-item" onClick={() => doExport("html")}>HTML</div>
                        <div className="export-item" onClick={() => doExport("word")}>Word</div>
                        <div className="export-item" onClick={() => doExport("md")}>Markdown</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              {!editMode && (
                <div className="doc-outline">
                  <h4>文档大纲</h4>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{doc.title}</div>
                  <ol>
                    {outline.map((a) => (
                      <li key={a.id}>
                        <a onClick={() => {
                          const el = document.getElementById("api-" + a.id);
                          el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}>
                          <span className={"m-tag m-" + a.method.toLowerCase()} style={{ marginRight: 6 }}>
                            {a.method}
                          </span>
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ol>
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
                    共 {outline.length} 个接口 · {paramCount} 个参数
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {editMode ? (
                  <DocEditor content={content} onChange={setContent} />
                ) : (
                  <>
                    <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
                      <div
                        className="doc-preview"
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    </div>
                    <div className="doc-status-bar">
                      <span>文档编辑于 {new Date(doc.updatedAt).toLocaleString()} · 自动保存</span>
                      <span>字数 {content.replace(/<[^>]+>/g, "").length} · 阅读时间 ≈ {Math.max(1, Math.ceil(content.replace(/<[^>]+>/g, "").length / 300))} 分钟</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="main-empty">
            <IconFileText size={48} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>接口文档</div>
            <div>从左侧选择或创建一份接口文档</div>
          </div>
        )}
      </div>

      {genOpen && (
        <CreateDocModal
          onClose={() => setGenOpen(false)}
          onGenerate={async (folderId, t, apiIds) => {
            const created = await addDoc(folderId, t, apiIds);
            setGenOpen(false);
            if (created) onSelectDoc(created.id);
          }}
        />
      )}

      {rename && (
        <PromptModal
          title="重命名文档"
          label="文档标题"
          defaultValue={rename.title}
          onOk={(v) => { renameDoc(rename.id, v); setRename(null); }}
          onCancel={() => setRename(null)}
        />
      )}

      {del && (
        <ConfirmDialog
          title="确认删除"
          danger
          message={
            <>
              确定要删除文档 <b>{del.title}</b> 吗？此操作不可恢复。
            </>
          }
          onConfirm={() => { removeDoc(del.id); setDel(null); }}
          onCancel={() => setDel(null)}
        />
      )}
    </div>
  );
}

function CreateDocModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (folderId: string, title: string, apiIds: string[]) => void;
}) {
  const { data } = useStore();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rootFolders = useMemo(
    () => data.folders.filter((f) => f.parentId === null).sort((a, b) => a.order - b.order),
    [data.folders]
  );

  const apisOf = (fid: string) =>
    data.apis
      .filter((a) => a.folderId === fid)
      .sort((a, b) => a.order - b.order);

  const toggleApi = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleFolder = (fid: string) => {
    const ids = apisOf(fid).map((a) => a.id);
    const all = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((s) => {
      const n = new Set(s);
      if (all) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const selectedList = useMemo(
    () => data.apis.filter((a) => selected.has(a.id)).sort((a, b) => a.order - b.order),
    [selected, data.apis]
  );

  const primaryFolderId = selectedList[0]?.folderId ?? rootFolders[0]?.id ?? "";

  return (
    <Modal
      title="创建文档"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button
            className="btn primary"
            disabled={selected.size === 0}
            onClick={() => onGenerate(primaryFolderId, title || "接口文档", Array.from(selected))}
          >
            确定
          </button>
        </>
      }
    >
      <div className="field">
        <label>文档名称</label>
        <input
          className="input"
          placeholder="请输入文档名称"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>选择接口来源</label>
        <div className="cd-source">
          {rootFolders.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 12, padding: 8 }}>暂无分组</div>
          )}
          {rootFolders.map((f) => {
            const apis = apisOf(f.id);
            const all = apis.length > 0 && apis.every((a) => selected.has(a.id));
            const some = apis.some((a) => selected.has(a.id)) && !all;
            return (
              <div key={f.id} className="cd-group">
                <label className="cd-group-head">
                  <input
                    type="checkbox"
                    checked={all}
                    ref={(el) => { if (el) el.indeterminate = some; }}
                    onChange={() => toggleFolder(f.id)}
                  />
                  <span className="n">{f.name}</span>
                  <span className="c">{apis.length} 接口</span>
                </label>
                {apis.map((a) => (
                  <label key={a.id} className="cd-api">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleApi(a.id)}
                    />
                    <span className={"m-tag m-" + a.method.toLowerCase()}>{a.method}</span>
                    <span className="n">{a.name}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
